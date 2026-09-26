/**
 * Popula/atualiza o conteúdo do jogo a partir de src/content.
 * Idempotente: pode rodar quantas vezes quiser (upsert por slug).
 *
 *   npm run db:seed
 */
import { PrismaClient } from '@prisma/client';
import { classes } from '../src/content/classes';
import { items } from '../src/content/items';
import { rotationWeeks, standardPool, themes } from '../src/content/pools';
import { servants } from '../src/content/servants';
import { missions } from '../src/content/missions';
import { shopOffers } from '../src/content/shop';
import { bondRewards } from '../src/content/bond-rewards';
import { maps } from '../src/content/maps';
import { classSkills, servantSkills, skills } from '../src/content/skills';
import { defaultNpEffects, npEffectsByType, npOverrides } from '../src/content/np-effects';
import { npManaCost, parseCombatMods } from '../src/modules/battle/combat.logic';
import { exploreItems } from '../src/content/war-events';
import { validateGraph } from '../src/modules/grail-war/war.logic';
import { gameConfig } from '../src/config/game';
import { currentPeriodStart } from '../src/modules/summon/summon.period';
import { rankValue } from '../src/shared/ranks';

const prisma = new PrismaClient();
const WEEK = 7 * 24 * 60 * 60 * 1000;

function validateContent() {
  const errors: string[] = [];
  const classIds = new Set(classes.map((c) => c.id));
  const slugs = new Set<string>();

  for (const s of servants) {
    if (slugs.has(s.slug)) errors.push(`Slug duplicado: ${s.slug}`);
    slugs.add(s.slug);
    if (!classIds.has(s.class)) errors.push(`${s.slug}: classe inexistente "${s.class}"`);
  }
  for (const t of themes) {
    for (const slug of [...t.servants, ...t.featured]) {
      if (!slugs.has(slug)) errors.push(`Banner ${t.slug}: Servant inexistente "${slug}"`);
    }
    for (const f of t.featured) {
      if (!t.servants.includes(f)) errors.push(`Banner ${t.slug}: destaque "${f}" não está na lista de Servants`);
    }
  }
  for (const i of items) {
    for (const e of i.data.effects ?? []) {
      if (e.target === 'servant' && !slugs.has(e.value)) errors.push(`Item ${i.slug}: Servant inexistente "${e.value}"`);
      if (e.target === 'class' && !classIds.has(e.value)) errors.push(`Item ${i.slug}: classe inexistente "${e.value}"`);
    }
  }
  const itemSlugs = new Set(items.map((i) => i.slug));
  for (const m of missions) {
    for (const d of m.rewards.drops ?? []) {
      if (d.item !== '@random_catalyst' && !itemSlugs.has(d.item)) errors.push(`Missão ${m.slug}: item inexistente "${d.item}"`);
    }
    for (const c of Object.keys(m.classBonus ?? {})) if (!classIds.has(c)) errors.push(`Missão ${m.slug}: classe inexistente "${c}"`);
  }
  for (const o of shopOffers) if (!itemSlugs.has(o.item)) errors.push(`Loja ${o.slug}: item inexistente "${o.item}"`);
  for (const b of bondRewards) {
    if (b.servant && !slugs.has(b.servant)) errors.push(`Bond: Servant inexistente "${b.servant}"`);
    if (b.type === 'ITEM' && (!b.item || !itemSlugs.has(b.item))) errors.push(`Bond nível ${b.level}: item inexistente "${b.item}"`);
    if (b.type === 'TITLE' && !b.title) errors.push(`Bond nível ${b.level}: título vazio`);
  }
  const skillSlugs = new Set(skills.map((k) => k.slug));
  for (const [cls, list] of Object.entries(classSkills)) {
    if (!classIds.has(cls)) errors.push(`Skills: classe inexistente "${cls}"`);
    for (const k of list) if (!skillSlugs.has(k)) errors.push(`Skills da classe ${cls}: skill inexistente "${k}"`);
  }
  for (const [sv, list] of Object.entries(servantSkills)) {
    if (!slugs.has(sv)) errors.push(`Skills: Servant inexistente "${sv}"`);
    for (const k of list) if (!skillSlugs.has(k)) errors.push(`Skills de ${sv}: skill inexistente "${k}"`);
  }
  for (const sv of Object.keys(npOverrides)) if (!slugs.has(sv)) errors.push(`NP: Servant inexistente "${sv}"`);
  for (const m of maps) for (const e of validateGraph(m.locations)) errors.push(`Mapa ${m.slug}: ${e}`);
  for (const e of exploreItems) if (!itemSlugs.has(e.item)) errors.push(`Exploração: item inexistente "${e.item}"`);
  if (errors.length) throw new Error(`Conteúdo inválido:\n  - ${errors.join('\n  - ')}`);
}

