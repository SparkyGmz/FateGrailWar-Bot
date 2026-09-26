import { ItemType, type Item } from '@prisma/client';
import { prisma, type Db, type Tx } from '../../database/prisma';
import { GameError, NotFoundError } from '../../shared/errors';
import { weightedPick } from '../../shared/random';
import { LogService } from '../logs/log.service';

export const InventoryService = {
  async list(userId: string, type?: ItemType, db: Db = prisma) {
    return db.inventoryItem.findMany({
      where: { userId, quantity: { gt: 0 }, item: { enabled: true, ...(type ? { type } : {}) } },
      include: { item: true },
      orderBy: [{ item: { rarity: 'desc' } }, { item: { name: 'asc' } }],
    });
  },

  async getOwned(userId: string, itemId: number) {
    return prisma.inventoryItem.findUnique({
      where: { userId_itemId: { userId, itemId } },
      include: { item: true },
    });
  },

  async findItem(idOrSlug: string | number): Promise<Item> {
    const where = typeof idOrSlug === 'number' || /^\d+$/.test(idOrSlug)
      ? { id: Number(idOrSlug) }
      : { slug: idOrSlug };
    const item = await prisma.item.findUnique({ where });
    if (!item) throw new NotFoundError('Item não encontrado.');
    return item;
  },

  async findBySlug(db: Db, slug: string): Promise<Item | null> {
    return db.item.findUnique({ where: { slug } });
  },

  /** Quantidade que o jogador tem de um item (pelo slug) */
  async countBySlug(userId: string, slug: string): Promise<number> {
    const inv = await prisma.inventoryItem.findFirst({ where: { userId, item: { slug } } });
    return inv?.quantity ?? 0;
  },

  async searchItems(query: string, limit = 25) {
    return prisma.item.findMany({
      where: { enabled: true, name: { contains: query, mode: 'insensitive' } },
      orderBy: { name: 'asc' },
      take: limit,
    });
  },

  async grant(db: Db, userId: string, itemId: number, quantity: number, source: string): Promise<void> {
    if (quantity <= 0) return;
    await db.inventoryItem.upsert({
      where: { userId_itemId: { userId, itemId } },
      create: { userId, itemId, quantity },
      update: { quantity: { increment: quantity } },
    });
    await LogService.log(db, userId, 'ITEM_RECEIVED', { itemId, quantity, source });
  },

  /** Consome de forma atômica. Lança GameError se não houver quantidade suficiente. */
  async consume(tx: Tx, userId: string, itemId: number, quantity: number, reason: string): Promise<void> {
    const res = await tx.inventoryItem.updateMany({
      where: { userId, itemId, quantity: { gte: quantity } },
      data: { quantity: { decrement: quantity } },
    });
    if (res.count === 0) throw new GameError('Você não possui esse item em quantidade suficiente.');
    await LogService.log(tx, userId, 'ITEM_SPENT', { itemId, quantity, reason });
  },

  /** Sorteia um item com drop_weight > 0 do tipo informado */
  async rollRandomItem(db: Db, type: ItemType): Promise<Item | null> {
    const pool = await db.item.findMany({ where: { enabled: true, type, dropWeight: { gt: 0 } } });
    if (pool.length === 0) return null;
    return weightedPick(pool.map((item) => ({ item, weight: item.dropWeight })));
  },
};
