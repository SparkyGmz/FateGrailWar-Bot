import { prisma, type Db } from '../../database/prisma';
import { GameError } from '../../shared/errors';

export const TitleService = {
  /** Concede um título (idempotente). Retorna true se for novo. */
  async grant(db: Db, userId: string, key: string, text: string, source: string): Promise<boolean> {
    const res = await db.playerTitle.createMany({ data: [{ userId, key, text, source }], skipDuplicates: true });
    return res.count > 0;
  },

  async list(userId: string) {
    return prisma.playerTitle.findMany({ where: { userId }, orderBy: { obtainedAt: 'desc' } });
  },

  async equip(userId: string, key: string | null): Promise<string | null> {
    if (key === null) {
      await prisma.user.update({ where: { id: userId }, data: { equippedTitle: null } });
      return null;
    }
    const title = await prisma.playerTitle.findUnique({ where: { userId_key: { userId, key } } });
    if (!title) throw new GameError('Você não possui esse título.');
    await prisma.user.update({ where: { id: userId }, data: { equippedTitle: key } });
    return title.text;
  },

  async getEquippedText(userId: string, key: string | null): Promise<string | null> {
    if (!key) return null;
    const t = await prisma.playerTitle.findUnique({ where: { userId_key: { userId, key } } });
    return t?.text ?? null;
  },
};
