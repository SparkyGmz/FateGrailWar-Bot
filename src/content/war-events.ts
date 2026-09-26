/**
 * Tabela de eventos do /explore — probabilidades e textos são conteúdo.
 *
 * weightsByDanger: peso de cada tipo por nível de perigo da região.
 * "master"/"servant" só acontecem se houver outro participante na região;
 * caso contrário o sorteio é refeito sem eles.
 */
export type ExploreEventType =
  | 'nothing' | 'item' | 'catalyst' | 'npc' | 'enemy' | 'master' | 'servant' | 'trap' | 'special_event';

export const weightsByDanger: Record<1 | 2 | 3, Record<ExploreEventType, number>> = {
  1: { nothing: 30, item: 18, catalyst: 4, npc: 22, enemy: 6, master: 8, servant: 6, trap: 3, special_event: 3 },
  2: { nothing: 22, item: 16, catalyst: 6, npc: 14, enemy: 12, master: 10, servant: 10, trap: 6, special_event: 4 },
  3: { nothing: 15, item: 14, catalyst: 9, npc: 6, enemy: 18, master: 12, servant: 12, trap: 9, special_event: 5 },
};

/** Itens que podem aparecer em "item" (slug, peso) */
export const exploreItems: { item: string; weight: number }[] = [
  { item: 'incenso-vinculo', weight: 10 },
  { item: 'incenso-vinculo-raro', weight: 2 },
];

export const texts = {
  nothing: [
    'Você percorre a região por horas. Nada além do vento e de algumas luzes distantes.',
    'Seu Servant permanece atento, mas a área está estranhamente quieta.',
    'Rastros antigos de mana — ninguém passou por aqui há dias.',
  ],
  npc: [
    'Um morador comenta sobre "vazamentos de gás" misteriosos nas últimas noites.',
    'Um policial reclama de desaparecimentos que ninguém consegue explicar.',
    'Uma freira da igreja avisa: "O supervisor pede discrição a todos os Masters."',
    'Um velho vendedor jura ter visto um cavaleiro de armadura sobre um telhado.',
  ],
  enemy: [
    'Familiares hostis cercam vocês. Seu Servant os dispersa, mas não sai ileso.',
    'Esqueletos de dente de dragão emergem do chão — um Master rival deixou sentinelas.',
    'Um golem mal-feito ataca. A luta é curta, mas cansativa.',
  ],
  trap: [
    'Um círculo mágico oculto explode sob seus pés!',
    'Fios de mana invisíveis cortam o caminho — uma armadilha de algum Caster.',
    'O chão cede: uma cova coberta por ilusão.',
  ],
  special_event: [
    'Vocês encontram um ponto de convergência das linhas ley. A mana flui para o seu Servant.',
    'Um eco do Graal pulsa por um instante. Seu Servant parece revigorado.',
  ],
};
