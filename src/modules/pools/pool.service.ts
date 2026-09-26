import { prisma } from '../../database/prisma';

const poolInclude = {
  servants: {
    where: { servant: { enabled: true } },
    include: { servant: { include: { class: true } } },
  },
} as const;

export const PoolService = {
  /** Banner ativo agora: maior prioridade entre os que estão dentro do período */
  async getActive(now = new Date()) {
    return prisma.summonPool.findFirst({
      where: {
        enabled: true,
        startDate: { lte: now },
        OR: [{ endDate: null }, { endDate: { gt: now } }],
      },
      orderBy: [{ priority: 'desc' }, { startDate: 'desc' }],
      include: poolInclude,
    });
  },

  async getUpcoming(now = new Date(), take = 3) {
    return prisma.summonPool.findMany({
      where: { enabled: true, startDate: { gt: now } },
      orderBy: { startDate: 'asc' },
      take,
    });
  },

  async markAnnounced(poolId: number) {
    await prisma.summonPool.update({ where: { id: poolId }, data: { announcedAt: new Date() } });
  },
};

export type ActivePool = NonNullable<Awaited<ReturnType<typeof PoolService.getActive>>>;
