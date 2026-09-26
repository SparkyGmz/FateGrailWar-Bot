/**
 * Biblioteca de Skills (data-driven). Os efeitos usam o mesmo motor dos
 * Noble Phantasms (modules/battle/combat.logic.ts → Effect).
 *
 * Cada Servant recebe as Skills padrão da sua classe (classSkills), a não ser
 * que tenha uma lista própria em servantSkills.
 */
import type { Effect } from '../modules/battle/combat.logic';

export interface SkillSeed {
  slug: string;
  name: string;
  description: string;
  cooldown: number;
  manaCost: number;
  targetType: 'self' | 'enemy';
  effects: Effect[];
}

export const skills: SkillSeed[] = [
  { slug: 'mana-burst', name: 'Mana Burst', description: 'Envolve as armas em mana, aumentando o ataque.', cooldown: 3, manaCost: 20, targetType: 'self',
    effects: [{ type: 'buff', stat: 'attack', value: 0.4, turns: 2 }] },
  { slug: 'instinct', name: 'Instinct', description: 'Sexto sentido de combate: críticos e esquiva.', cooldown: 3, manaCost: 10, targetType: 'self',
    effects: [{ type: 'buff', stat: 'crit', value: 0.3, turns: 2 }, { type: 'buff', stat: 'evade', value: 0.15, turns: 1 }] },
  { slug: 'charisma', name: 'Charisma', description: 'Presença de um rei, inspirando força.', cooldown: 4, manaCost: 15, targetType: 'self',
    effects: [{ type: 'buff', stat: 'attack', value: 0.25, turns: 3 }] },
  { slug: 'battle-continuation', name: 'Battle Continuation', description: 'Recusa-se a cair: sobrevive a um golpe fatal.', cooldown: 8, manaCost: 20, targetType: 'self',
    effects: [{ type: 'buff', stat: 'guts', value: 0.2, turns: 99 }] },
  { slug: 'eye-of-mind-true', name: 'Eye of the Mind (True)', description: 'Leitura de combate refinada por experiência.', cooldown: 4, manaCost: 15, targetType: 'self',
    effects: [{ type: 'buff', stat: 'evade', value: 0.25, turns: 2 }] },
  { slug: 'eye-of-mind-false', name: 'Eye of the Mind (False)', description: 'Intuição quase sobrenatural para o perigo.', cooldown: 3, manaCost: 10, targetType: 'self',
    effects: [{ type: 'buff', stat: 'evade', value: 0.3, turns: 1 }, { type: 'buff', stat: 'crit', value: 0.2, turns: 1 }] },
  { slug: 'clairvoyance', name: 'Clairvoyance', description: 'Visão de longo alcance que expõe o inimigo.', cooldown: 4, manaCost: 15, targetType: 'enemy',
    effects: [{ type: 'buff', stat: 'crit', value: 0.3, turns: 3 }, { type: 'information', levels: 1 }] },
  { slug: 'presence-concealment', name: 'Presence Concealment', description: 'Some por um instante e ataca das sombras.', cooldown: 3, manaCost: 10, targetType: 'self',
    effects: [{ type: 'buff', stat: 'evade', value: 0.5, turns: 1 }, { type: 'buff', stat: 'crit', value: 0.3, turns: 1 }] },
  { slug: 'territory-creation', name: 'Territory Creation', description: 'Transforma o terreno em uma oficina mágica.', cooldown: 5, manaCost: 0, targetType: 'self',
    effects: [{ type: 'buff', stat: 'defense', value: 0.3, turns: 3 }, { type: 'mana', amount: 30 }] },
  { slug: 'item-construction', name: 'Item Construction', description: 'Cria poções e artefatos na hora.', cooldown: 4, manaCost: 10, targetType: 'self',
    effects: [{ type: 'heal', percent: 0.2 }, { type: 'mana', amount: 20 }] },
  { slug: 'madness-enhancement', name: 'Madness Enhancement', description: 'Troca a razão por força bruta.', cooldown: 5, manaCost: 0, targetType: 'self',
    effects: [{ type: 'buff', stat: 'attack', value: 0.5, turns: 3 }, { type: 'buff', stat: 'defense', value: -0.2, turns: 3 }] },
  { slug: 'monstrous-strength', name: 'Monstrous Strength', description: 'Força física que ultrapassa o limite.', cooldown: 3, manaCost: 15, targetType: 'self',
    effects: [{ type: 'buff', stat: 'attack', value: 0.6, turns: 1 }] },
  { slug: 'protection-from-arrows', name: 'Protection from Arrows', description: 'Desvia de projéteis e golpes à distância.', cooldown: 4, manaCost: 10, targetType: 'self',
    effects: [{ type: 'buff', stat: 'evade', value: 0.4, turns: 2 }] },
  { slug: 'disengage', name: 'Disengage', description: 'Recua, se recompõe e limpa efeitos negativos.', cooldown: 4, manaCost: 10, targetType: 'self',
    effects: [{ type: 'cleanse' }, { type: 'heal', percent: 0.1 }] },
  { slug: 'golden-rule', name: 'Golden Rule', description: 'Fortuna ilimitada — inclusive de mana.', cooldown: 5, manaCost: 0, targetType: 'self',
    effects: [{ type: 'mana', amount: 40 }] },
  { slug: 'divinity', name: 'Divinity', description: 'Sangue divino que fortalece corpo e golpe.', cooldown: 5, manaCost: 15, targetType: 'self',
    effects: [{ type: 'buff', stat: 'attack', value: 0.2, turns: 3 }, { type: 'buff', stat: 'defense', value: 0.1, turns: 3 }] },
  { slug: 'high-speed-incantation', name: 'High-Speed Incantation', description: 'Magia instantânea que abre a guarda inimiga.', cooldown: 4, manaCost: 20, targetType: 'enemy',
    effects: [{ type: 'debuff', stat: 'defense', value: 0.3, turns: 2 }, { type: 'damage', power: 1.0 }] },
  { slug: 'military-tactics', name: 'Military Tactics', description: 'Estratégia que enfraquece a ofensiva inimiga.', cooldown: 4, manaCost: 15, targetType: 'enemy',
    effects: [{ type: 'debuff', stat: 'attack', value: 0.3, turns: 2 }] },
  { slug: 'bravery', name: 'Bravery', description: 'Coragem que ignora medo e ilusões.', cooldown: 4, manaCost: 15, targetType: 'self',
    effects: [{ type: 'cleanse' }, { type: 'buff', stat: 'attack', value: 0.3, turns: 2 }] },
  { slug: 'riding', name: 'Riding', description: 'Domínio de qualquer montaria.', cooldown: 3, manaCost: 10, targetType: 'self',
    effects: [{ type: 'buff', stat: 'evade', value: 0.25, turns: 2 }] },
  { slug: 'self-modification', name: 'Self-Modification', description: 'Enxerta partes de outros no próprio corpo.', cooldown: 4, manaCost: 15, targetType: 'self',
    effects: [{ type: 'buff', stat: 'crit', value: 0.4, turns: 2 }] },
  { slug: 'poison-crafting', name: 'Poison Crafting', description: 'Venenos que corroem a resistência.', cooldown: 4, manaCost: 15, targetType: 'enemy',
    effects: [{ type: 'debuff', stat: 'defense', value: 0.25, turns: 3 }] },
  { slug: 'shukuchi', name: 'Shukuchi', description: 'Técnica que encurta a distância num piscar de olhos.', cooldown: 3, manaCost: 10, targetType: 'self',
    effects: [{ type: 'buff', stat: 'evade', value: 0.4, turns: 1 }, { type: 'buff', stat: 'crit', value: 0.5, turns: 1 }] },
  { slug: 'charm', name: 'Charm', description: 'Um encanto que paralisa o adversário.', cooldown: 6, manaCost: 25, targetType: 'enemy',
    effects: [{ type: 'stun', turns: 1, chance: 0.6 }] },
  { slug: 'god-hand', name: 'God Hand', description: 'Um corpo abençoado que desafia a morte.', cooldown: 10, manaCost: 0, targetType: 'self',
    effects: [{ type: 'buff', stat: 'guts', value: 0.3, turns: 99 }] },
  { slug: 'mental-pollution', name: 'Mental Pollution', description: 'Uma mente distorcida demais para ser abalada.', cooldown: 5, manaCost: 10, targetType: 'self',
    effects: [{ type: 'cleanse' }, { type: 'buff', stat: 'defense', value: 0.2, turns: 3 }] },
];

