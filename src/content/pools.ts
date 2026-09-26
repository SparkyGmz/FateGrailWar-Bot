/**
 * Banners. `servants: 'ALL'` inclui todo Servant habilitado.
 *
 * O pool padrão (priority 0, sem data de fim) é o fallback permanente.
 * Os banners temáticos (priority 10) entram em rotação semanal:
 * o seed gera N semanas a partir da semana atual, ciclando os temas.
 */
export interface PoolTheme {
  slug: string;
  name: string;
  description: string;
  servants: string[];
  featured: string[];
  featuredMultiplier: number;
}

export const standardPool = {
  slug: 'padrao',
  name: 'Invocação Padrão',
  description: 'Todos os Espíritos Heroicos registrados no Trono dos Heróis.',
  priority: 0,
  rateModifiers: {},
};

export const rotationWeeks = 12;

export const themes: PoolTheme[] = [
  {
    slug: 'herois-da-britania',
    name: 'Heroes of Britain',
    description: 'Cavaleiros, reis e lendas das Ilhas Britânicas.',
    servants: [
      'artoria-pendragon', 'mordred', 'gawain', 'lancelot-saber', 'lancelot-berserker', 'merlin', 'morgan',
      'robin-hood', 'francis-drake', 'jack-the-ripper', 'james-moriarty', 'zhuge-liang-waver',
    ],
    featured: ['artoria-pendragon', 'mordred'],
    featuredMultiplier: 3,
  },
  {
    slug: 'epicos-do-oriente',
    name: 'Épicos do Oriente Antigo',
    description: 'Mahabharata, Mesopotâmia e Egito: deuses, reis e rivais eternos.',
    servants: [
      'arjuna', 'karna', 'arjuna-alter', 'gilgamesh', 'gilgamesh-caster', 'enkidu', 'ereshkigal',
      'ozymandias', 'nitocris', 'semiramis', 'iskandar', 'first-hassan',
    ],
    featured: ['arjuna', 'karna'],
    featuredMultiplier: 3,
  },
  {
    slug: 'herois-da-grecia',
    name: 'Heróis da Hélade',
    description: 'Argonautas, semideuses e feiticeiras da Grécia.',
    servants: [
      'heracles', 'achilles', 'chiron', 'atalanta', 'medusa', 'medea', 'circe', 'iskandar', 'spartacus', 'nero-claudius',
    ],
    featured: ['heracles', 'achilles'],
    featuredMultiplier: 3,
  },
  {
    slug: 'japao-lendario',
    name: 'Japão Lendário',
    description: 'Samurais, oni, ninjas, raposas divinas — e um arqueiro vindo de Fuyuki.',
    servants: [
      'okita-souji', 'miyamoto-musashi', 'sasaki-kojirou', 'ushiwakamaru', 'tamamo-no-mae', 'shuten-douji',
      'fuuma-kotarou', 'kintoki', 'minamoto-no-raikou', 'kiyohime', 'emiya',
    ],
    featured: ['miyamoto-musashi', 'minamoto-no-raikou'],
    featuredMultiplier: 3,
  },
  {
    slug: 'lendas-do-norte',
    name: 'Lendas Celtas e Nórdicas',
    description: 'Lanças amaldiçoadas, valquírias e matadores de dragão.',
    servants: [
      'cu-chulainn-prototype', 'cu-chulainn', 'scathach', 'diarmuid-ua-duibhne', 'siegfried', 'brynhild',
      'astolfo', 'quetzalcoatl', 'nikola-tesla', 'hans-christian-andersen', 'hassan-cursed-arm', 'hassan-hundred-personas',
    ],
    featured: ['scathach', 'brynhild'],
    featuredMultiplier: 3,
  },
];
