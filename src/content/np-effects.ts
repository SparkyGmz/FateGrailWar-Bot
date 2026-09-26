/**
 * Efeitos de Noble Phantasm. Por padrão vêm do TIPO do NP; um Servant pode
 * ter efeitos próprios em `npOverrides`.
 * NPs não podem ser esquivados e revelam o nome do NP ao inimigo.
 */
import type { Effect } from '../modules/battle/combat.logic';

const bigDamage: Effect[] = [{ type: 'damage', power: 3.6, ignoreDefense: 0.5 }];

export const npEffectsByType: Record<string, Effect[]> = {
  'Anti-Unidade': [{ type: 'damage', power: 3.2 }],
  'Anti-Exército': [{ type: 'damage', power: 2.8, ignoreDefense: 0.3 }],
  'Anti-Fortaleza': bigDamage,
  'Anti-Cidade': bigDamage,
  'Anti-Mundo': bigDamage,
  'Anti-Deus': bigDamage,
  'Anti-Purificação': bigDamage,
  'Anti-Magia': [{ type: 'dispel' }, { type: 'damage', power: 2.2 }],
  Barreira: [{ type: 'heal', percent: 0.35 }, { type: 'buff', stat: 'defense', value: 0.4, turns: 3 }],
  Suporte: [{ type: 'buff', stat: 'attack', value: 0.5, turns: 3 }, { type: 'heal', percent: 0.15 }],
};

export const defaultNpEffects: Effect[] = [{ type: 'damage', power: 3.0 }];

export const npOverrides: Record<string, Effect[]> = {
  merlin: [{ type: 'heal', percent: 0.4 }, { type: 'buff', stat: 'attack', value: 0.3, turns: 3 }, { type: 'mana', amount: 30 }],
  'zhuge-liang-waver': [{ type: 'stun', turns: 1 }, { type: 'debuff', stat: 'defense', value: 0.3, turns: 3 }, { type: 'damage', power: 1.5 }],
  'hans-christian-andersen': [{ type: 'buff', stat: 'attack', value: 0.4, turns: 3 }, { type: 'buff', stat: 'crit', value: 0.4, turns: 3 }, { type: 'heal', percent: 0.2 }],
  'jack-the-ripper': [{ type: 'damage', power: 2.8, ignoreDefense: 1 }],
  'medea': [{ type: 'dispel' }, { type: 'debuff', stat: 'defense', value: 0.3, turns: 2 }, { type: 'damage', power: 2.4 }],
  'nero-claudius': [{ type: 'debuff', stat: 'defense', value: 0.3, turns: 2 }, { type: 'damage', power: 2.8 }],
  'first-hassan': [{ type: 'damage', power: 3.4, ignoreDefense: 0.7 }],
  'shuten-douji': [{ type: 'debuff', stat: 'attack', value: 0.3, turns: 2 }, { type: 'damage', power: 2.6 }],
  'medusa': [{ type: 'damage', power: 3.0 }, { type: 'stun', turns: 1, chance: 0.4 }],
  'tamamo-no-mae': [{ type: 'heal', percent: 0.3 }, { type: 'mana', amount: 50 }, { type: 'cleanse' }],
};