export const classSkills: Record<string, [string, string, string]> = {
  saber: ['mana-burst', 'instinct', 'battle-continuation'],
  archer: ['clairvoyance', 'eye-of-mind-false', 'protection-from-arrows'],
  lancer: ['protection-from-arrows', 'battle-continuation', 'bravery'],
  rider: ['riding', 'charisma', 'disengage'],
  caster: ['territory-creation', 'item-construction', 'high-speed-incantation'],
  assassin: ['presence-concealment', 'poison-crafting', 'self-modification'],
  berserker: ['madness-enhancement', 'monstrous-strength', 'battle-continuation'],
};

/** Listas próprias (sobrescrevem a da classe) */
export const servantSkills: Record<string, string[]> = {
  'artoria-pendragon': ['mana-burst', 'instinct', 'charisma'],
  'okita-souji': ['shukuchi', 'instinct', 'eye-of-mind-false'],
  'miyamoto-musashi': ['eye-of-mind-true', 'instinct', 'bravery'],
  gilgamesh: ['golden-rule', 'charisma', 'clairvoyance'],
  arjuna: ['divinity', 'clairvoyance', 'mana-burst'],
  karna: ['divinity', 'mana-burst', 'eye-of-mind-true'],
  'robin-hood': ['poison-crafting', 'presence-concealment', 'clairvoyance'],
  'diarmuid-ua-duibhne': ['charm', 'eye-of-mind-true', 'battle-continuation'],
  iskandar: ['charisma', 'military-tactics', 'riding'],
  'zhuge-liang-waver': ['military-tactics', 'clairvoyance', 'disengage'],
  'tamamo-no-mae': ['territory-creation', 'charm', 'item-construction'],
  merlin: ['charisma', 'item-construction', 'high-speed-incantation'],
  semiramis: ['poison-crafting', 'territory-creation', 'charisma'],
  heracles: ['madness-enhancement', 'monstrous-strength', 'god-hand'],
  'lancelot-berserker': ['madness-enhancement', 'eye-of-mind-true', 'monstrous-strength'],
  kiyohime: ['madness-enhancement', 'mental-pollution', 'charm'],
  'jack-the-ripper': ['presence-concealment', 'self-modification', 'mental-pollution'],
};
