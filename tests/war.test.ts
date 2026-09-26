import { describe, expect, it } from 'vitest';
import { maps } from '../src/content/maps';
import { classes } from '../src/content/classes';
import {
  buildIntelView,
  detectionChance,
  effectiveStealth,
  investigateChance,
  nextDayBoundary,
  parseClassModifiers,
  reachable,
  rollExploreEvent,
  validateGraph,
  type IntelServant,
} from '../src/modules/grail-war/war.logic';

const fuyuki = maps.find((m) => m.slug === 'fuyuki')!.locations;
const mod = (id: string) => parseClassModifiers(classes.find((c) => c.id === id)!.modifiers);

describe('mapa', () => {
  it('Fuyuki é um grafo válido, simétrico e conexo', () => {
    expect(validateGraph(fuyuki)).toEqual([]);
  });

  it('detecta conexões de mão única e regiões soltas', () => {
    const bad = [
      { slug: 'a', connections: ['b'] },
      { slug: 'b', connections: [] },
      { slug: 'c', connections: [] },
    ];
    const errors = validateGraph(bad);
    expect(errors.some((e) => e.includes('mão única'))).toBe(true);
    expect(errors.some((e) => e.includes('conexo'))).toBe(true);
  });

  it('Rider alcança mais regiões por viagem', () => {
    const normal = reachable(fuyuki, 'castelo', mod('saber').movement);
    const rider = reachable(fuyuki, 'castelo', mod('rider').movement);
    expect([...normal.keys()]).toEqual(['floresta']);
    expect(rider.has('suburbio')).toBe(true);
    expect(rider.get('suburbio')).toBe(2);
  });
});

describe('exploração', () => {
  it('sem outros Masters na região, nunca sorteia encontros', () => {
    let i = 0;
    const rng = () => ((i = (i * 7 + 3) % 97) / 97);
    for (let n = 0; n < 2000; n++) {
      expect(['master', 'servant']).not.toContain(rollExploreEvent(3, false, rng));
    }
  });

  it('Assassin é mais difícil de detectar, e /hide ajuda', () => {
    const none = { stealthBonus: 0, investigationBonus: 0, manaRegen: 0 };
    const vsSaber = detectionChance(1, effectiveStealth(mod('saber').stealth, false, none));
    const vsAssassin = detectionChance(1, effectiveStealth(mod('assassin').stealth, false, none));
    const vsHidden = detectionChance(1, effectiveStealth(mod('assassin').stealth, true, none));
    expect(vsAssassin).toBeLessThan(vsSaber);
    expect(vsHidden).toBeLessThan(vsAssassin);
    expect(vsHidden).toBeGreaterThanOrEqual(0.1);
  });

  it('Assassin investiga melhor que Berserker, e estar na mesma região ajuda', () => {
    expect(investigateChance(mod('assassin').investigation, 1, false)).toBeGreaterThan(investigateChance(mod('berserker').investigation, 1, false));
    expect(investigateChance(1, 1, true)).toBeGreaterThan(investigateChance(1, 1, false));
  });
});

describe('informação', () => {
  const s: IntelServant = {
    name: 'Artoria Pendragon', className: 'Saber', classEmoji: '⚔️', strength: 'B', endurance: 'B', agility: 'C',
    mana: 'B', luck: 'A+', npRank: 'A++', region: 'Grã-Bretanha', era: 'Idade Média', npName: 'Excalibur',
  };

  it('revela gradualmente', () => {
    expect(buildIntelView(s, 0, false)).toMatchObject({ className: null, identity: null, np: null });
    const lv2 = buildIntelView(s, 2, false);
    expect(lv2.className).toBe('Saber');
    expect(lv2.stats.find((x) => x.label === 'STR')!.value).toBe('B');
    expect(lv2.stats.find((x) => x.label === 'LUCK')!.value).toBe('???');
    expect(buildIntelView(s, 4, false)).toMatchObject({ np: 'Excalibur', identity: null });
    expect(buildIntelView(s, 5, false).identity).toBe('Artoria Pendragon');
  });

  it('identidade revelada publicamente vale para todos', () => {
    expect(buildIntelView(s, 0, true).identity).toBe('Artoria Pendragon');
  });
});

describe('dia da Guerra', () => {
  it('vira à meia-noite de Brasília', () => {
    // 24/09 15:00 BRT → 25/09 00:00 BRT = 03:00Z
    expect(nextDayBoundary(new Date('2026-09-24T18:00:00Z'), 0, -180).toISOString()).toBe('2026-09-25T03:00:00.000Z');
    // exatamente na virada → próximo dia
    expect(nextDayBoundary(new Date('2026-09-25T03:00:00Z'), 0, -180).toISOString()).toBe('2026-09-26T03:00:00.000Z');
  });
});
