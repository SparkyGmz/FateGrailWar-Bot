import { ItemType, MissionStatus, type Prisma } from '@prisma/client';
import { gameConfig } from '../../config/game';
import { lockUser } from '../../database/locks';
import { prisma } from '../../database/prisma';
import { GameError, NotFoundError } from '../../shared/errors';
import { BondService, type BondGain } from '../bond/bond.service';
import { InventoryService } from '../inventory/inventory.service';
import { LogService } from '../logs/log.service';
import { UserService } from '../users/user.service';
import {
  computeSuccess,
  parseRewards,
  parseRules,
  resolveRewards,
  rollOutcome,
  type MissionOutcome,
  type SuccessBreakdown,
} from './mission.logic';

const MINUTE = 60 * 1000;

export interface ClaimedMission {
  missionName: string;
  missionEmoji: string;
  servantName: string;
  outcome: MissionOutcome;
  xp: number;
  coins: number;
  spiritOrigin: number;
  items: { name: string; emoji: string; quantity: number }[];
  bond: BondGain;
}

export interface ClaimSummary {
  claimed: ClaimedMission[];
  level: number;
  levelsGained: number;
  stillRunning: number;
}

export const MissionService = {
  async list() {
    return prisma.mission.findMany({ where: { enabled: true }, orderBy: [{ sortOrder: 'asc' }, { difficulty: 'asc' }] });
  },

  async search(query: string, limit = 25) {
    return prisma.mission.findMany({
      where: { enabled: true, name: { contains: query, mode: 'insensitive' } },
      orderBy: [{ sortOrder: 'asc' }],
      take: limit,
    });
  },

  /** Servants do jogador que não estão em expedição */
  async idleServants(userId: string, query: string, limit = 25) {
    return prisma.playerServant.findMany({
      where: {
        userId,
        missions: { none: { status: MissionStatus.IN_PROGRESS } },
        servant: { enabled: true, name: { contains: query, mode: 'insensitive' } },
      },
      include: { servant: { include: { class: true } } },
      orderBy: [{ bondLevel: 'desc' }, { servant: { name: 'asc' } }],
      take: limit,
    });
  },

  /** Chance prevista sem iniciar (para prévias) */
  async preview(userId: string, missionId: number, servantId: number): Promise<SuccessBreakdown> {
    const [mission, link] = await Promise.all([
      prisma.mission.findUnique({ where: { id: missionId } }),
      prisma.playerServant.findUnique({ where: { userId_servantId: { userId, servantId } }, include: { servant: true } }),
    ]);
    if (!mission || !link) throw new NotFoundError('Missão ou Servant não encontrado.');
    return computeSuccess(link.servant, link.bondLevel, parseRules(mission));
  },

  async start(userId: string, missionId: number, servantId: number) {
    return prisma.$transaction(async (tx) => {
      await lockUser(tx, userId);
      const user = await tx.user.findUniqueOrThrow({ where: { id: userId } });

      const mission = await tx.mission.findUnique({ where: { id: missionId } });
      if (!mission || !mission.enabled) throw new NotFoundError('Missão não encontrada.');
      if (user.level < mission.minLevel) {
        throw new GameError(`Esta missão exige Master nível **${mission.minLevel}** (você é nível ${user.level}).`);
      }

      const link = await tx.playerServant.findUnique({
        where: { userId_servantId: { userId, servantId } },
        include: { servant: { include: { class: true } } },
      });
      if (!link) throw new GameError('Você não possui esse Servant.');

      const running = await tx.playerMission.findMany({
        where: { userId, status: MissionStatus.IN_PROGRESS },
        select: { playerServantId: true },
      });
      if (running.some((r) => r.playerServantId === link.id)) {
        throw new GameError(`**${link.servant.name}** já está em uma expedição.`);
      }
      const max = gameConfig.missions.maxConcurrent(user.level);
      if (running.length >= max) {
        throw new GameError(`Você já tem **${running.length}/${max}** expedições em andamento. Resgate alguma com \`/mission claim\`.`);
      }

      const breakdown = computeSuccess(link.servant, link.bondLevel, parseRules(mission));
      const now = new Date();
      const run = await tx.playerMission.create({
        data: {
          userId,
          missionId: mission.id,
          playerServantId: link.id,
          successChance: breakdown.chance,
          startedAt: now,
          endsAt: new Date(now.getTime() + mission.durationMinutes * MINUTE),
        },
      });
      await LogService.log(tx, userId, 'MISSION_STARTED', {
        mission: mission.slug, servant: link.servant.slug, chance: breakdown.chance,
      });
      return { run, mission, servant: link.servant, breakdown, slotsUsed: running.length + 1, maxSlots: max };
    });
  },

  async status(userId: string) {
    const runs = await prisma.playerMission.findMany({
      where: { userId, status: MissionStatus.IN_PROGRESS },
      include: { mission: true, playerServant: { include: { servant: { include: { class: true } } } } },
      orderBy: { endsAt: 'asc' },
    });
    const user = await prisma.user.findUnique({ where: { id: userId } });
    return { runs, maxSlots: gameConfig.missions.maxConcurrent(user?.level ?? 1) };
  },

  /** Resgata todas as expedições já concluídas */
  async claimFinished(userId: string): Promise<ClaimSummary> {
    return prisma.$transaction(
      async (tx) => {
        await lockUser(tx, userId);
        const now = new Date();
        const runs = await tx.playerMission.findMany({
          where: { userId, status: MissionStatus.IN_PROGRESS },
          include: { mission: true, playerServant: { include: { servant: true } } },
          orderBy: { endsAt: 'asc' },
        });
        const finished = runs.filter((r) => r.endsAt <= now);

        const claimed: ClaimedMission[] = [];
        let totalXp = 0;

        for (const run of finished) {
          // Marca como resgatada de forma condicional (proteção extra contra resgate duplo)
          const upd = await tx.playerMission.updateMany({
            where: { id: run.id, status: MissionStatus.IN_PROGRESS },
            data: { status: MissionStatus.CLAIMED, claimedAt: now },
          });
          if (upd.count === 0) continue;

          const outcome = rollOutcome(run.successChance);
          const rewards = resolveRewards(parseRewards(run.mission.rewards), outcome);

          const items: ClaimedMission['items'] = [];
          for (const drop of rewards.drops) {
            const item = drop.item === '@random_catalyst'
              ? await InventoryService.rollRandomItem(tx, ItemType.CATALYST)
              : await InventoryService.findBySlug(tx, drop.item);
            if (!item) continue;
            await InventoryService.grant(tx, userId, item.id, drop.quantity, `mission:${run.mission.slug}`);
            items.push({ name: item.name, emoji: item.emoji, quantity: drop.quantity });
          }

          if (rewards.coins || rewards.spiritOrigin) {
            await tx.user.update({
              where: { id: userId },
              data: { coins: { increment: rewards.coins }, spiritOrigin: { increment: rewards.spiritOrigin } },
            });
          }
          totalXp += rewards.xp;

          await tx.playerServant.update({ where: { id: run.playerServantId }, data: { timesUsed: { increment: 1 } } });
          const bond = await BondService.addBondXp(
            tx, userId, run.playerServant.servantId, rewards.bondXp, `mission:${run.mission.slug}`,
          );

          const result = { ...rewards, items } as unknown as Prisma.InputJsonValue;
          await tx.playerMission.update({ where: { id: run.id }, data: { outcome, result } });
          await LogService.log(tx, userId, 'MISSION_CLAIMED', {
            mission: run.mission.slug, servant: run.playerServant.servant.slug, outcome, result,
          });

          claimed.push({
            missionName: run.mission.name,
            missionEmoji: run.mission.emoji,
            servantName: run.playerServant.servant.name,
            outcome,
            xp: rewards.xp,
            coins: rewards.coins,
            spiritOrigin: rewards.spiritOrigin,
            items,
            bond,
          });
        }

        const { level, levelsGained } = totalXp > 0
          ? await UserService.addXp(tx, userId, totalXp)
          : { level: (await tx.user.findUniqueOrThrow({ where: { id: userId } })).level, levelsGained: 0 };

        return { claimed, level, levelsGained, stillRunning: runs.length - finished.length };
      },
      { timeout: 15000 },
    );
  },

  /** Admin/teste: conclui na hora as expedições em andamento do jogador */
  async adminFinishAll(userId: string, adminId: string): Promise<number> {
    const res = await prisma.playerMission.updateMany({
      where: { userId, status: MissionStatus.IN_PROGRESS },
      data: { endsAt: new Date() },
    });
    await LogService.log(prisma, userId, 'ADMIN_FINISH_MISSIONS', { adminId, count: res.count });
    return res.count;
  },
};
