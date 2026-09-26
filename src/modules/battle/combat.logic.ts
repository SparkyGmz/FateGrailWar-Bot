/**
 * Motor de combate — funções puras sobre "combatentes" em memória.
 * O BattleService carrega o estado do banco, chama estas funções e grava o resultado.
 * Toda a fórmula de dano mora aqui + config/game.ts → combat.
 */
import { gameConfig } from '../../config/game';
import { randomFloat } from '../../shared/random';
import { rankValue } from '../../shared/ranks';

type CombatCfg = typeof gameConfig.combat;
const defaultCfg = gameConfig.combat;

// ------------------------------------------------------------------ tipos

export type BuffStat = 'attack' | 'defense' | 'crit' | 'evade' | 'guts';

export interface Buff {
  stat: BuffStat;
  /** positivo = buff, negativo = debuff; para guts, fração de HP com que revive */
  value: number;
  turns: number;
  source: string;
}

export interface SideState {
  buffs: Buff[];
  cooldowns: Record<string, number>;
  defending: boolean;
  stunned: number;
}

export interface CombatMods {
  damage: number;
  defense: number;
  mpCostMultiplier: number;
  retreatChance: number;
  manaRegen: number;
  ambushBonus: number;
}

export interface Combatant {
  participantId: number;
  /** Nome público (classe ou identidade revelada) */
  label: string;
  classId: string;
  strength: string;
  endurance: string;
  agility: string;
  luck: string;
  hp: number;
  maxHp: number;
  mp: number;
  maxMp: number;
  trainingStacks: number;
  mods: CombatMods;
  state: SideState;
}

export type Effect =
  | { type: 'damage'; power: number; ignoreDefense?: number }
  | { type: 'heal'; percent: number }
  | { type: 'buff'; stat: BuffStat; value: number; turns: number }
  | { type: 'debuff'; stat: 'attack' | 'defense' | 'evade' | 'crit'; value: number; turns: number }
  | { type: 'stun'; turns: number; chance?: number }
  | { type: 'mana'; amount: number }
  | { type: 'cleanse' }
  | { type: 'dispel' }
  | { type: 'information'; levels: number };

export interface EffectOutcome {
  lines: string[];
  damage: number;
  informationLevels: number;
  enemyDied: boolean;
}

// ------------------------------------------------------------------ parsing

export function emptyState(): SideState {
  return { buffs: [], cooldowns: {}, defending: false, stunned: 0 };
}

export function parseState(data: unknown): SideState {
  const d = (data && typeof data === 'object' ? data : {}) as Partial<SideState>;
  return {
    buffs: Array.isArray(d.buffs) ? d.buffs.filter((b) => b && typeof b.value === 'number') : [],
    cooldowns: d.cooldowns && typeof d.cooldowns === 'object' ? { ...d.cooldowns } : {},
    defending: !!d.defending,
    stunned: typeof d.stunned === 'number' ? d.stunned : 0,
  };
}

const EFFECT_TYPES = new Set(['damage', 'heal', 'buff', 'debuff', 'stun', 'mana', 'cleanse', 'dispel', 'information']);

export function parseEffects(data: unknown): Effect[] {
  if (!Array.isArray(data)) return [];
  return data.filter((e): e is Effect => !!e && typeof e === 'object' && EFFECT_TYPES.has((e as Effect).type));
}

export function parseCombatMods(data: unknown): CombatMods {
  const d = (data && typeof data === 'object' ? data : {}) as Record<string, unknown>;
  const n = (k: string, def: number) => (typeof d[k] === 'number' ? (d[k] as number) : def);
  return {
    damage: n('damage', 1),
    defense: n('defense', 1),
    mpCostMultiplier: n('mpCostMultiplier', 1),
    retreatChance: n('retreatChance', 0.5),
    manaRegen: n('manaRegen', 1),
    ambushBonus: n('ambushBonus', 1),
  };
}

// ------------------------------------------------------------------ utilitários

/** Soma dos buffs de um atributo, limitada pela faixa de config (combat.buffCaps) */
export function buffTotal(c: Combatant, stat: BuffStat, cfg: CombatCfg = defaultCfg): number {
  const sum = c.state.buffs.filter((b) => b.stat === stat).reduce((s, b) => s + b.value, 0);
  const cap = cfg.buffCaps[stat];
  return cap ? Math.min(cap[1], Math.max(cap[0], sum)) : sum;
}

export function critChance(c: Combatant, cfg: CombatCfg = defaultCfg): number {
  return Math.min(cfg.maxCritChance, Math.max(0, rankValue(c.luck) * cfg.critBasePerLuck + buffTotal(c, 'crit', cfg)));
}

// ------------------------------------------------------------------ Noble Phantasm

export const NP_COOLDOWN_KEY = '__np';

export function npCooldownLeft(state: SideState): number {
  return state.cooldowns[NP_COOLDOWN_KEY] ?? 0;
}

