/**
 * Regras puras das missões: chance de sucesso, resultado e recompensas.
 * Sem banco — testável isoladamente.
 */
import { gameConfig } from '../../config/game';
import { randomFloat } from '../../shared/random';
import { rankValue } from '../../shared/ranks';

export type StatKey = 'strength' | 'endurance' | 'agility' | 'mana' | 'luck' | 'npRank';
export const STAT_KEYS: StatKey[] = ['strength', 'endurance', 'agility', 'mana', 'luck', 'npRank'];
export const STAT_LABEL: Record<StatKey, string> = {
  strength: 'STR', endurance: 'END', agility: 'AGI', mana: 'MANA', luck: 'LUCK', npRank: 'NP',
};

export type MissionOutcome = 'GREAT_SUCCESS' | 'SUCCESS' | 'FAILURE';

export interface MissionDrop {
  /** slug do item, ou "@random_catalyst" */
  item: string;
  chance: number;
  quantity?: number;
}

export interface MissionRewards {
  xp?: number;
  coins?: number;
  bondXp?: number;
  spiritOrigin?: number;
  drops?: MissionDrop[];
}

export interface MissionRules {
  difficulty: number;
  statWeights: Partial<Record<StatKey, number>>;
  classBonus: Record<string, number>;
  traitBonus: Record<string, number>;
}

export interface ServantForMission {
  classId: string;
  traits: string[];
  strength: string;
  endurance: string;
  agility: string;
  mana: string;
  luck: string;
  npRank: string;
}

type MissionCfg = typeof gameConfig.missions;

function numberRecord(data: unknown): Record<string, number> {
  if (!data || typeof data !== 'object' || Array.isArray(data)) return {};
  const out: Record<string, number> = {};
  for (const [k, v] of Object.entries(data as Record<string, unknown>)) if (typeof v === 'number') out[k] = v;
  return out;
}

export function parseRules(m: { difficulty: number; statWeights: unknown; classBonus?: unknown; traitBonus?: unknown }): MissionRules {
  const weights = numberRecord(m.statWeights);
  const statWeights: Partial<Record<StatKey, number>> = {};
  for (const k of STAT_KEYS) if (weights[k]) statWeights[k] = weights[k];
  return {
    difficulty: m.difficulty,
    statWeights,
    classBonus: numberRecord(m.classBonus),
    traitBonus: numberRecord(m.traitBonus),
  };
}

export function parseRewards(data: unknown): MissionRewards {
  if (!data || typeof data !== 'object') return {};
  const d = data as Record<string, unknown>;
  const num = (k: string) => (typeof d[k] === 'number' ? (d[k] as number) : undefined);
  const drops = Array.isArray(d.drops)
    ? (d.drops as unknown[]).filter(
        (x): x is MissionDrop =>
          !!x && typeof x === 'object' && typeof (x as MissionDrop).item === 'string' && typeof (x as MissionDrop).chance === 'number',
      )
    : [];
  return { xp: num('xp'), coins: num('coins'), bondXp: num('bondXp'), spiritOrigin: num('spiritOrigin'), drops };
}

export interface SuccessBreakdown {
  chance: number;
  statScore: number;
  target: number;
  classBonus: number;
  traitBonus: number;
  bondBonus: number;
}

export function computeSuccess(
  servant: ServantForMission,
  bondLevel: number,
  rules: MissionRules,
  cfg: MissionCfg = gameConfig.missions,
): SuccessBreakdown {
  const entries = Object.entries(rules.statWeights) as [StatKey, number][];
  const totalWeight = entries.reduce((s, [, w]) => s + w, 0);
  const statScore = totalWeight > 0
    ? entries.reduce((s, [k, w]) => s + rankValue(servant[k]) * w, 0) / totalWeight
    : 3;
  const target = cfg.difficultyTarget(rules.difficulty);
  const classBonus = rules.classBonus[servant.classId] ?? 0;
  const lowerTraits = servant.traits.map((t) => t.toLowerCase());
  // Traits não acumulam: vale o maior bônus aplicável
  const traitBonus = Object.entries(rules.traitBonus)
    .filter(([t]) => lowerTraits.includes(t.toLowerCase()))
    .reduce((best, [, v]) => Math.max(best, v), 0);
  const bondBonus = bondLevel * cfg.bondBonusPerLevel;

  const raw = cfg.baseSuccess + (statScore - target) * cfg.statFactor + classBonus + traitBonus + bondBonus;
  const chance = Math.min(cfg.maxChance, Math.max(cfg.minChance, raw));
  return { chance, statScore, target, classBonus, traitBonus, bondBonus };
}

export function rollOutcome(chance: number, rng: () => number = randomFloat, cfg: MissionCfg = gameConfig.missions): MissionOutcome {
  const r = rng();
  if (r < chance * cfg.greatSuccessShare) return 'GREAT_SUCCESS';
  if (r < chance) return 'SUCCESS';
  return 'FAILURE';
}

export interface ResolvedRewards {
  xp: number;
  coins: number;
  bondXp: number;
  spiritOrigin: number;
  /** slugs (ou "@random_catalyst") e quantidades ganhas */
  drops: { item: string; quantity: number }[];
}

export function resolveRewards(
  rewards: MissionRewards,
  outcome: MissionOutcome,
  rng: () => number = randomFloat,
  cfg: MissionCfg = gameConfig.missions,
): ResolvedRewards {
  if (outcome === 'FAILURE') {
    const share = cfg.failureRewardShare;
    return {
      xp: Math.round((rewards.xp ?? 0) * share),
      coins: 0,
      bondXp: Math.round((rewards.bondXp ?? 0) * share),
      spiritOrigin: 0,
      drops: [],
    };
  }
  const mult = outcome === 'GREAT_SUCCESS' ? cfg.greatSuccessMultiplier : 1;
  const drops: { item: string; quantity: number }[] = [];
  for (const d of rewards.drops ?? []) {
    // Grande sucesso também aumenta a chance de cada drop
    if (rng() < Math.min(1, d.chance * mult)) drops.push({ item: d.item, quantity: d.quantity ?? 1 });
  }
  return {
    xp: Math.round((rewards.xp ?? 0) * mult),
    coins: Math.round((rewards.coins ?? 0) * mult),
    bondXp: Math.round((rewards.bondXp ?? 0) * mult),
    spiritOrigin: Math.round((rewards.spiritOrigin ?? 0) * mult),
    drops,
  };
}
