import { describe, expect, it } from 'vitest';
import {
  applyDamage,
  buffTotal,
  critChance,
  markNpUsed,
  npCooldownLeft,
  classAffinity,
  computeDamage,
  emptyState,
  endTurn,
  fatigueMultiplier,
  parseEffects,
  resolveEffects,
  retreatChance,
  type Combatant,
} from '../src/modules/battle/combat.logic';
import { skills, classSkills, servantSkills } from '../src/content/skills';
import { npOverrides } from '../src/content/np-effects';
import { servants } from '../src/content/servants';

const mods = { damage: 1, defense: 1, mpCostMultiplier: 1, retreatChance: 0.5, manaRegen: 1, ambushBonus: 1 };
function fighter(over: Partial<Combatant> = {}): Combatant {
  return {
    participantId: Math.floor(Math.random() * 1e6), label: 'X', classId: 'saber',
    strength: 'B', endurance: 'B', agility: 'B', luck: 'C',
    hp: 2000, maxHp: 2000, mp: 100, maxMp: 100, trainingStacks: 0, mods: { ...mods }, state: emptyState(), ...over,
  };
}
const fixed = (v: number) => () => v;

describe('dano', () => {
  it('vantagem de classe e Berserker', () => {
    expect(classAffinity('saber', 'lancer')).toBeGreaterThan(1);
    expect(classAffinity('lancer', 'saber')).toBeLessThan(1);
    expect(classAffinity('saber', 'rider')).toBe(1);
    expect(classAffinity('saber', 'berserker')).toBeGreaterThan(1);
  });

  it('mais STR causa mais dano; mais END recebe menos', () => {
    const a = computeDamage(fighter({ strength: 'A' }), fighter(), 1, {}, fixed(0.5)).damage;
    const b = computeDamage(fighter({ strength: 'D' }), fighter(), 1, {}, fixed(0.5)).damage;
    expect(a).toBeGreaterThan(b);
    const tank = computeDamage(fighter(), fighter({ endurance: 'A+' }), 1, {}, fixed(0.5)).damage;
    const frail = computeDamage(fighter(), fighter({ endurance: 'E' }), 1, {}, fixed(0.5)).damage;
    expect(frail).toBeGreaterThan(tank);
  });

  it('defender reduz o dano pela metade', () => {
    const normal = computeDamage(fighter(), fighter(), 1, {}, fixed(0.5)).damage;
    const d = fighter();
    d.state.defending = true;
    expect(computeDamage(fighter(), d, 1, {}, fixed(0.5)).damage).toBeCloseTo(normal / 2, -1);
  });

  it('ataques podem ser esquivados, Noble Phantasms não', () => {
    const fast = fighter({ agility: 'A+' });
    fast.state.buffs.push({ stat: 'evade', value: 0.4, turns: 2, source: 't' });
    expect(computeDamage(fighter({ agility: 'E' }), fast, 1, {}, fixed(0.01)).evaded).toBe(true);
    expect(computeDamage(fighter({ agility: 'E' }), fast, 1, { unavoidable: true }, fixed(0.01)).evaded).toBe(false);
  });

  it('ignorar defesa aumenta o dano', () => {
    const plain = computeDamage(fighter(), fighter({ endurance: 'A' }), 1, {}, fixed(0.5)).damage;
    const pierce = computeDamage(fighter(), fighter({ endurance: 'A' }), 1, { ignoreDefense: 1 }, fixed(0.5)).damage;
    expect(pierce).toBeGreaterThan(plain);
  });

  it('batalhas longas ficam mais letais', () => {
    expect(fatigueMultiplier(10)).toBe(1);
    expect(fatigueMultiplier(20)).toBeCloseTo(1.5);
  });
});

