import { Currency } from '@prisma/client';
import { gameConfig } from '../../config/game';
import { lockUser } from '../../database/locks';
import { prisma, type Db } from '../../database/prisma';
import { GameError, NotFoundError } from '../../shared/errors';
import { InventoryService } from '../inventory/inventory.service';
import { LogService } from '../logs/log.service';
import { currentPeriodStart } from '../summon/summon.period';

export const CURRENCY_LABEL: Record<Currency, { emoji: string; name: string }> = {
  COINS: { emoji: '🪙', name: 'moedas' },
  SPIRIT_ORIGIN: { emoji: '💠', name: 'Spirit Origin' },
};

async function boughtThisWeek(db: Db, userId: string, offerId: number): Promise<number> {
  const since = currentPeriodStart(new Date(), gameConfig.summon);
  const agg = await db.shopPurchase.aggregate({
    where: { userId, offerId, createdAt: { gte: since } },
    _sum: { quantity: true },
  });
  return agg._sum.quantity ?? 0;
}

export const ShopService = {
  /** Próximo reset dos limites semanais (mesmo horário do summon semanal) */
  nextReset(): Date {
    return new Date(currentPeriodStart(new Date(), gameConfig.summon).getTime() + 7 * 24 * 3600 * 1000);
  },

  async listOffers(userId: string) {
    const offers = await prisma.shopOffer.findMany({
      where: { enabled: true, item: { enabled: true } },
      include: { item: true },
      orderBy: [{ sortOrder: 'asc' }, { price: 'asc' }],
    });
    return Promise.all(
      offers.map(async (o) => ({ offer: o, bought: o.weeklyLimit ? await boughtThisWeek(prisma, userId, o.id) : 0 })),
    );
  },

  async buy(userId: string, offerId: number, times: number) {
    if (!Number.isInteger(times) || times < 1) throw new GameError('Quantidade inválida.');
    return prisma.$transaction(async (tx) => {
      await lockUser(tx, userId);
      const offer = await tx.shopOffer.findUnique({ where: { id: offerId }, include: { item: true } });
      if (!offer || !offer.enabled || !offer.item.enabled) throw new NotFoundError('Oferta não encontrada.');

      if (offer.weeklyLimit !== null) {
        const bought = await boughtThisWeek(tx, userId, offer.id);
        const left = offer.weeklyLimit - bought;
        if (left <= 0) throw new GameError(`Você já atingiu o limite semanal de **${offer.item.name}**.`);
        if (times > left) throw new GameError(`Você só pode comprar mais **${left}** esta semana.`);
      }

      const total = offer.price * times;
      const field = offer.currency === Currency.COINS ? 'coins' : 'spiritOrigin';
      const paid = await tx.user.updateMany({
        where: { id: userId, [field]: { gte: total } },
        data: { [field]: { decrement: total } },
      });
      if (paid.count === 0) {
        const c = CURRENCY_LABEL[offer.currency];
        throw new GameError(`Você não tem ${c.name} suficientes. Custo: ${c.emoji} **${total}**.`);
      }

      const quantity = offer.quantity * times;
      await InventoryService.grant(tx, userId, offer.itemId, quantity, `shop:${offer.slug}`);
      await tx.shopPurchase.create({
        data: { userId, offerId: offer.id, quantity: times, totalPrice: total, currency: offer.currency },
      });
      await LogService.log(tx, userId, 'SHOP_PURCHASE', { offer: offer.slug, times, total, currency: offer.currency });

      const user = await tx.user.findUniqueOrThrow({ where: { id: userId } });
      return { offer, quantity, total, balance: offer.currency === Currency.COINS ? user.coins : user.spiritOrigin };
    });
  },
};