/** HP/MP base derivados dos parâmetros (substituíveis por valores fixos no futuro) */
function deriveBase(stats: string[], rarity: number) {
  const [str, end, , mana] = stats.map(rankValue);
  return {
    baseHp: Math.round(800 + rarity * 150 + (end ?? 0) * 120 + (str ?? 0) * 40),
    baseMp: Math.round(60 + (mana ?? 0) * 20),
  };
}

async function seedClasses() {
  for (const c of classes) {
    const data = {
      name: c.name,
      emoji: c.emoji,
      color: c.color,
      sortOrder: c.sortOrder,
      description: c.description,
      features: c.features,
      modifiers: c.modifiers,
    };
    await prisma.servantClass.upsert({ where: { id: c.id }, create: { id: c.id, ...data }, update: data });
  }
  console.log(`  ✓ ${classes.length} classes`);
}

async function seedServants() {
  for (const s of servants) {
    const [strength, endurance, agility, mana, luck, npRank] = s.stats;
    const data = {
      name: s.name,
      classId: s.class,
      rarity: s.rarity,
      alignment: s.alignment,
      gender: s.gender,
      origin: s.origin,
      region: s.region,
      era: s.era,
      strength,
      endurance,
      agility,
      mana,
      luck,
      npRank,
      traits: s.traits,
      summonWeight: s.summonWeight ?? null,
      description: s.description,
      ...deriveBase(s.stats, s.rarity),
    };
    const servant = await prisma.servant.upsert({ where: { slug: s.slug }, create: { slug: s.slug, ...data }, update: data });

    const cls = classes.find((c) => c.id === s.class)!;
    const npData = {
      rank: npRank,
      type: s.np.type,
      effects: (npOverrides[s.slug] ?? npEffectsByType[s.np.type] ?? defaultNpEffects) as object[],
      manaCost: npManaCost(npRank, parseCombatMods(cls.modifiers)),
      targetType: 'enemy',
    };
    await prisma.noblePhantasm.upsert({
      where: { servantId_name: { servantId: servant.id, name: s.np.name } },
      create: { servantId: servant.id, name: s.np.name, ...npData },
      update: npData,
    });
  }
  console.log(`  ✓ ${servants.length} Servants`);
}

async function seedSkills() {
  for (const k of skills) {
    const data = {
      name: k.name,
      description: k.description,
      cooldown: k.cooldown,
      manaCost: k.manaCost,
      targetType: k.targetType,
      effects: k.effects as object[],
    };
    await prisma.skill.upsert({ where: { slug: k.slug }, create: { slug: k.slug, ...data }, update: data });
  }
  const skillIds = new Map((await prisma.skill.findMany({ select: { id: true, slug: true } })).map((k) => [k.slug, k.id]));
  const dbServants = await prisma.servant.findMany({ select: { id: true, slug: true, classId: true } });
  for (const sv of dbServants) {
    const list = servantSkills[sv.slug] ?? classSkills[sv.classId] ?? [];
    await prisma.$transaction([
      prisma.servantSkill.deleteMany({ where: { servantId: sv.id } }),
      prisma.servantSkill.createMany({
        data: list.map((slug, i) => ({ servantId: sv.id, skillId: skillIds.get(slug)!, slot: i + 1 })),
      }),
    ]);
  }
  console.log(`  ✓ ${skills.length} skills atribuídas a ${dbServants.length} Servants`);
}

async function seedItems() {
  for (const i of items) {
    const data = {
      name: i.name,
      type: i.type,
      emoji: i.emoji,
      rarity: i.rarity,
      description: i.description,
      data: i.data as object,
      dropWeight: i.dropWeight,
    };
    await prisma.item.upsert({ where: { slug: i.slug }, create: { slug: i.slug, ...data }, update: data });
  }
  console.log(`  ✓ ${items.length} itens`);
}

async function setPoolServants(poolId: number, slugs: string[] | 'ALL', featured: string[]) {
  const list = await prisma.servant.findMany({
    where: slugs === 'ALL' ? { enabled: true } : { slug: { in: slugs } },
    select: { id: true, slug: true },
  });
  await prisma.$transaction([
    prisma.summonPoolServant.deleteMany({ where: { poolId } }),
    prisma.summonPoolServant.createMany({
      data: list.map((s) => ({ poolId, servantId: s.id, featured: featured.includes(s.slug) })),
    }),
  ]);
}