describe('efeitos', () => {
  it('Guts salva de um golpe fatal uma única vez', () => {
    const d = fighter({ hp: 10 });
    d.state.buffs.push({ stat: 'guts', value: 0.3, turns: 99, source: 't' });
    expect(applyDamage(d, 500)).toEqual({ died: false, gutsTriggered: true });
    expect(d.hp).toBe(600);
    expect(applyDamage(d, 5000).died).toBe(true);
    expect(d.hp).toBe(0);
  });

  it('buff, debuff, cura, mana, dispel e cleanse', () => {
    const a = fighter({ hp: 1000, mp: 10 });
    const e = fighter();
    resolveEffects(a, e, [
      { type: 'buff', stat: 'attack', value: 0.3, turns: 2 },
      { type: 'debuff', stat: 'defense', value: 0.2, turns: 2 },
      { type: 'heal', percent: 0.1 },
      { type: 'mana', amount: 30 },
    ], { source: 't' }, fixed(0.5));
    expect(a.hp).toBe(1200);
    expect(a.mp).toBe(40);
    expect(e.state.buffs[0]!.value).toBe(-0.2);
    e.state.buffs.push({ stat: 'attack', value: 0.5, turns: 3, source: 'x' });
    resolveEffects(a, e, [{ type: 'dispel' }], { source: 't' });
    expect(e.state.buffs.every((b) => b.value < 0)).toBe(true);
  });

  it('atordoamento respeita a chance', () => {
    const e = fighter();
    resolveEffects(fighter(), e, [{ type: 'stun', turns: 1, chance: 0.5 }], { source: 't' }, fixed(0.9));
    expect(e.state.stunned).toBe(0);
    resolveEffects(fighter(), e, [{ type: 'stun', turns: 1, chance: 0.5 }], { source: 't' }, fixed(0.1));
    expect(e.state.stunned).toBe(1);
  });

  it('fim de turno expira buffs, reduz recarga e regenera MP (Guts permanece)', () => {
    const a = fighter({ mp: 50 });
    a.state.buffs.push({ stat: 'attack', value: 0.3, turns: 1, source: 't' }, { stat: 'guts', value: 0.2, turns: 99, source: 'g' });
    a.state.cooldowns['mana-burst'] = 1;
    endTurn(a);
    expect(a.state.buffs.map((b) => b.stat)).toEqual(['guts']);
    expect(a.state.cooldowns['mana-burst']).toBeUndefined();
    expect(a.mp).toBeGreaterThan(50);
  });

  it('Berserker recua pior que Rider', () => {
    const e = fighter();
    expect(retreatChance(fighter({ mods: { ...mods, retreatChance: 0.25 } }), e)).toBeLessThan(retreatChance(fighter({ mods: { ...mods, retreatChance: 0.8 } }), e));
  });
});

describe('conteúdo de combate', () => {
  const slugs = new Set(skills.map((k) => k.slug));
  it('todas as skills referenciadas existem e têm efeitos válidos', () => {
    for (const list of [...Object.values(classSkills), ...Object.values(servantSkills)]) {
      for (const k of list) expect(slugs.has(k), k).toBe(true);
    }
    for (const k of skills) expect(parseEffects(k.effects)).toHaveLength(k.effects.length);
  });
  it('overrides de NP apontam para Servants existentes', () => {
    const sv = new Set(servants.map((s) => s.slug));
    for (const k of Object.keys(npOverrides)) expect(sv.has(k), k).toBe(true);
  });
});

describe('correções: crítico, buffs e NP', () => {
  it('crítico nunca passa do teto, mesmo com vários buffs', () => {
    const a = fighter({ luck: 'EX' });
    a.state.buffs.push(
      { stat: 'crit', value: 0.3, turns: 3, source: 'skill:instinct' },
      { stat: 'crit', value: 0.3, turns: 3, source: 'skill:clairvoyance' },
      { stat: 'crit', value: 0.4, turns: 3, source: 'skill:self-modification' },
    );
    expect(critChance(a)).toBe(0.5);
  });

  it('a mesma Skill renova o buff em vez de acumular', () => {
    const a = fighter();
    const eff = [{ type: 'buff' as const, stat: 'attack' as const, value: 0.4, turns: 2 }];
    resolveEffects(a, fighter(), eff, { source: 'skill:mana-burst' });
    resolveEffects(a, fighter(), eff, { source: 'skill:mana-burst' });
    expect(a.state.buffs.filter((b) => b.stat === 'attack')).toHaveLength(1);
  });

  it('buffs de ataque têm teto', () => {
    const a = fighter();
    for (let i = 0; i < 5; i++) a.state.buffs.push({ stat: 'attack', value: 0.6, turns: 3, source: `s${i}` });
    expect(buffTotal(a, 'attack')).toBe(1.0);
  });

  it('NP fica em recarga por 3 turnos próprios', () => {
    const a = fighter();
    markNpUsed(a.state);
    endTurn(a); // fim do turno em que usou
    const waits: number[] = [];
    while (npCooldownLeft(a.state) > 0) {
      waits.push(npCooldownLeft(a.state));
      endTurn(a);
    }
    expect(waits).toEqual([3, 2, 1]);
  });

  it('um NP que devolve mana não permite spam (caso Tamamo)', () => {
    const a = fighter({ mp: 200, maxMp: 200 });
    const tamamoNp = npOverrides['tamamo-no-mae']!;
    let uses = 0;
    for (let turn = 0; turn < 12; turn++) {
      if (npCooldownLeft(a.state) === 0 && a.mp >= 48) {
        a.mp -= 48;
        resolveEffects(a, fighter(), tamamoNp, { source: 'np' });
        markNpUsed(a.state);
        uses++;
      }
      endTurn(a);
    }
    expect(uses).toBeLessThanOrEqual(3);
  });
});
