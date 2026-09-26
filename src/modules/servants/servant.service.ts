import { prisma } from '../../database/prisma';
import { gameConfig } from '../../config/game';

export const ServantService = {
  async search(query: string, limit = 25) {
    return prisma.servant.findMany({
      where: { enabled: true, name: { contains: query, mode: 'insensitive' } },
      include: { class: true },
      orderBy: [{ name: 'asc' }, { classId: 'asc' }],
      take: limit,
    });
  },

  /** Busca Servants que o jogador possui (para autocomplete de /favorite etc.) */
  async searchOwned(userId: string, query: string, limit = 25) {
    const links = await prisma.playerServant.findMany({
      where: { userId, servant: { enabled: true, name: { contains: query, mode: 'insensitive' } } },
      include: { servant: { include: { class: true } } },
      orderBy: { servant: { name: 'asc' } },
      take: limit,
    });
    return links.map((l) => l.servant);
  },

  async getById(id: number) {
    return prisma.servant.findUnique({
      where: { id },
      include: { class: true, noblePhantasms: true, skills: { include: { skill: true }, orderBy: { slot: 'asc' } } },
    });
  },

  async getOwnership(userId: string, servantId: number) {
    return prisma.playerServant.findUnique({ where: { userId_servantId: { userId, servantId } } });
  },

  async listClasses() {
    return prisma.servantClass.findMany({ where: { enabled: true }, orderBy: { sortOrder: 'asc' } });
  },

  async totalEnabled() {
    return prisma.servant.count({ where: { enabled: true } });
  },

  /** Coleção paginada, ordenada por raridade e classe */
  async collection(userId: string, classId: string | null, page: number) {
    const pageSize = gameConfig.ui.collectionPageSize;
    const where = { userId, servant: { enabled: true, ...(classId ? { classId } : {}) } };
    const total = await prisma.playerServant.count({ where });
    const totalPages = Math.max(1, Math.ceil(total / pageSize));
    const safePage = Math.min(Math.max(0, page), totalPages - 1);
    const items = await prisma.playerServant.findMany({
      where,
      include: { servant: { include: { class: true } } },
      orderBy: [{ servant: { rarity: 'desc' } }, { servant: { class: { sortOrder: 'asc' } } }, { servant: { name: 'asc' } }],
      skip: safePage * pageSize,
      take: pageSize,
    });
    return { items, total, page: safePage, totalPages };
  },
};
