import { ItemType, Prisma, type User } from '@prisma/client';
import { gameConfig } from '../../config/game';
import { prisma, type Tx } from '../../database/prisma';
import { GameError } from '../../shared/errors';
import { InventoryService } from '../inventory/inventory.service';
import { LogService } from '../logs/log.service';

export interface EnsureResult {
  user: User;
  created: boolean;
}

export const UserService = {
  /** Cria o perfil automaticamente no primeiro uso de qualquer comando */
  async ensure(discordId: string, username: string): Promise<EnsureResult> {
    const existing = await prisma.user.findUnique({ where: { id: discordId } });
    if (existing) {
      if (existing.username !== username) {
        const user = await prisma.user.update({ where: { id: discordId }, data: { username } });
        return { user, created: false };
      }
      return { user: existing, created: false };
    }

    try {
      const user = await prisma.$transaction(async (tx) => {
        const u = await tx.user.create({
          data: { id: discordId, username, coins: gameConfig.newPlayer.startingCoins },
        });
        for (let i = 0; i < gameConfig.newPlayer.startingCatalysts; i++) {
          const item = await InventoryService.rollRandomItem(tx, ItemType.CATALYST);
          if (item) await InventoryService.grant(tx, discordId, item.id, 1, 'starter_pack');
        }
        await LogService.log(tx, discordId, 'USER_CREATED', { username });
        return u;
      });
      return { user, created: true };
    } catch (err) {
      // Dois comandos simultâneos do mesmo usuário novo: o outro já criou
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
        return { user: await prisma.user.findUniqueOrThrow({ where: { id: discordId } }), created: false };
      }
      throw err;
    }
  },

  async get(discordId: string) {
    return prisma.user.findUnique({ where: { id: discordId } });
  },

  async getProfile(discordId: string) {
    const user = await prisma.user.findUnique({
      where: { id: discordId },
      include: { favoriteServant: { include: { class: true } } },
    });
    if (!user) return null;

    const [servantCount, title, activeMissions, favoriteLink] = await Promise.all([
      prisma.playerServant.count({ where: { userId: discordId } }),
      user.equippedTitle
        ? prisma.playerTitle.findUnique({ where: { userId_key: { userId: discordId, key: user.equippedTitle } } })
        : Promise.resolve(null),
      prisma.playerMission.count({ where: { userId: discordId, status: 'IN_PROGRESS' } }),
      user.favoriteServantId
        ? prisma.playerServant.findUnique({
            where: { userId_servantId: { userId: discordId, servantId: user.favoriteServantId } },
          })
        : Promise.resolve(null),
    ]);

    return {
      user,
      servantCount,
      title: title?.text ?? null,
      activeMissions,
      favorite: user.favoriteServant && favoriteLink ? { servant: user.favoriteServant, link: favoriteLink } : null,
      xpToNext: gameConfig.progression.xpToNextLevel(user.level),
    };
  },

  /**
   * Adiciona XP e processa subida de nível. Deve rodar dentro de uma transação
   * em que a linha do usuário já esteja travada (ex.: após o claim do summon).
   */
  async addXp(tx: Tx, discordId: string, amount: number): Promise<{ level: number; levelsGained: number }> {
    const user = await tx.user.findUniqueOrThrow({ where: { id: discordId } });
    let { level, xp } = user;
    xp += amount;
    let gained = 0;
    while (level < gameConfig.progression.maxLevel && xp >= gameConfig.progression.xpToNextLevel(level)) {
      xp -= gameConfig.progression.xpToNextLevel(level);
      level++;
      gained++;
    }
    await tx.user.update({ where: { id: discordId }, data: { level, xp } });
    if (gained > 0) await LogService.log(tx, discordId, 'LEVEL_UP', { level });
    return { level, levelsGained: gained };
  },

  async setFavorite(discordId: string, servantId: number): Promise<void> {
    const owns = await prisma.playerServant.findUnique({
      where: { userId_servantId: { userId: discordId, servantId } },
    });
    if (!owns) throw new GameError('Você só pode favoritar um Servant que já invocou.');
    await prisma.user.update({ where: { id: discordId }, data: { favoriteServantId: servantId } });
    await LogService.log(prisma, discordId, 'FAVORITE_SET', { servantId });
  },

  async resetFreeSummon(discordId: string, adminId: string): Promise<void> {
    await prisma.user.update({ where: { id: discordId }, data: { lastFreeSummonAt: null } });
    await LogService.log(prisma, discordId, 'ADMIN_RESET_SUMMON', { adminId });
  },
};
