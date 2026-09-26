import { describe, expect, it } from 'vitest';
import { applyBondXp } from '../src/modules/bond/bond.logic';
import { computeSuccess, parseRules, resolveRewards, rollOutcome, type ServantForMission } from '../src/modules/missions/mission.logic';
import { missions } from '../src/content/missions';
import { items } from '../src/content/items';
import { shopOffers } from '../src/content/shop';
import { bondRewards } from '../src/content/bond-rewards';
import { servants } from '../src/content/servants';

const base: ServantForMission = {
  classId: 'saber', traits: [], strength: 'C', endurance: 'C', agility: 'C', mana: 'C', luck: 'C', npRank: 'C',
};
const rules = (difficulty: number, extra: Partial<ReturnType<typeof parseRules>> = {}) =>
  ({ difficulty, statWeights: { strength: 1 }, classBonus: {}, traitBonus: {}, ...extra });

describe('chance de sucesso', () => {
  it('parâmetros mais altos aumentam a chance', () => {
    const weak = computeSuccess({ ...base, strength: 'E' }, 0, rules(3)).chance;
    const strong = computeSuccess({ ...base, strength: 'A+' }, 0, rules(3)).chance;
    expect(strong).toBeGreaterThan(weak);
  });

  it('dificuldade maior reduz a chance', () => {
    expect(computeSuccess(base, 0, rules(5)).chance).toBeLessThan(computeSuccess(base, 0, rules(1)).chance);
  });

  it('aplica bônus de classe, trait (o maior) e bond', () => {
    const r = rules(3, { classBonus: { saber: 0.1 }, traitBonus: { Dragon: 0.05, King: 0.08 } });
    const b = computeSuccess({ ...base, traits: ['Dragon', 'King'] }, 5, r);
    expect(b.classBonus).toBe(0.1);
    expect(b.traitBonus).toBe(0.08);
    expect(b.bondBonus).toBeCloseTo(0.05);
  });

  it('fica sempre entre 5% e 95%', () => {
    const god = { ...base, strength: 'EX' };
    expect(computeSuccess(god, 10, rules(1, { classBonus: { saber: 1 } })).chance).toBe(0.95);
    expect(computeSuccess({ ...base, strength: 'E' }, 0, rules(5)).chance).toBeGreaterThanOrEqual(0.05);
  });

  it('parâmetros "?" ou "—" contam como zero sem quebrar', () => {
    expect(computeSuccess({ ...base, npRank: '—' }, 0, { ...rules(2), statWeights: { npRank: 1 } }).chance).toBeGreaterThanOrEqual(0.05);
  });
});

describe('resultado e recompensas', () => {
  it('rollOutcome respeita as faixas', () => {
    expect(rollOutcome(0.8, () => 0.1)).toBe('GREAT_SUCCESS'); // < 0.8 × 0.25
    expect(rollOutcome(0.8, () => 0.5)).toBe('SUCCESS');
    expect(rollOutcome(0.8, () => 0.9)).toBe('FAILURE');
  });

  it('grande sucesso multiplica e falha dá só parte do XP/Bond', () => {
    const rw = { xp: 100, coins: 200, bondXp: 50, spiritOrigin: 10, drops: [{ item: 'x', chance: 1 }] };
    const great = resolveRewards(rw, 'GREAT_SUCCESS', () => 0);
    expect(great).toMatchObject({ xp: 150, coins: 300, bondXp: 75, spiritOrigin: 15 });
    expect(great.drops).toHaveLength(1);
    const fail = resolveRewards(rw, 'FAILURE', () => 0);
    expect(fail).toMatchObject({ xp: 30, coins: 0, bondXp: 15, spiritOrigin: 0, drops: [] });
  });
});

describe('bond', () => {
  it('sobe vários níveis de uma vez e guarda o excedente', () => {
    // 0→1 = 100, 1→2 = 200
    expect(applyBondXp(0, 0, 350)).toEqual({ level: 2, xp: 50, reached: [1, 2] });
  });

  it('para no nível máximo', () => {
    expect(applyBondXp(9, 0, 99999)).toEqual({ level: 10, xp: 0, reached: [10] });
    expect(applyBondXp(10, 0, 500)).toEqual({ level: 10, xp: 0, reached: [] });
  });
});

describe('conteúdo da V0.2', () => {
  const itemSlugs = new Set(items.map((i) => i.slug));
  const servantSlugs = new Set(servants.map((s) => s.slug));

  it('missões referenciam itens existentes e têm slugs únicos', () => {
    expect(new Set(missions.map((m) => m.slug)).size).toBe(missions.length);
    for (const m of missions) for (const d of m.rewards.drops ?? []) {
      if (d.item !== '@random_catalyst') expect(itemSlugs.has(d.item), `${m.slug}:${d.item}`).toBe(true);
    }
  });

  it('toda missão é possível e nenhuma é garantida para um Servant médio', () => {
    for (const m of missions) {
      const c = computeSuccess(base, 0, parseRules(m)).chance;
      expect(c, m.slug).toBeGreaterThan(0.05);
      expect(c, m.slug).toBeLessThan(0.95);
    }
  });

  it('loja e bond referenciam itens/Servants existentes', () => {
    for (const o of shopOffers) expect(itemSlugs.has(o.item), o.slug).toBe(true);
    for (const b of bondRewards) {
      if (b.item) expect(itemSlugs.has(b.item), b.item).toBe(true);
      if (b.servant) expect(servantSlugs.has(b.servant), b.servant).toBe(true);
    }
  });
});
