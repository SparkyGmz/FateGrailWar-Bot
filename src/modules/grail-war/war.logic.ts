/**
 * Regras puras da Guerra do Santo Graal (V0.3). Sem banco.
 */
import { gameConfig } from '../../config/game';
import { weightsByDanger, type ExploreEventType } from '../../content/war-events';
import { randomFloat, weightedPick } from '../../shared/random';

type WarCfg = typeof gameConfig.war;

// ------------------------------------------------------------------ classes

export interface ClassModifiers {
  investigation: number;
  stealth: number;
  movement: number;
  manaRegen: number;
}

export function parseClassModifiers(data: unknown): ClassModifiers {
  const d = (data && typeof data === 'object' ? data : {}) as Record<string, unknown>;
  const n = (k: string, def: number) => (typeof d[k] === 'number' ? (d[k] as number) : def);
  return {
    investigation: n('investigation', 1),
    stealth: n('stealth', 1),
    movement: Math.max(1, Math.floor(n('movement', 1))),
    manaRegen: n('manaRegen', 1),
  };
}

export interface LocationEffects {
  stealthBonus: number;
  investigationBonus: number;
  manaRegen: number;
}

export function parseLocationEffects(data: unknown): LocationEffects {
  const d = (data && typeof data === 'object' ? data : {}) as Record<string, unknown>;
  const n = (k: string) => (typeof d[k] === 'number' ? (d[k] as number) : 0);
  return { stealthBonus: n('stealthBonus'), investigationBonus: n('investigationBonus'), manaRegen: n('manaRegen') };
}

const clamp = (v: number, cfg: WarCfg) => Math.min(cfg.maxChance, Math.max(cfg.minChance, v));

// ------------------------------------------------------------------ mapa

export interface GraphNode {
  slug: string;
  connections: string[];
}

/** Regiões alcançáveis a partir de `from` com até `maxHops` saltos (exclui a origem) */
export function reachable(nodes: GraphNode[], from: string, maxHops: number): Map<string, number> {
  const bySlug = new Map(nodes.map((n) => [n.slug, n]));
  const dist = new Map<string, number>([[from, 0]]);
  const queue = [from];
  while (queue.length) {
    const cur = queue.shift()!;
    const d = dist.get(cur)!;
    if (d >= maxHops) continue;
    for (const next of bySlug.get(cur)?.connections ?? []) {
      if (!dist.has(next) && bySlug.has(next)) {
        dist.set(next, d + 1);
        queue.push(next);
      }
    }
  }
  dist.delete(from);
  return dist;
}

/** Erros de consistência do grafo (conexões para regiões inexistentes ou de mão única) */
export function validateGraph(nodes: GraphNode[]): string[] {
  const errors: string[] = [];
  const bySlug = new Map(nodes.map((n) => [n.slug, n]));
  for (const n of nodes) {
    for (const c of n.connections) {
      const other = bySlug.get(c);
      if (!other) errors.push(`${n.slug} → ${c}: região inexistente`);
      else if (!other.connections.includes(n.slug)) errors.push(`${n.slug} → ${c}: conexão de mão única`);
    }
  }
  if (nodes.length && reachable(nodes, nodes[0]!.slug, nodes.length).size !== nodes.length - 1) {
    errors.push('o mapa não é conexo (há regiões inalcançáveis)');
  }
  return errors;
}

// ------------------------------------------------------------------ exploração

export function rollExploreEvent(
  dangerLevel: number,
  othersPresent: boolean,
  rng: () => number = randomFloat,
): ExploreEventType {
  const danger = (Math.min(3, Math.max(1, dangerLevel)) as 1 | 2 | 3);
  const entries = (Object.entries(weightsByDanger[danger]) as [ExploreEventType, number][])
    .filter(([t]) => othersPresent || (t !== 'master' && t !== 'servant'))
    .map(([item, weight]) => ({ item, weight }));
  return weightedPick(entries, rng);
}

