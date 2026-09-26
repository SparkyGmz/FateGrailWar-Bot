import { describe, expect, it } from 'vitest';
import {
  catalystMultiplierFor,
  computeWeights,
  parseCatalystEffects,
  resonatingServants,
  type PoolCandidate,
  type WeightableServant,
} from '../src/modules/summon/summon.weights';
import { weightedPick } from '../src/shared/random';

const opts = { rarityBaseWeight: { 1: 40, 2: 30, 3: 20, 4: 8, 5: 3 }, defaultFeaturedMultiplier: 3, catalystMaxMultiplier: 5 };

function sv(id: number, slug: string, rarity: number, extra: Partial<WeightableServant> = {}): WeightableServant {
  return { id, slug, name: slug, classId: 'saber', rarity, origin: '', region: '', traits: [], summonWeight: null, ...extra };
}

const artoria = sv(1, 'artoria-pendragon', 5, { traits: ['Dragon', 'Round Table'], origin: 'Lenda Arturiana' });
const gawain = sv(2, 'gawain', 4, { traits: ['Round Table'], origin: 'Lenda Arturiana' });
const kojirou = sv(3, 'sasaki-kojirou', 1, { region: 'Japão', classId: 'assassin' });

const pool: PoolCandidate[] = [
  { servant: artoria, featured: false, weightOverride: null },
  { servant: gawain, featured: false, weightOverride: null },
  { servant: kojirou, featured: false, weightOverride: null },
];

describe('computeWeights', () => {
  it('usa o peso por raridade e normaliza probabilidades', () => {
    const w = computeWeights(pool, {}, [], opts);
    expect(w.map((e) => e.weight)).toEqual([3, 8, 40]);
    expect(w.reduce((s, e) => s + e.probability, 0)).toBeCloseTo(1);
  });

  it('respeita summonWeight e weightOverride', () => {
    const w = computeWeights(
      [
        { servant: { ...artoria, summonWeight: 10 }, featured: false, weightOverride: null },
        { servant: gawain, featured: false, weightOverride: 99 },
      ],
      {},
      [],
      opts,
    );
    expect(w.map((e) => e.weight)).toEqual([10, 99]);
  });

  it('aplica multiplicador de destaque do banner', () => {
    const w = computeWeights([{ ...pool[0]!, featured: true }, pool[1]!], { featuredMultiplier: 4 }, [], opts);
    expect(w[0]!.weight).toBe(12);
  });

  it('catalisador aumenta a chance mas não garante', () => {
    const effects = parseCatalystEffects({ effects: [{ target: 'servant', value: 'artoria-pendragon', multiplier: 4 }] });
    const before = computeWeights(pool, {}, [], opts)[0]!.probability;
    const after = computeWeights(pool, {}, effects, opts)[0]!.probability;
    expect(after).toBeGreaterThan(before);
    expect(after).toBeLessThan(1);
  });

  it('usa o maior multiplicador quando vários efeitos casam e respeita o teto', () => {
    const effects = [
      { target: 'trait' as const, value: 'Round Table', multiplier: 2 },
      { target: 'servant' as const, value: 'artoria-pendragon', multiplier: 50 },
    ];
    expect(catalystMultiplierFor(artoria, effects, 5)).toBe(5);
    expect(catalystMultiplierFor(gawain, effects, 5)).toBe(2);
    expect(catalystMultiplierFor(kojirou, effects, 5)).toBe(1);
  });

  it('compara origem/região sem diferenciar acentos e maiúsculas', () => {
    expect(resonatingServants(pool, [{ target: 'region', value: 'japao', multiplier: 2 }])).toEqual([kojirou]);
    expect(resonatingServants(pool, [{ target: 'origin', value: 'LENDA ARTURIANA', multiplier: 2 }])).toHaveLength(2);
  });

  it('ignora efeitos malformados vindos do banco', () => {
    expect(parseCatalystEffects({ effects: [{ target: 'xyz', value: 'a', multiplier: 2 }, null, 3] })).toEqual([]);
    expect(parseCatalystEffects(null)).toEqual([]);
  });
});

describe('weightedPick', () => {
  it('distribui proporcionalmente ao peso', () => {
    let seed = 1;
    const rng = () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;
    const counts = { a: 0, b: 0 };
    for (let i = 0; i < 20000; i++) counts[weightedPick([{ item: 'a' as const, weight: 1 }, { item: 'b' as const, weight: 3 }], rng)]++;
    expect(counts.b / counts.a).toBeGreaterThan(2.7);
    expect(counts.b / counts.a).toBeLessThan(3.3);
  });

  it('nunca escolhe peso zero', () => {
    for (let i = 0; i < 1000; i++) {
      expect(weightedPick([{ item: 'x', weight: 0 }, { item: 'y', weight: 1 }])).toBe('y');
    }
  });
});
