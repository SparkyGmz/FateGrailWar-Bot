import { ItemType, type Item } from '@prisma/client';
import { gameConfig } from '../../config/game';
import { prisma } from '../../database/prisma';
import { GameError, SummonCooldownError } from '../../shared/errors';
import { chance, weightedPick } from '../../shared/random';
import { lockUser } from '../../database/locks';
import { InventoryService } from '../inventory/inventory.service';
import { LogService } from '../logs/log.service';
import { PoolService, type ActivePool } from '../pools/pool.service';
import { UserService } from '../users/user.service';
import { canFreeSummon, nextFreeSummonAt, summonThreshold } from './summon.period';
import {
  computeWeights,
  parseCatalystEffects,
  parseRateModifiers,
  resonatingServants,
  type CatalystEffect,
  type PoolCandidate,
  type WeightedEntry,
} from './summon.weights';

type PoolServant = ActivePool['servants'][number]['servant'];

const weightOptions = {
  rarityBaseWeight: gameConfig.summon.rarityBaseWeight,
  defaultFeaturedMultiplier: gameConfig.summon.defaultFeaturedMultiplier,
  catalystMaxMultiplier: gameConfig.summon.catalystMaxMultiplier,
};

function candidatesOf(pool: ActivePool): PoolCandidate<PoolServant>[] {
  return pool.servants.map((ps) => ({ servant: ps.servant, featured: ps.featured, weightOverride: ps.weightOverride }));
}

export interface SummonStatus {
  canSummon: boolean;
  nextAt: Date;
}

export interface CatalystPreview {
  item: Item;
  resonating: PoolServant[];
  /** Probabilidades com o catalisador aplicado, apenas dos que ressoam */
  boosted: WeightedEntry<PoolServant>[];
}

export type SummonSource = 'free' | 'ticket';

export interface SummonResult {
  source: SummonSource;
  ticketsLeft: number;
  servant: PoolServant;
  noblePhantasm: { name: string; rank: string } | null;
  pool: ActivePool;
  probability: number;
  featured: boolean;
  isDuplicate: boolean;
  duplicates: number;
  spiritOriginGained: number;
  catalyst: Item | null;
  droppedItem: Item | null;
  xpGained: number;
  coinsGained: number;
  level: number;
  levelsGained: number;
}