async function seedPools() {
  // Pool padrão permanente (fallback)
  const std = await prisma.summonPool.upsert({
    where: { slug: standardPool.slug },
    create: {
      slug: standardPool.slug,
      name: standardPool.name,
      description: standardPool.description,
      priority: standardPool.priority,
      startDate: new Date(0),
      endDate: null,
      rateModifiers: standardPool.rateModifiers,
    },
    update: { name: standardPool.name, description: standardPool.description, rateModifiers: standardPool.rateModifiers },
  });
  await setPoolServants(std.id, 'ALL', []);

  // Rotação semanal: o tema de cada semana depende do número absoluto da semana,
  // então rodar o seed de novo nunca troca o tema de uma semana já criada.
  const weekStart = currentPeriodStart(new Date(), gameConfig.summon).getTime();
  for (let w = 0; w < rotationWeeks; w++) {
    const start = new Date(weekStart + w * WEEK);
    const end = new Date(start.getTime() + WEEK);
    const absoluteWeek = Math.floor(start.getTime() / WEEK);
    const theme = themes[absoluteWeek % themes.length]!;
    const slug = `${theme.slug}-${start.toISOString().slice(0, 10)}`;
    const rateModifiers = { featuredMultiplier: theme.featuredMultiplier };

    const pool = await prisma.summonPool.upsert({
      where: { slug },
      create: { slug, name: theme.name, description: theme.description, priority: 10, startDate: start, endDate: end, rateModifiers },
      update: { name: theme.name, description: theme.description, rateModifiers },
    });
    await setPoolServants(pool.id, theme.servants, theme.featured);
  }
  console.log(`  ✓ pool padrão + ${rotationWeeks} semanas de rotação`);
}

async function seedMissions() {
  for (const [idx, m] of missions.entries()) {
    const data = {
      name: m.name,
      emoji: m.emoji,
      description: m.description,
      difficulty: m.difficulty,
      durationMinutes: m.durationMinutes,
      minLevel: m.minLevel,
      statWeights: m.statWeights,
      classBonus: m.classBonus ?? {},
      traitBonus: m.traitBonus ?? {},
      rewards: m.rewards as object,
      sortOrder: idx,
    };
    await prisma.mission.upsert({ where: { slug: m.slug }, create: { slug: m.slug, ...data }, update: data });
  }
  console.log(`  ✓ ${missions.length} missões`);
}

async function seedShop() {
  const itemIds = new Map((await prisma.item.findMany({ select: { id: true, slug: true } })).map((i) => [i.slug, i.id]));
  for (const [idx, o] of shopOffers.entries()) {
    const data = {
      itemId: itemIds.get(o.item)!,
      currency: o.currency,
      price: o.price,
      quantity: o.quantity ?? 1,
      weeklyLimit: o.weeklyLimit ?? null,
      sortOrder: idx,
    };
    await prisma.shopOffer.upsert({ where: { slug: o.slug }, create: { slug: o.slug, ...data }, update: data });
  }
  console.log(`  ✓ ${shopOffers.length} ofertas na loja`);
}

async function seedBondRewards() {
  const itemIds = new Map((await prisma.item.findMany({ select: { id: true, slug: true } })).map((i) => [i.slug, i.id]));
  const servantIds = new Map((await prisma.servant.findMany({ select: { id: true, slug: true } })).map((s) => [s.slug, s.id]));
  // Recompensas não são referenciadas por outras tabelas: substituir tudo é seguro
  await prisma.$transaction([
    prisma.bondReward.deleteMany({}),
    prisma.bondReward.createMany({
      data: bondRewards.map((b) => ({
        servantId: b.servant ? servantIds.get(b.servant)! : null,
        level: b.level,
        type: b.type,
        amount: b.amount ?? 1,
        itemId: b.item ? itemIds.get(b.item)! : null,
        title: b.title ?? null,
      })),
    }),
  ]);
  console.log(`  ✓ ${bondRewards.length} recompensas de Bond`);
}

async function main() {
  console.log('🌱 Seed do conteúdo…');
  validateContent();
  await seedClasses();
  await seedServants();
  await seedSkills();
  await seedItems();
  await seedPools();
  await seedMissions();
  await seedShop();
  await seedBondRewards();
  console.log('✅ Seed concluído.');
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
