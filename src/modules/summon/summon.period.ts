/**
 * Regras do summon gratuito semanal — funções puras.
 */
import type { SummonConfig } from '../../config/game';

const DAY = 24 * 60 * 60 * 1000;

type PeriodConfig = Pick<SummonConfig, 'resetMode' | 'resetDayOfWeek' | 'resetHour' | 'utcOffsetMinutes' | 'rollingIntervalHours'>;

/** Início do período semanal atual (modo 'fixed') */
export function currentPeriodStart(now: Date, cfg: PeriodConfig): Date {
  const offset = cfg.utcOffsetMinutes * 60 * 1000;
  // "Relógio local" representado em UTC para usar getters UTC sem depender do fuso do servidor
  const local = new Date(now.getTime() + offset);
  const daysSince = (local.getUTCDay() - cfg.resetDayOfWeek + 7) % 7;
  let startLocal = Date.UTC(local.getUTCFullYear(), local.getUTCMonth(), local.getUTCDate() - daysSince, cfg.resetHour);
  if (startLocal > local.getTime()) startLocal -= 7 * DAY;
  return new Date(startLocal - offset);
}

/**
 * Limite para o summon: se `lastFreeSummonAt` for anterior a este instante
 * (ou nulo), o jogador pode invocar.
 */
export function summonThreshold(now: Date, cfg: PeriodConfig): Date {
  if (cfg.resetMode === 'rolling') {
    return new Date(now.getTime() - cfg.rollingIntervalHours * 60 * 60 * 1000);
  }
  return currentPeriodStart(now, cfg);
}

export function canFreeSummon(lastFreeSummonAt: Date | null, now: Date, cfg: PeriodConfig): boolean {
  return !lastFreeSummonAt || lastFreeSummonAt < summonThreshold(now, cfg);
}

export function nextFreeSummonAt(lastFreeSummonAt: Date | null, now: Date, cfg: PeriodConfig): Date {
  if (canFreeSummon(lastFreeSummonAt, now, cfg)) return now;
  if (cfg.resetMode === 'rolling') {
    return new Date(lastFreeSummonAt!.getTime() + cfg.rollingIntervalHours * 60 * 60 * 1000);
  }
  return new Date(currentPeriodStart(now, cfg).getTime() + 7 * DAY);
}