export const SummonService = {
  status(lastFreeSummonAt: Date | null, now = new Date()): SummonStatus {
    return {
      canSummon: canFreeSummon(lastFreeSummonAt, now, gameConfig.summon),
      nextAt: nextFreeSummonAt(lastFreeSummonAt, now, gameConfig.summon),
    };
  },

  /** Tickets de invocação que o jogador possui */
  async ticketCount(userId: string): Promise<number> {
    return InventoryService.countBySlug(userId, gameConfig.items.summonTicketSlug);
  },

  async getActivePoolOrThrow(): Promise<ActivePool> {
    const pool = await PoolService.getActive();
    if (!pool || pool.servants.length === 0) {
      throw new GameError('Nenhum banner de invocação está ativo no momento. Avise um administrador.');
    }
    return pool;
  },

  /** Probabilidades do banner sem catalisador (para /banner) */
  rates(pool: ActivePool): WeightedEntry<PoolServant>[] {
    return computeWeights(candidatesOf(pool), parseRateModifiers(pool.rateModifiers), [], weightOptions);
  },

  previewCatalyst(pool: ActivePool, item: Item): CatalystPreview {
    const effects = parseCatalystEffects(item.data);
    const candidates = candidatesOf(pool);
    const resonating = resonatingServants(candidates, effects);
    const ids = new Set(resonating.map((s) => s.id));
    const boosted = computeWeights(candidates, parseRateModifiers(pool.rateModifiers), effects, weightOptions)
      .filter((e) => ids.has(e.servant.id))
      .sort((a, b) => b.probability - a.probability);
    return { item, resonating, boosted };
  },

  /**
   * Executa o summon gratuito semanal.
   *
   * Garantias de concorrência:
   *  - o "claim" do summon é um UPDATE condicional (last_free_summon_at < limite);
   *    o Postgres serializa updates na mesma linha, então dois /summon simultâneos
   *    resultam em exatamente um sucesso;
   *  - o consumo do catalisador também é um UPDATE condicional (quantity >= 1);
   *  - tudo roda numa transação: se qualquer passo falhar, nada é gravado
   *    (o summon não é gasto e o catalisador não é consumido).
   */
  async perform(
    userId: string,
    username: string,
    catalystItemId: number | null,
    source: SummonSource = 'free',
  ): Promise<SummonResult> {
    await UserService.ensure(userId, username);
    const pool = await SummonService.getActivePoolOrThrow();
    const candidates = candidatesOf(pool);

    let catalyst: Item | null = null;
    let effects: CatalystEffect[] = [];
    if (catalystItemId !== null) {
      catalyst = await InventoryService.findItem(catalystItemId);
      if (catalyst.type !== ItemType.CATALYST || !catalyst.enabled) {
        throw new GameError('Esse item não pode ser usado como catalisador.');
      }
      effects = parseCatalystEffects(catalyst.data);
      if (resonatingServants(candidates, effects).length === 0) {
        throw new GameError(
          `**${catalyst.name}** não ressoa com nenhum Servant do banner atual. Guarde-o para outro banner.`,
        );
      }
    }

    const weighted = computeWeights(candidates, parseRateModifiers(pool.rateModifiers), effects, weightOptions);
    const now = new Date();
    const threshold = summonThreshold(now, gameConfig.summon);

    const result = await prisma.$transaction(async (tx) => {
      // 1) Paga o summon: semanal gratuito (claim atômico) ou 1 ticket
      if (source === 'free') {
        const claim = await tx.user.updateMany({
          where: {
            id: userId,
            OR: [{ lastFreeSummonAt: null }, { lastFreeSummonAt: { lt: threshold } }],
          },
          data: {
            lastFreeSummonAt: now,
            totalSummons: { increment: 1 },
            coins: { increment: gameConfig.summon.coinsPerSummon },
          },
        });
        if (claim.count === 0) {
          const u = await tx.user.findUniqueOrThrow({ where: { id: userId } });
          throw new SummonCooldownError(nextFreeSummonAt(u.lastFreeSummonAt, now, gameConfig.summon));
        }
      } else {
        await lockUser(tx, userId);
        const ticket = await InventoryService.findBySlug(tx, gameConfig.items.summonTicketSlug);
        if (!ticket) throw new GameError('Tickets de invocação não estão configurados.');
        try {
          await InventoryService.consume(tx, userId, ticket.id, 1, 'summon_ticket');
        } catch {
          throw new GameError('Você não possui Tickets de Invocação.');
        }
        await tx.user.update({
          where: { id: userId },
          data: { totalSummons: { increment: 1 }, coins: { increment: gameConfig.summon.coinsPerSummon } },
        });
      }

      // 2) Consumo do catalisador
      if (catalyst) await InventoryService.consume(tx, userId, catalyst.id, 1, 'summon_catalyst');

      // 3) Sorteio
      const picked = weightedPick(weighted.map((e) => ({ item: e, weight: e.weight })));

      // 4) Registro na coleção / duplicata
      const existing = await tx.playerServant.findUnique({
        where: { userId_servantId: { userId, servantId: picked.servant.id } },
      });
      let spiritOriginGained = 0;
      let duplicates = 0;
      if (existing) {
        spiritOriginGained = gameConfig.summon.duplicateSpiritOrigin[picked.servant.rarity] ?? 0;
        const updated = await tx.playerServant.update({
          where: { id: existing.id },
          data: { duplicates: { increment: 1 } },
        });
        duplicates = updated.duplicates;
        await tx.user.update({ where: { id: userId }, data: { spiritOrigin: { increment: spiritOriginGained } } });
      } else {
        await tx.playerServant.create({ data: { userId, servantId: picked.servant.id } });
      }

      // 5) Drop de catalisador
      let droppedItem: Item | null = null;
      if (chance(gameConfig.summon.catalystDropChance)) {
        droppedItem = await InventoryService.rollRandomItem(tx, ItemType.CATALYST);
        if (droppedItem) await InventoryService.grant(tx, userId, droppedItem.id, 1, 'summon_drop');
      }

      // 6) XP
      const { level, levelsGained } = await UserService.addXp(tx, userId, gameConfig.summon.xpPerSummon);

      // 7) Histórico + log
      await tx.summonHistory.create({
        data: {
          userId,
          servantId: picked.servant.id,
          poolId: pool.id,
          catalystItemId: catalyst?.id ?? null,
          source,
          isDuplicate: !!existing,
          spiritOriginGained,
          droppedItemId: droppedItem?.id ?? null,
          probability: picked.probability,
        },
      });
      await LogService.log(tx, userId, 'SUMMON', {
        servant: picked.servant.slug,
        pool: pool.slug,
        catalyst: catalyst?.slug ?? null,
        source,
        probability: picked.probability,
        duplicate: !!existing,
      });

      return { picked, isDuplicate: !!existing, duplicates, spiritOriginGained, droppedItem, level, levelsGained };
    });

    const np = await prisma.noblePhantasm.findFirst({
      where: { servantId: result.picked.servant.id },
      select: { name: true, rank: true },
    });

    const ticketsLeft = await SummonService.ticketCount(userId);

    return {
      source,
      ticketsLeft,
      servant: result.picked.servant,
      noblePhantasm: np,
      pool,
      probability: result.picked.probability,
      featured: result.picked.featured,
      isDuplicate: result.isDuplicate,
      duplicates: result.duplicates,
      spiritOriginGained: result.spiritOriginGained,
      catalyst,
      droppedItem: result.droppedItem,
      xpGained: gameConfig.summon.xpPerSummon,
      coinsGained: gameConfig.summon.coinsPerSummon,
      level: result.level,
      levelsGained: result.levelsGained,
    };
  },
};
