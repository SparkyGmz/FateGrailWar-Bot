import { gameConfig } from '../../config/game';
import { lockUser } from '../../database/locks';
import { prisma } from '../../database/prisma';
import { GameError } from '../../shared/errors';
import { BondService, type BondGain } from '../bond/bond.service';
import { LogService } from '../logs/log.service';
import { InventoryService } from './inventory.service';

/**
 * Efeitos de itens usáveis, definidos em item.data:
 *   { "use": { "effect": "bond_xp", "amount": 300 } }
 * Novos efeitos entram como novos `case`, não como if por item.
 */
interface UseEffect {
  effect: 'bond_xp';
  amount: number;
}

function parseUse(data: unknown): UseEffect | null {
  const use = (data as { use?: unknown } | null)?.use as Partial<UseEffect> | undefined;
  if (!use || typeof use !== 'object') return null;
  if (use.effect === 'bond_xp' && typeof use.amount === 'number') return { effect: 'bond_xp', amount: use.amount };
  return null;
}

export type UseResult = { kind: 'bond'; itemName: string; bond: BondGain };

export const ItemUseService = {
  /** Diz se o item precisa de um Servant como alvo (para a UI) */
  needsServant(data: unknown): boolean {
    return parseUse(data)?.effect === 'bond_xp';
  },

  async use(userId: string, itemId: number, servantId: number | null): Promise<UseResult> {
    const item = await InventoryService.findItem(itemId);
    if (item.slug === gameConfig.items.summonTicketSlug) {
      throw new GameError('O Ticket de Invocação é usado automaticamente pelo `/summon` quando o summon gratuito já foi gasto.');
    }
    const effect = parseUse(item.data);
    if (!effect) throw new GameError(`**${item.name}** não pode ser usado diretamente.`);

    return prisma.$transaction(async (tx) => {
      await lockUser(tx, userId);
      switch (effect.effect) {
        case 'bond_xp': {
          if (servantId === null) throw new GameError('Escolha o Servant que vai receber o efeito (opção `servant`).');
          const owns = await tx.playerServant.findUnique({ where: { userId_servantId: { userId, servantId } } });
          if (!owns) throw new GameError('Você não possui esse Servant.');
          await InventoryService.consume(tx, userId, item.id, 1, 'use');
          const bond = await BondService.addBondXp(tx, userId, servantId, effect.amount, `item:${item.slug}`);
          await LogService.log(tx, userId, 'ITEM_USED', { item: item.slug, servantId });
          return { kind: 'bond' as const, itemName: item.name, bond };
        }
      }
    });
  },
};
