import { describe, expect, it } from 'vitest';
import { classes } from '../src/content/classes';
import { items } from '../src/content/items';
import { themes } from '../src/content/pools';
import { servants } from '../src/content/servants';
import { rankValue } from '../src/shared/ranks';

describe('conteúdo', () => {
  const slugs = new Set(servants.map((s) => s.slug));

  it('tem 8 Servants por classe e slugs únicos', () => {
    expect(slugs.size).toBe(servants.length);
    for (const c of classes) expect(servants.filter((s) => s.class === c.id)).toHaveLength(8);
  });

  it('todo Servant aparece em ao menos um banner temático', () => {
    const inThemes = new Set(themes.flatMap((t) => t.servants));
    expect(servants.filter((s) => !inThemes.has(s.slug)).map((s) => s.slug)).toEqual([]);
  });

  it('banners e catalisadores referenciam Servants existentes', () => {
    for (const t of themes) for (const s of [...t.servants, ...t.featured]) expect(slugs.has(s), `${t.slug}:${s}`).toBe(true);
    for (const i of items) {
      for (const e of i.data.effects ?? []) if (e.target === 'servant') expect(slugs.has(e.value), `${i.slug}:${e.value}`).toBe(true);
    }
  });

  it('todo catalisador ressoa com pelo menos um Servant', () => {
    const norm = (x: string) => x.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
    for (const i of items.filter((x) => x.type === 'CATALYST')) {
      const hit = servants.some((s) =>
        (i.data.effects ?? []).some((e) =>
          (e.target === 'servant' && e.value === s.slug) ||
          (e.target === 'trait' && s.traits.map(norm).includes(norm(e.value))) ||
          (e.target === 'origin' && norm(s.origin) === norm(e.value)) ||
          (e.target === 'region' && norm(s.region) === norm(e.value)) ||
          (e.target === 'class' && s.class === e.value),
        ),
      );
      expect(hit, i.slug).toBe(true);
    }
  });

  it('ranks são interpretáveis', () => {
    expect(rankValue('A++')).toBe(6);
    expect(rankValue('EX')).toBe(7);
    expect(rankValue('E~A++')).toBe(6);
    expect(rankValue('?')).toBe(0);
    for (const s of servants) for (const r of s.stats.slice(0, 5)) expect(rankValue(r), `${s.slug}:${r}`).toBeGreaterThan(0);
  });
});
