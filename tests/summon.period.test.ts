import { describe, expect, it } from 'vitest';
import { canFreeSummon, currentPeriodStart, nextFreeSummonAt } from '../src/modules/summon/summon.period';

const fixed = { resetMode: 'fixed' as const, resetDayOfWeek: 1, resetHour: 0, utcOffsetMinutes: -180, rollingIntervalHours: 168 };
const rolling = { ...fixed, resetMode: 'rolling' as const };

describe('período semanal (fixed, segunda 00:00 BRT)', () => {
  it('calcula o início da semana no fuso configurado', () => {
    // Quarta, 24/09/2026 15:00 BRT = 18:00Z → semana começou seg 21/09 00:00 BRT = 03:00Z
    expect(currentPeriodStart(new Date('2026-09-24T18:00:00Z'), fixed).toISOString()).toBe('2026-09-21T03:00:00.000Z');
  });

  it('domingo à noite em BRT ainda pertence à semana anterior', () => {
    // Dom 27/09 23:30 BRT = seg 28/09 02:30Z
    expect(currentPeriodStart(new Date('2026-09-28T02:30:00Z'), fixed).toISOString()).toBe('2026-09-21T03:00:00.000Z');
  });

  it('libera um summon por semana', () => {
    const now = new Date('2026-09-24T18:00:00Z');
    expect(canFreeSummon(null, now, fixed)).toBe(true);
    expect(canFreeSummon(new Date('2026-09-22T12:00:00Z'), now, fixed)).toBe(false);
    expect(canFreeSummon(new Date('2026-09-20T12:00:00Z'), now, fixed)).toBe(true);
    expect(nextFreeSummonAt(new Date('2026-09-22T12:00:00Z'), now, fixed).toISOString()).toBe('2026-09-28T03:00:00.000Z');
  });
});

describe('período rolling', () => {
  it('libera 7 dias após o último summon', () => {
    const last = new Date('2026-09-20T10:00:00Z');
    expect(canFreeSummon(last, new Date('2026-09-27T09:59:00Z'), rolling)).toBe(false);
    expect(canFreeSummon(last, new Date('2026-09-27T10:01:00Z'), rolling)).toBe(true);
    expect(nextFreeSummonAt(last, new Date('2026-09-22T00:00:00Z'), rolling).toISOString()).toBe('2026-09-27T10:00:00.000Z');
  });
});