/** Furtividade efetiva de um participante numa região */
export function effectiveStealth(classStealth: number, hidden: boolean, loc: LocationEffects, cfg: WarCfg = gameConfig.war): number {
  return classStealth * (hidden ? cfg.hideStealthMultiplier : 1) * (1 + loc.stealthBonus);
}

export function effectiveInvestigation(classInvestigation: number, loc: LocationEffects): number {
  return classInvestigation * (1 + loc.investigationBonus);
}

export function detectionChance(observerInvestigation: number, targetStealth: number, cfg: WarCfg = gameConfig.war): number {
  return clamp((cfg.detectBase * observerInvestigation) / Math.max(0.1, targetStealth), cfg);
}

export function investigateChance(
  observerInvestigation: number,
  targetStealth: number,
  sameLocation: boolean,
  cfg: WarCfg = gameConfig.war,
): number {
  const base = (cfg.investigateBase * observerInvestigation) / Math.max(0.1, targetStealth);
  return clamp(base * (sameLocation ? cfg.investigateSameLocationBonus : 1), cfg);
}

// ------------------------------------------------------------------ tempo

/** Próxima virada de dia (hora fixa no fuso configurado), estritamente depois de `now` */
export function nextDayBoundary(now: Date, hour: number, utcOffsetMinutes: number): Date {
  const offset = utcOffsetMinutes * 60 * 1000;
  const local = new Date(now.getTime() + offset);
  let t = Date.UTC(local.getUTCFullYear(), local.getUTCMonth(), local.getUTCDate(), hour);
  if (t <= local.getTime()) t += 24 * 60 * 60 * 1000;
  return new Date(t - offset);
}

// ------------------------------------------------------------------ informação

export const MAX_INTEL = 5;

export interface IntelServant {
  name: string;
  className: string;
  classEmoji: string;
  strength: string;
  endurance: string;
  agility: string;
  mana: string;
  luck: string;
  npRank: string;
  region: string;
  era: string;
  npName: string | null;
}

export interface IntelView {
  level: number;
  className: string | null;
  classEmoji: string | null;
  identity: string | null;
  stats: { label: string; value: string }[];
  region: string | null;
  era: string | null;
  np: string | null;
}

/** Monta o que o observador sabe, a partir do nível de informação */
export function buildIntelView(s: IntelServant, level: number, identityRevealed: boolean): IntelView {
  const lv = identityRevealed ? MAX_INTEL : level;
  const hidden = '???';
  return {
    level: lv,
    className: lv >= 1 ? s.className : null,
    classEmoji: lv >= 1 ? s.classEmoji : null,
    identity: lv >= 5 ? s.name : null,
    stats: [
      { label: 'STR', value: lv >= 2 ? s.strength : hidden },
      { label: 'END', value: lv >= 2 ? s.endurance : hidden },
      { label: 'AGI', value: lv >= 2 ? s.agility : hidden },
      { label: 'MANA', value: lv >= 3 ? s.mana : hidden },
      { label: 'LUCK', value: lv >= 3 ? s.luck : hidden },
      { label: 'NP', value: lv >= 4 ? s.npRank : hidden },
    ],
    region: lv >= 3 ? s.region : null,
    era: lv >= 3 ? s.era : null,
    np: lv >= 4 && s.npName ? s.npName : null,
  };
}

/** Texto do que foi descoberto ao atingir um nível */
export function describeLevelGain(s: IntelServant, level: number): string {
  switch (level) {
    case 1: return `Classe: **${s.classEmoji} ${s.className}**`;
    case 2: return `Parâmetros físicos: STR **${s.strength}** · END **${s.endurance}** · AGI **${s.agility}**`;
    case 3: return `Origem provável: **${s.region}** · Era: **${s.era}** · MANA **${s.mana}** · LUCK **${s.luck}**`;
    case 4: return `Noble Phantasm: **${s.npName ?? '???'}** (Rank ${s.npRank})`;
    case 5: return `🎭 **IDENTIDADE DESCOBERTA:** ${s.className} — **${s.name}**`;
    default: return '';
  }
}