/** Marca o NP como usado (+1 porque o fim deste turno já desconta) */
export function markNpUsed(state: SideState, cfg: CombatCfg = defaultCfg): void {
  state.cooldowns[NP_COOLDOWN_KEY] = cfg.npCooldown + 1;
}

export function classAffinity(attacker: string, defender: string, cfg: CombatCfg = defaultCfg): number {
  let m = 1;
  if (attacker === 'berserker') m *= cfg.berserkerDealt;
  if (defender === 'berserker') m *= cfg.berserkerTaken;
  if (attacker !== 'berserker' && defender !== 'berserker') {
    if (cfg.beats[attacker]?.includes(defender)) m *= cfg.advantage;
    else if (cfg.beats[defender]?.includes(attacker)) m *= cfg.disadvantage;
  }
  return m;
}

export function npManaCost(npRank: string, mods: CombatMods, cfg: CombatCfg = defaultCfg): number {
  return Math.round(cfg.npCost(rankValue(npRank)) * mods.mpCostMultiplier);
}

export function skillManaCost(base: number, mods: CombatMods): number {
  return Math.round(base * mods.mpCostMultiplier);
}

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

// ------------------------------------------------------------------ dano

export interface DamageRoll {
  damage: number;
  crit: boolean;
  evaded: boolean;
  affinity: number;
}

export function computeDamage(
  att: Combatant,
  def: Combatant,
  power: number,
  opts: { ignoreDefense?: number; unavoidable?: boolean } = {},
  rng: () => number = randomFloat,
  cfg: CombatCfg = defaultCfg,
): DamageRoll {
  const affinity = classAffinity(att.classId, def.classId, cfg);

  if (!opts.unavoidable) {
    const evade = clamp(
      (rankValue(def.agility) - rankValue(att.agility)) * cfg.evadePerAgilityPoint + buffTotal(def, 'evade', cfg),
      0,
      cfg.maxEvade,
    );
    if (rng() < evade) return { damage: 0, crit: false, evaded: true, affinity };
  }

  const crit = rng() < critChance(att, cfg);

  const raw = (cfg.baseDamage + rankValue(att.strength) * cfg.strFactor) * power;
  const mult =
    att.mods.damage *
    affinity *
    Math.max(0.1, 1 + buffTotal(att, 'attack', cfg)) *
    (1 + att.trainingStacks * cfg.trainingBonusPerStack) *
    (crit ? cfg.critMultiplier : 1);
  // Defesa multiplicativa: cada ponto de END reduz o dano proporcionalmente
  const defenseFactor =
    1 + rankValue(def.endurance) * cfg.endFactor * (1 - (opts.ignoreDefense ?? 0)) * def.mods.defense * Math.max(0, 1 + buffTotal(def, 'defense', cfg));
  const variance = 1 + (rng() * 2 - 1) * cfg.variance;

  let dmg = ((raw * mult) / defenseFactor) * variance;
  if (def.state.defending) dmg *= cfg.defendMultiplier;
  return { damage: Math.max(cfg.minDamage, Math.round(dmg)), crit, evaded: false, affinity };
}

/** Aplica dano, respeitando "guts" (sobreviver a um golpe fatal uma vez) */
export function applyDamage(def: Combatant, amount: number): { died: boolean; gutsTriggered: boolean } {
  def.hp -= amount;
  if (def.hp > 0) return { died: false, gutsTriggered: false };
  const guts = def.state.buffs.find((b) => b.stat === 'guts');
  if (guts) {
    def.hp = Math.max(1, Math.round(def.maxHp * guts.value));
    def.state.buffs = def.state.buffs.filter((b) => b !== guts);
    return { died: false, gutsTriggered: true };
  }
  def.hp = 0;
  return { died: true, gutsTriggered: false };
}

// ------------------------------------------------------------------ efeitos

