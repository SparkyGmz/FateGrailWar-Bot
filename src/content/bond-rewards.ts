/**
 * Recompensas de Bond. `servant: null` vale para todos; um slug cria uma
 * recompensa específica daquele Servant (somada às globais).
 * Títulos aceitam {servant}, trocado pelo nome.
 */
export interface BondRewardSeed {
  servant: string | null;
  level: number;
  type: 'COINS' | 'SPIRIT_ORIGIN' | 'ITEM' | 'TITLE';
  amount?: number;
  item?: string;
  title?: string;
}

export const bondRewards: BondRewardSeed[] = [
  { servant: null, level: 1, type: 'COINS', amount: 100 },
  { servant: null, level: 2, type: 'COINS', amount: 200 },
  { servant: null, level: 3, type: 'ITEM', item: 'incenso-vinculo', amount: 1 },
  { servant: null, level: 4, type: 'SPIRIT_ORIGIN', amount: 20 },
  { servant: null, level: 5, type: 'TITLE', title: 'Parceiro de {servant}' },
  { servant: null, level: 5, type: 'SPIRIT_ORIGIN', amount: 30 },
  { servant: null, level: 6, type: 'COINS', amount: 500 },
  { servant: null, level: 7, type: 'ITEM', item: 'incenso-vinculo-raro', amount: 1 },
  { servant: null, level: 8, type: 'SPIRIT_ORIGIN', amount: 60 },
  { servant: null, level: 9, type: 'ITEM', item: 'ticket-invocacao', amount: 1 },
  { servant: null, level: 10, type: 'TITLE', title: 'Vínculo Eterno: {servant}' },
  { servant: null, level: 10, type: 'SPIRIT_ORIGIN', amount: 150 },

  // Exemplos de recompensas exclusivas (o mesmo formato serve para qualquer Servant)
  { servant: 'artoria-pendragon', level: 10, type: 'TITLE', title: 'Cavaleiro do Rei' },
  { servant: 'gilgamesh', level: 10, type: 'TITLE', title: 'Digno do Tesouro do Rei' },
  { servant: 'iskandar', level: 10, type: 'TITLE', title: 'Companheiro de Conquista' },
  { servant: 'arjuna', level: 10, type: 'TITLE', title: 'Confidente do Herói Perfeito' },
  { servant: 'karna', level: 10, type: 'TITLE', title: 'Amigo do Herói da Caridade' },
];
