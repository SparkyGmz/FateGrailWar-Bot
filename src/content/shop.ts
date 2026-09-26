/**
 * Ofertas da loja. `weeklyLimit` é por jogador e reseta junto do summon semanal.
 * Spirit Origin vem de duplicatas e missões; moedas de summons e missões.
 */
export interface ShopOfferSeed {
  slug: string;
  item: string;
  currency: 'COINS' | 'SPIRIT_ORIGIN';
  price: number;
  quantity?: number;
  weeklyLimit?: number;
}

export const shopOffers: ShopOfferSeed[] = [
  { slug: 'ticket-so', item: 'ticket-invocacao', currency: 'SPIRIT_ORIGIN', price: 200, weeklyLimit: 2 },
  { slug: 'incenso-coins', item: 'incenso-vinculo', currency: 'COINS', price: 300, weeklyLimit: 5 },
  { slug: 'incenso-raro-so', item: 'incenso-vinculo-raro', currency: 'SPIRIT_ORIGIN', price: 80, weeklyLimit: 3 },

  // Catalisadores comuns por moedas, raros por Spirit Origin
  { slug: 'cat-sakura', item: 'folha-sakura', currency: 'COINS', price: 600, weeklyLimit: 1 },
  { slug: 'cat-mascara', item: 'mascara-caveira', currency: 'COINS', price: 600, weeklyLimit: 1 },
  { slug: 'cat-anfora', item: 'fragmento-ceramica-grega', currency: 'COINS', price: 600, weeklyLimit: 1 },
  { slug: 'cat-tavola', item: 'mesa-redonda-lasca', currency: 'SPIRIT_ORIGIN', price: 60, weeklyLimit: 1 },
  { slug: 'cat-sombras', item: 'espinho-terra-sombras', currency: 'SPIRIT_ORIGIN', price: 60, weeklyLimit: 1 },
  { slug: 'cat-argila', item: 'tabua-argila', currency: 'SPIRIT_ORIGIN', price: 100, weeklyLimit: 1 },
  { slug: 'cat-gandiva', item: 'pena-gandiva', currency: 'SPIRIT_ORIGIN', price: 100, weeklyLimit: 1 },
];
