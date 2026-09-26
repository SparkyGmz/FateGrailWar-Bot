/**
 * Cálculo de pesos do summon — funções puras, sem banco, fáceis de testar.
 *
 * peso final = base × destaque do banner × catalisador
 *   base       = weight_override do pool → summon_weight do Servant → peso da raridade
 *   destaque   = rateModifiers.featuredMultiplier (se o Servant for featured)
 *   catalisador= maior multiplicador entre os efeitos que casam (limitado por config)
 */
export type CatalystTarget = 'servant' | 'trait' | 'origin' | 'region' | 'class';

export interface CatalystEffect {
  target: CatalystTarget;
  value: string;
  multiplier: number;
}

export interface WeightableServant {
  id: number;
  slug: string;
  name: string;
  classId: string;
  rarity: number;
  origin: string;
  region: string;
  traits: string[];
  summonWeight: number | null;
}

export interface PoolCandidate<S extends WeightableServant = WeightableServant> {
  servant: S;
  featured: boolean;
  weightOverride: number | null;
}

export interface RateModifiers {
  featuredMultiplier?: number;
  /** multiplicador extra por raridade, ex.: { "5": 1.5 } */
  rarityMultiplier?: Record<string, number>;
}

export interface WeightOptions {
  rarityBaseWeight: Record<number, number>;
  defaultFeaturedMultiplier: number;
  catalystMaxMultiplier: number;
}

export interface WeightedEntry<S extends WeightableServant = WeightableServant> {
  servant: S;
  featured: boolean;
  weight: number;
  catalystMultiplier: number;
  probability: number;
}

function norm(s: string): string {
  return s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toLowerCase();
}

export function effectMatches(effect: CatalystEffect, s: WeightableServant): boolean {
  const v = norm(effect.value);
  switch (effect.target) {
    case 'servant':
      return norm(s.slug) === v;
    case 'trait':
      return s.traits.some((t) => norm(t) === v);
    case 'origin':
      return norm(s.origin) === v;
    case 'region':
      return norm(s.region) === v;
    case 'class':
      return norm(s.classId) === v;
    default:
      return false;
  }
}

export function catalystMultiplierFor(s: WeightableServant, effects: readonly CatalystEffect[], cap: number): number {
  let best = 1;
  for (const e of effects) {
    if (e.multiplier > best && effectMatches(e, s)) best = e.multiplier;
  }
  return Math.min(best, cap);
}

export function computeWeights<S extends WeightableServant>(
  candidates: readonly PoolCandidate<S>[],
  modifiers: RateModifiers,
  effects: readonly CatalystEffect[],
  opts: WeightOptions,
): WeightedEntry<S>[] {
  const featuredMult = modifiers.featuredMultiplier ?? opts.defaultFeaturedMultiplier;

  const raw = candidates.map((c) => {
    const base = c.weightOverride ?? c.servant.summonWeight ?? opts.rarityBaseWeight[c.servant.rarity] ?? 1;
    const rarityMult = modifiers.rarityMultiplier?.[String(c.servant.rarity)] ?? 1;
    const catMult = catalystMultiplierFor(c.servant, effects, opts.catalystMaxMultiplier);
    const weight = Math.max(0, base * rarityMult * (c.featured ? featuredMult : 1) * catMult);
    return { servant: c.servant, featured: c.featured, weight, catalystMultiplier: catMult };
  });

  const total = raw.reduce((s, e) => s + e.weight, 0);
  return raw.map((e) => ({ ...e, probability: total > 0 ? e.weight / total : 0 }));
}

/** Servants que o catalisador realmente afeta dentro do pool */
export function resonatingServants<S extends WeightableServant>(
  candidates: readonly PoolCandidate<S>[],
  effects: readonly CatalystEffect[],
): S[] {
  return candidates.filter((c) => effects.some((e) => e.multiplier > 1 && effectMatches(e, c.servant))).map((c) => c.servant);
}

/** Lê com segurança `item.data.effects` vindo do banco (JSON) */
export function parseCatalystEffects(data: unknown): CatalystEffect[] {
  if (!data || typeof data !== 'object') return [];
  const effects = (data as { effects?: unknown }).effects;
  if (!Array.isArray(effects)) return [];
  const targets: CatalystTarget[] = ['servant', 'trait', 'origin', 'region', 'class'];
  return effects.filter(
    (e): e is CatalystEffect =>
      !!e &&
      typeof e === 'object' &&
      targets.includes((e as CatalystEffect).target) &&
      typeof (e as CatalystEffect).value === 'string' &&
      typeof (e as CatalystEffect).multiplier === 'number',
  );
}

export function parseRateModifiers(data: unknown): RateModifiers {
  if (!data || typeof data !== 'object') return {};
  const d = data as Record<string, unknown>;
  const out: RateModifiers = {};
  if (typeof d.featuredMultiplier === 'number') out.featuredMultiplier = d.featuredMultiplier;
  if (d.rarityMultiplier && typeof d.rarityMultiplier === 'object') {
    out.rarityMultiplier = d.rarityMultiplier as Record<string, number>;
  }
  return out;
}
