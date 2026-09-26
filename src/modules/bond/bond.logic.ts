import { gameConfig } from '../../config/game';

type BondCfg = typeof gameConfig.bond;

export interface BondProgress {
  level: number;
  xp: number;
  /** Níveis alcançados nesta operação, em ordem */
  reached: number[];
}

/** Soma XP de bond e sobe de nível; no nível máximo o XP excedente é descartado */
export function applyBondXp(level: number, xp: number, amount: number, cfg: BondCfg = gameConfig.bond): BondProgress {
  const reached: number[] = [];
  if (level >= cfg.maxLevel) return { level, xp: 0, reached };
  xp += Math.max(0, amount);
  while (level < cfg.maxLevel && xp >= cfg.xpToNextLevel(level)) {
    xp -= cfg.xpToNextLevel(level);
    level++;
    reached.push(level);
  }
  if (level >= cfg.maxLevel) xp = 0;
  return { level, xp, reached };
}
