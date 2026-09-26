/**
 * Missões PvE (expedições). Tudo aqui é conteúdo — nenhum código muda
 * para adicionar ou rebalancear uma missão.
 *
 * statWeights: quais parâmetros do Servant contam no teste (e com que peso)
 * classBonus / traitBonus: somados à chance (traits não acumulam; vale o maior)
 * rewards.drops: item = slug de item ou "@random_catalyst"; chance em 0..1
 *
 * Chance ≈ 60% + (parâmetro médio − dificuldade esperada) × 12% + bônus
 * (ver config/game.ts → missions)
 */
import type { MissionRewards, StatKey } from '../modules/missions/mission.logic';

export interface MissionSeed {
  slug: string;
  name: string;
  emoji: string;
  description: string;
  difficulty: 1 | 2 | 3 | 4 | 5;
  durationMinutes: number;
  minLevel: number;
  statWeights: Partial<Record<StatKey, number>>;
  classBonus?: Record<string, number>;
  traitBonus?: Record<string, number>;
  rewards: MissionRewards;
}

export const missions: MissionSeed[] = [
  {
    slug: 'patrulha-noturna', name: 'Patrulha Noturna em Fuyuki', emoji: '🌙',
    description: 'Ronde pelas ruas da cidade e mantenha os civis longe do ritual.',
    difficulty: 1, durationMinutes: 30, minLevel: 1,
    statWeights: { agility: 1, endurance: 1 },
    classBonus: { rider: 0.1, lancer: 0.05 },
    rewards: { xp: 40, coins: 80, bondXp: 30, drops: [{ item: 'incenso-vinculo', chance: 0.1 }] },
  },
  {
    slug: 'familiares-descontrolados', name: 'Caçar Familiares Descontrolados', emoji: '🦇',
    description: 'Um mago perdeu o controle de seus familiares. Elimine-os antes que chamem atenção.',
    difficulty: 2, durationMinutes: 60, minLevel: 1,
    statWeights: { strength: 1, agility: 0.5 },
    classBonus: { saber: 0.1, berserker: 0.1 },
    rewards: { xp: 70, coins: 150, bondXp: 50, drops: [{ item: '@random_catalyst', chance: 0.1 }] },
  },
  {
    slug: 'rumores-igreja', name: 'Investigar Rumores na Igreja', emoji: '⛪',
    description: 'O supervisor da Guerra anda escondendo algo. Descubra o quê sem ser visto.',
    difficulty: 2, durationMinutes: 60, minLevel: 2,
    statWeights: { luck: 1, mana: 0.5 },
    classBonus: { assassin: 0.2, caster: 0.1 },
    rewards: { xp: 70, coins: 120, bondXp: 50, drops: [{ item: 'incenso-vinculo', chance: 0.2 }] },
  },
  {
    slug: 'linhas-ley', name: 'Reunir Mana nas Linhas Ley', emoji: '🔯',
    description: 'Colete mana dos pontos de poder da cidade antes dos outros Masters.',
    difficulty: 2, durationMinutes: 120, minLevel: 2,
    statWeights: { mana: 1 },
    classBonus: { caster: 0.2 },
    traitBonus: { Divine: 0.05 },
    rewards: { xp: 110, coins: 300, bondXp: 70, spiritOrigin: 10 },
  },
  {
    slug: 'escoltar-mercador', name: 'Escoltar um Mercador de Relíquias', emoji: '🛒',
    description: 'Um comerciante do Clock Tower atravessa território perigoso com mercadoria valiosa.',
    difficulty: 3, durationMinutes: 120, minLevel: 3,
    statWeights: { endurance: 1, strength: 0.5 },
    classBonus: { rider: 0.15, saber: 0.05 },
    traitBonus: { Riding: 0.05 },
    rewards: { xp: 130, coins: 250, bondXp: 80, drops: [{ item: '@random_catalyst', chance: 0.35 }] },
  },
  {
    slug: 'reliquia-roubada', name: 'Recuperar uma Relíquia Roubada', emoji: '🗝️',
    description: 'Um catalisador foi roubado de um cofre da Associação. Rastreie o ladrão.',
    difficulty: 3, durationMinutes: 180, minLevel: 4,
    statWeights: { agility: 1, luck: 1 },
    classBonus: { assassin: 0.15, archer: 0.1 },
    rewards: { xp: 170, coins: 300, bondXp: 100, drops: [{ item: '@random_catalyst', chance: 0.6 }] },
  },
  {
    slug: 'ruinas-antigas', name: 'Explorar Ruínas da Era dos Deuses', emoji: '🏛️',
    description: 'Ruínas soterradas guardam ecos de mistério antigo — e armadilhas.',
    difficulty: 3, durationMinutes: 240, minLevel: 5,
    statWeights: { luck: 1, agility: 0.5, mana: 0.5 },
    classBonus: { archer: 0.1, caster: 0.1 },
    traitBonus: { Divine: 0.1 },
    rewards: {
      xp: 220, coins: 350, bondXp: 130, spiritOrigin: 20,
      drops: [{ item: '@random_catalyst', chance: 0.5 }, { item: 'incenso-vinculo', chance: 0.3 }],
    },
  },
  {
    slug: 'servant-sombra', name: 'Enfrentar um Servant Sombra', emoji: '👤',
    description: 'Um Espírito Heroico corrompido vaga sem Master. Derrote-o antes que ele ache um.',
    difficulty: 4, durationMinutes: 240, minLevel: 6,
    statWeights: { strength: 1, npRank: 1, endurance: 0.5 },
    classBonus: { saber: 0.1, lancer: 0.1, berserker: 0.05 },
    rewards: {
      xp: 280, coins: 450, bondXp: 180, spiritOrigin: 30,
      drops: [{ item: 'incenso-vinculo-raro', chance: 0.15 }, { item: '@random_catalyst', chance: 0.3 }],
    },
  },
  {
    slug: 'cerco-castelo', name: 'Defender o Castelo da Floresta', emoji: '🏰',
    description: 'Um cerco dura a noite inteira. Resista até o amanhecer.',
    difficulty: 5, durationMinutes: 480, minLevel: 8,
    statWeights: { endurance: 1.5, strength: 0.5 },
    classBonus: { saber: 0.1, berserker: 0.1 },
    traitBonus: { King: 0.05 },
    rewards: {
      xp: 450, coins: 700, bondXp: 300, spiritOrigin: 60,
      drops: [{ item: 'ticket-invocacao', chance: 0.1 }, { item: 'incenso-vinculo-raro', chance: 0.25 }],
    },
  },
  {
    slug: 'dragao-de-mana', name: 'Caçada ao Dragão de Mana', emoji: '🐲',
    description: 'Um fantasma de dragão se formou sobre o porto. Apenas os mais fortes voltam.',
    difficulty: 5, durationMinutes: 480, minLevel: 10,
    statWeights: { strength: 1, npRank: 1, luck: 0.5 },
    classBonus: { archer: 0.1, lancer: 0.05 },
    traitBonus: { Dragon: 0.15, Divine: 0.05 },
    rewards: {
      xp: 500, coins: 800, bondXp: 320, spiritOrigin: 80,
      drops: [{ item: 'ticket-invocacao', chance: 0.15 }, { item: 'escama-dragao', chance: 0.5 }],
    },
  },
];
