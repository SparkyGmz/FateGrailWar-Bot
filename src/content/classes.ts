/**
 * Definição das classes. Tudo aqui é conteúdo/balanceamento:
 * alterar números NÃO exige mudar código dos sistemas.
 *
 * `modifiers` é lido pelos serviços das próximas versões:
 *  - damage / defense / mpCostMultiplier → BattleService (V0.4)
 *  - movement / investigation / stealth → mapa e exploração (V0.3)
 *  - retreatChance → combate (fuga)
 *  - manaRegen / canCreateTerritory → Caster
 */
export interface ClassSeed {
  id: string;
  name: string;
  emoji: string;
  color: number;
  sortOrder: number;
  description: string;
  features: string[];
  modifiers: Record<string, number | boolean>;
}

export const classes: ClassSeed[] = [
  {
    id: 'saber',
    name: 'Saber',
    emoji: '⚔️',
    color: 0x3b82f6,
    sortOrder: 1,
    description: 'Cavaleiros da espada. Resistentes e fortes no combate direto.',
    features: ['Alta resistência', 'Especialista em combate direto', 'Resistência a magia elevada'],
    modifiers: { damage: 1.0, defense: 1.1, magicResistance: 1.2, movement: 1, investigation: 1.0, stealth: 0.9, retreatChance: 0.5, mpCostMultiplier: 1.0 },
  },
  {
    id: 'archer',
    name: 'Archer',
    emoji: '🏹',
    color: 0xef4444,
    sortOrder: 2,
    description: 'Atiradores de longo alcance com grande independência de ação.',
    features: ['Ataques à distância', 'Ação Independente (menos dependência do Master)', 'Visão aprimorada'],
    modifiers: { damage: 0.95, defense: 1.0, magicResistance: 1.0, movement: 1, investigation: 1.15, stealth: 1.0, retreatChance: 0.6, mpCostMultiplier: 0.9 },
  },
  {
    id: 'lancer',
    name: 'Lancer',
    emoji: '🔱',
    color: 0x3b82f6,
    sortOrder: 3,
    description: 'Guerreiros velozes, especialistas em confronto e sobrevivência.',
    features: ['Alta agilidade', 'Bônus para escapar de combates', 'Iniciativa em batalha'],
    modifiers: { damage: 1.05, defense: 1.0, magicResistance: 1.0, movement: 1, investigation: 1.0, stealth: 1.0, retreatChance: 0.75, mpCostMultiplier: 1.0 },
  },
  {
    id: 'rider',
    name: 'Rider',
    emoji: '🐎',
    color: 0xa855f7,
    sortOrder: 4,
    description: 'Cavaleiros de montarias lendárias. Dominam o deslocamento pelo mapa.',
    features: ['Movimentação maior no mapa', 'Montarias e veículos lendários', 'Noble Phantasms de área'],
    modifiers: { damage: 1.0, defense: 0.95, magicResistance: 1.0, movement: 2, investigation: 1.0, stealth: 0.9, retreatChance: 0.8, mpCostMultiplier: 1.0 },
  },
  {
    id: 'caster',
    name: 'Caster',
    emoji: '🔮',
    color: 0x22c55e,
    sortOrder: 5,
    description: 'Magos. Frágeis no corpo a corpo, mas mestres em preparação.',
    features: ['Criação de Territory', 'Regeneração de mana', 'Criação de buffs'],
    modifiers: { damage: 0.9, defense: 0.85, magicResistance: 1.0, movement: 1, investigation: 1.1, stealth: 1.0, retreatChance: 0.5, mpCostMultiplier: 0.8, manaRegen: 1.5, canCreateTerritory: true },
  },
  {
    id: 'assassin',
    name: 'Assassin',
    emoji: '🗡️',
    color: 0x6b7280,
    sortOrder: 6,
    description: 'Especialistas em infiltração, informação e ataques surpresa.',
    features: ['Bônus em investigação', 'Maior chance de esconder identidade', 'Ataques surpresa'],
    modifiers: { damage: 0.9, defense: 0.9, magicResistance: 0.9, movement: 1, investigation: 1.4, stealth: 1.5, retreatChance: 0.85, mpCostMultiplier: 0.9, ambushBonus: 1.5 },
  },
  {
    id: 'berserker',
    name: 'Berserker',
    emoji: '💢',
    color: 0x991b1b,
    sortOrder: 7,
    description: 'Heróis tomados pela loucura. Dano enorme, a um custo alto.',
    features: ['Dano elevado', 'Maior consumo de mana', 'Dificuldade maior para recuar'],
    modifiers: { damage: 1.3, defense: 0.9, magicResistance: 0.9, movement: 1, investigation: 0.6, stealth: 0.6, retreatChance: 0.25, mpCostMultiplier: 1.5 },
  },
];
