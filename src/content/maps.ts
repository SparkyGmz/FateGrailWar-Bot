/**
 * Mapas das Guerras. Cada Guerra copia o template para war_locations,
 * então dá para ter vários mapas e editar uma Guerra sem afetar outras.
 *
 * connections forma um grafo NÃO direcionado (o seed/serviço valida a simetria).
 * dangerLevel: 1 (baixo) a 3 (alto) — muda a tabela de eventos do /explore.
 * effects: modificadores locais
 *   stealthBonus        → multiplica a furtividade de quem está ali (+20% = 0.2)
 *   investigationBonus  → multiplica a investigação de quem está ali
 *   manaRegen           → MP extra ao explorar ali
 */
export interface MapLocationSeed {
  slug: string;
  name: string;
  emoji: string;
  description: string;
  dangerLevel: 1 | 2 | 3;
  connections: string[];
  effects?: { stealthBonus?: number; investigationBonus?: number; manaRegen?: number };
}

export interface MapSeed {
  slug: string;
  name: string;
  locations: MapLocationSeed[];
}

export const maps: MapSeed[] = [
  {
    slug: 'fuyuki',
    name: 'Fuyuki',
    locations: [
      {
        slug: 'centro', name: 'Centro', emoji: '🏙️', dangerLevel: 1,
        description: 'Ruas movimentadas de Shinto. Muitos civis — lutar aqui chamaria atenção demais.',
        connections: ['ponte', 'porto', 'academia', 'igreja'],
        effects: { stealthBonus: 0.2 },
      },
      {
        slug: 'igreja', name: 'Igreja', emoji: '⛪', dangerLevel: 1,
        description: 'Território neutro do supervisor da Guerra. Informações circulam por aqui.',
        connections: ['centro', 'suburbio'],
        effects: { investigationBonus: 0.25 },
      },
      {
        slug: 'ponte', name: 'Ponte', emoji: '🌉', dangerLevel: 2,
        description: 'A grande ponte sobre o rio Mion, ligando Shinto a Miyama. Passagem obrigatória.',
        connections: ['centro', 'suburbio', 'porto'],
      },
      {
        slug: 'porto', name: 'Porto', emoji: '⚓', dangerLevel: 3,
        description: 'Armazéns vazios e contêineres. O lugar preferido para duelos longe dos olhos.',
        connections: ['centro', 'ponte'],
        effects: { stealthBonus: 0.1 },
      },
      {
        slug: 'academia', name: 'Academia', emoji: '🏫', dangerLevel: 2,
        description: 'O colégio Homurahara. De dia é cheio de alunos; à noite, silêncio suspeito.',
        connections: ['centro', 'suburbio'],
      },
      {
        slug: 'suburbio', name: 'Subúrbio', emoji: '🏘️', dangerLevel: 1,
        description: 'Bairro residencial de Miyama, com mansões antigas de famílias de magos.',
        connections: ['igreja', 'ponte', 'academia', 'floresta'],
        effects: { stealthBonus: 0.1 },
      },
      {
        slug: 'floresta', name: 'Floresta', emoji: '🌲', dangerLevel: 3,
        description: 'Floresta densa e enfeitiçada nos arredores da cidade. Fácil se perder — ou se esconder.',
        connections: ['suburbio', 'castelo'],
        effects: { stealthBonus: 0.3, manaRegen: 10 },
      },
      {
        slug: 'castelo', name: 'Castelo', emoji: '🏰', dangerLevel: 3,
        description: 'Um castelo europeu escondido no coração da floresta. Rico em mana, cheio de armadilhas.',
        connections: ['floresta'],
        effects: { manaRegen: 20, investigationBonus: 0.1 },
      },
    ],
  },
];
