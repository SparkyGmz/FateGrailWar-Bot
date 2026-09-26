import { BondRewardType } from '@prisma/client';
import { gameConfig } from '../../config/game';
import { prisma, type Tx } from '../../database/prisma';
import { NotFoundError } from '../../shared/errors';
import { InventoryService } from '../inventory/inventory.service';
import { LogService } from '../logs/log.service';
import { TitleService } from '../titles/title.service';
import { applyBondXp } from './bond.logic';

export interface GrantedReward {
  level: number;
  text: string;
}

export interface BondGain {
  servantName: string;
  before: number;
  level: number;
  xp: number;
  gained: number;
  reached: number[];
  rewards: GrantedReward[];
}

export const BondService = {
  /**
   * Adiciona Bond a um Servant do jogador e entrega as recompensas de cada
   * nível alcançado. Deve rodar dentro de uma transação com o jogador travado.
   */
  async addBondXp(tx: Tx, userId: string, servantId: number, amount: number, source: string): Promise<BondGain> {
    const link = await tx.playerServant.findUnique({
      where: { userId_servantId: { userId, servantId } },
      include: { servant: true },
    });
    if (!link) throw new NotFoundError('Você não possui esse Servant.');

    const progress = applyBondXp(link.bondLevel, link.bondXp, amount);
    await tx.playerServant.update({
      where: { id: link.id },
      data: { bondLevel: progress.level, bondXp: progress.xp },
    });

    const rewards: GrantedReward[] = [];
    if (progress.reached.length) {
      const defs = await tx.bondReward.findMany({
        where: { level: { in: progress.reached }, OR: [{ servantId: null }, { servantId }] },
        include: { item: true },
        orderBy: [{ level: 'asc' }, { id: 'asc' }],
      });
      for (const r of defs) {
        switch (r.type) {
          case BondRewardType.COINS:
            await tx.user.update({ where: { id: userId }, data: { coins: { increment: r.amount } } });
            rewards.push({ level: r.level, text: `🪙 ${r.amount} moedas` });
            break;
          case BondRewardType.SPIRIT_ORIGIN:
            await tx.user.update({ where: { id: userId }, data: { spiritOrigin: { increment: r.amount } } });
            rewards.push({ level: r.level, text: `💠 ${r.amount} Spirit Origin` });
            break;
          case BondRewardType.ITEM:
            if (r.item) {
              await InventoryService.grant(tx, userId, r.item.id, r.amount, `bond:${link.servant.slug}:${r.level}`);
              rewards.push({ level: r.level, text: `${r.item.emoji} ${r.item.name} ×${r.amount}` });
            }
            break;
          case BondRewardType.TITLE:
            if (r.title) {
              const text = r.title.replaceAll('{servant}', link.servant.name);
              const isNew = await TitleService.grant(tx, userId, `bond:${link.servant.slug}:${r.level}`, text, 'bond');
              if (isNew) rewards.push({ level: r.level, text: `🏷️ Título **${text}**` });
            }
            break;
        }
      }
    }

    await LogService.log(tx, userId, 'BOND_XP', {
      servant: link.servant.slug, amount, source, level: progress.level, reached: progress.reached,
    });

    return {
      servantName: link.servant.name,
      before: link.bondLevel,
      level: progress.level,
      xp: progress.xp,
      gained: amount,
      reached: progress.reached,
      rewards,
    };
  },

  async getView(userId: string, servantId: number) {
    const link = await prisma.playerServant.findUnique({
      where: { userId_servantId: { userId, servantId } },
      include: { servant: { include: { class: true } } },
    });
    if (!link) return null;
    const nextLevel = link.bondLevel + 1;
    const nextRewards = link.bondLevel >= gameConfig.bond.maxLevel
      ? []
      : await prisma.bondReward.findMany({
          where: { level: nextLevel, OR: [{ servantId: null }, { servantId }] },
          include: { item: true },
        });
    const missionsDone = await prisma.playerMission.count({ where: { playerServantId: link.id, status: 'CLAIMED' } });
    return { link, nextRewards, missionsDone };
  },
};