export function resolveEffects(
  actor: Combatant,
  enemy: Combatant,
  effects: readonly Effect[],
  ctx: { source: string; powerBonus?: number; unavoidable?: boolean },
  rng: () => number = randomFloat,
  cfg: CombatCfg = defaultCfg,
): EffectOutcome {
  const out: EffectOutcome = { lines: [], damage: 0, informationLevels: 0, enemyDied: false };
  const pct = (v: number) => `${Math.round(Math.abs(v) * 100)}%`;
  const STAT: Record<string, string> = { attack: 'ataque', defense: 'defesa', crit: 'crítico', evade: 'esquiva', guts: 'Guts' };

  for (const e of effects) {
    if (out.enemyDied) break;
    switch (e.type) {
      case 'damage': {
        const roll = computeDamage(actor, enemy, e.power * (ctx.powerBonus ?? 1), { ignoreDefense: e.ignoreDefense, unavoidable: ctx.unavoidable }, rng, cfg);
        if (roll.evaded) {
          out.lines.push(`💨 **${enemy.label}** esquivou!`);
          break;
        }
        const res = applyDamage(enemy, roll.damage);
        out.damage += roll.damage;
        const tags = [roll.crit ? '**CRÍTICO!**' : '', roll.affinity > 1 ? '(vantagem de classe)' : roll.affinity < 1 ? '(desvantagem de classe)' : '']
          .filter(Boolean).join(' ');
        out.lines.push(`⚔️ **${roll.damage}** de dano em **${enemy.label}** ${tags}`.trim());
        if (res.gutsTriggered) out.lines.push(`🔥 **${enemy.label}** se recusa a cair! (Guts)`);
        if (res.died) out.enemyDied = true;
        break;
      }
      case 'heal': {
        const amount = Math.min(actor.maxHp - actor.hp, Math.round(actor.maxHp * e.percent));
        actor.hp += amount;
        out.lines.push(`💚 **${actor.label}** recupera **${amount}** HP.`);
        break;
      }
      case 'buff': {
        // A mesma fonte não acumula consigo mesma (renova); Guts nunca acumula
        actor.state.buffs = actor.state.buffs.filter(
          (b) => !(b.stat === e.stat && (b.source === ctx.source || e.stat === 'guts')),
        );
        actor.state.buffs.push({ stat: e.stat, value: e.value, turns: e.turns, source: ctx.source });
        out.lines.push(
          e.stat === 'guts'
            ? `🔥 **${actor.label}** ganha **Guts** (sobrevive a um golpe fatal).`
            : e.value >= 0
              ? `⬆️ ${STAT[e.stat]} de **${actor.label}** +${pct(e.value)} (${e.turns} turno${e.turns > 1 ? 's' : ''})`
              : `⬇️ ${STAT[e.stat]} de **${actor.label}** -${pct(e.value)} (${e.turns} turno${e.turns > 1 ? 's' : ''})`,
        );
        break;
      }
      case 'debuff': {
        enemy.state.buffs = enemy.state.buffs.filter((b) => !(b.stat === e.stat && b.source === ctx.source));
        enemy.state.buffs.push({ stat: e.stat, value: -Math.abs(e.value), turns: e.turns, source: ctx.source });
        out.lines.push(`⬇️ ${STAT[e.stat]} de **${enemy.label}** -${pct(e.value)} (${e.turns} turno${e.turns > 1 ? 's' : ''})`);
        break;
      }
      case 'stun': {
        if (rng() < (e.chance ?? 1)) {
          enemy.state.stunned = Math.max(enemy.state.stunned, e.turns);
          out.lines.push(`💫 **${enemy.label}** está atordoado!`);
        } else {
          out.lines.push(`💫 **${enemy.label}** resistiu ao atordoamento.`);
        }
        break;
      }
      case 'mana': {
        const amount = Math.min(actor.maxMp - actor.mp, e.amount);
        actor.mp += amount;
        out.lines.push(`🔷 **${actor.label}** recupera **${amount}** MP.`);
        break;
      }
      case 'cleanse': {
        const before = actor.state.buffs.length;
        actor.state.buffs = actor.state.buffs.filter((b) => b.value >= 0 || b.stat === 'guts');
        actor.state.stunned = 0;
        if (actor.state.buffs.length < before) out.lines.push(`✨ **${actor.label}** remove seus efeitos negativos.`);
        break;
      }
      case 'dispel': {
        const before = enemy.state.buffs.length;
        enemy.state.buffs = enemy.state.buffs.filter((b) => b.value < 0);
        if (enemy.state.buffs.length < before) out.lines.push(`🌀 Os fortalecimentos de **${enemy.label}** foram anulados!`);
        break;
      }
      case 'information': {
        out.informationLevels += e.levels;
        break;
      }
    }
  }
  return out;
}

// ------------------------------------------------------------------ turnos

/** Fim do turno de quem agiu: expira buffs, reduz cooldowns, regenera MP */
export function endTurn(c: Combatant, cfg: CombatCfg = defaultCfg): void {
  c.state.buffs = c.state.buffs
    .map((b) => (b.stat === 'guts' ? b : { ...b, turns: b.turns - 1 }))
    .filter((b) => b.turns > 0);
  for (const k of Object.keys(c.state.cooldowns)) {
    c.state.cooldowns[k] = Math.max(0, (c.state.cooldowns[k] ?? 0) - 1);
    if (c.state.cooldowns[k] === 0) delete c.state.cooldowns[k];
  }
  c.mp = Math.min(c.maxMp, c.mp + Math.round(cfg.mpRegenPerTurn * c.mods.manaRegen));
}

/** Início do turno: a postura de defesa termina quando o próprio lado volta a agir */
export function startTurn(c: Combatant): void {
  c.state.defending = false;
}

/** Multiplicador de dano por batalha longa */
export function fatigueMultiplier(turn: number, cfg: CombatCfg = defaultCfg): number {
  return 1 + Math.max(0, turn - cfg.fatigueStartTurn) * cfg.fatiguePerTurn;
}

export function retreatChance(actor: Combatant, enemy: Combatant, cfg: CombatCfg = defaultCfg): number {
  return clamp(actor.mods.retreatChance + (rankValue(actor.agility) - rankValue(enemy.agility)) * cfg.retreatAgilityFactor, 0.05, 0.95);
}
