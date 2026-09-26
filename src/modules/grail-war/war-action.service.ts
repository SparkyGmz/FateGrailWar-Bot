import { ItemType, WarStatus, type GrailWar } from '@prisma/client';
import { gameConfig } from '../../config/game';
import { exploreItems, texts, type ExploreEventType } from '../../content/war-events';
import { lockParticipant } from '../../database/locks';
import { prisma, type Tx } from '../../database/prisma';
import { GameError } from '../../shared/errors';
import { discordTime } from '../../shared/format';
import { randomFloat, weightedPick } from '../../shared/random';
import { rankValue } from '../../shared/ranks';
import { BondService } from '../bond/bond.service';
import { InventoryService } from '../inventory/inventory.service';
import { LogService } from '../logs/log.service';
import { addWarEvent, WarService } from './war.service';
import {
  buildIntelView,
  describeLevelGain,
  detectionChance,
  effectiveInvestigation,
  effectiveStealth,
  investigateChance,
  MAX_INTEL,
  parseClassModifiers,
  parseLocationEffects,
  reachable,
  rollExploreEvent,
  type IntelServant,
} from './war.logic';

const cfg = gameConfig.war;

const participantInclude = {
  user: true,
  location: true,
  servant: { include: { class: true, noblePhantasms: true } },
} as const;

export async function loadParticipant(db: Tx | typeof prisma, id: number) {
  return db.warParticipant.findUniqueOrThrow({ where: { id }, include: participantInclude });
}
export type FullParticipant = Awaited<ReturnType<typeof loadParticipant>>;

function pick<T>(arr: readonly T[]): T {
  return arr[Math.floor(randomFloat() * arr.length)]!;
}

export function toIntelServant(p: FullParticipant): IntelServant {
  const s = p.servant!;
  return {
    name: s.name,
    className: s.class.name,
    classEmoji: s.class.emoji,
    strength: s.strength,
    endurance: s.endurance,
    agility: s.agility,
    mana: s.mana,
    luck: s.luck,
    npRank: s.npRank,
    region: s.region,
    era: s.era,
    npName: s.noblePhantasms[0]?.name ?? null,
  };
}

function isHidden(p: { hiddenOnDay: number | null }, war: GrailWar): boolean {
  return p.hiddenOnDay === war.currentDay;
}

function stealthOf(p: FullParticipant, war: GrailWar): number {
  const mods = parseClassModifiers(p.servant?.class.modifiers);
  return effectiveStealth(mods.stealth, isHidden(p, war), parseLocationEffects(p.location?.effects));
}

function investigationOf(p: FullParticipant): number {
  const mods = parseClassModifiers(p.servant?.class.modifiers);
  return effectiveInvestigation(mods.investigation, parseLocationEffects(p.location?.effects));
}

/** Eleva o que `observer` sabe sobre `target` (nunca diminui) */
export async function raiseIntel(
  tx: Tx,
  war: GrailWar,
  observerId: number,
  targetId: number,
  opts: { atLeast?: number; increment?: boolean; seenAt?: number | null },
): Promise<{ before: number; after: number }> {
  const existing = await tx.playerIntel.findUnique({
    where: { warId_observerId_targetId: { warId: war.id, observerId, targetId } },
  });
  const before = existing?.informationLevel ?? -1;
  let after = Math.max(before, opts.atLeast ?? 0);
  if (opts.increment) after = Math.min(MAX_INTEL, Math.max(before, 0) + 1);
  const seen = opts.seenAt !== undefined ? { lastSeenLocationId: opts.seenAt, lastSeenDay: war.currentDay } : {};
  await tx.playerIntel.upsert({
    where: { warId_observerId_targetId: { warId: war.id, observerId, targetId } },
    create: { warId: war.id, observerId, targetId, informationLevel: after, ...seen },
    update: { informationLevel: after, ...seen },
  });
  return { before, after };
}

export interface ActionCtx {
  tx: Tx;
  war: GrailWar;
  me: FullParticipant;
}

export interface ActionResult {
  title: string;
  lines: string[];
  apLeft: number;
  nextDayAt: Date | null;
  color?: 'success' | 'warning' | 'danger' | 'info';
}

/**
 * Executa uma ação que custa AP. Tudo numa transação com o participante travado:
 * se a ação falhar (ex.: destino inválido), o AP não é gasto.
 */
export async function act(
  guildId: string,
  userId: string,
  action: string,
  fn: (ctx: ActionCtx) => Promise<Omit<ActionResult, 'apLeft' | 'nextDayAt'>>,
): Promise<ActionResult> {
  const war = await WarService.requireOpenWar(guildId);
  if (war.status !== WarStatus.ACTIVE) throw new GameError('A Guerra ainda não começou.');
  if (war.paused) throw new GameError('A Guerra está pausada pelo supervisor.');

  return prisma.$transaction(async (tx) => {
    const pid = await lockParticipant(tx, war.id, userId);
    if (!pid) throw new GameError('Você não participa desta Guerra.');
    const me = await loadParticipant(tx, pid);
    if (!me.alive) throw new GameError('Seu Servant foi eliminado. Você não pode mais agir nesta Guerra.');
    const inBattle = await tx.battle.count({
      where: { status: 'ACTIVE', OR: [{ attackerId: me.id }, { defenderId: me.id }] },
    });
    if (inBattle) throw new GameError('Você está em combate! Resolva a batalha primeiro (`/battle status`).');
    const cost = cfg.actionCost[action] ?? 1;
    if (me.actionsRemaining < cost) {
      throw new GameError(`Sem AP suficientes (${me.actionsRemaining}/${cfg.apPerDay}). Eles voltam ${war.nextDayAt ? discordTime(war.nextDayAt, 'R') : 'no próximo dia'}.`);
    }
    await tx.warParticipant.update({ where: { id: me.id }, data: { actionsRemaining: { decrement: cost } } });

    const res = await fn({ tx, war, me });
    await LogService.log(tx, userId, 'WAR_ACTION', { warId: war.id, day: war.currentDay, action, title: res.title });
    return { ...res, apLeft: me.actionsRemaining - cost, nextDayAt: war.nextDayAt };
  }, { timeout: 15000 });
}

async function othersHere(tx: Tx, me: FullParticipant) {
  if (!me.locationId) return [];
  const others = await tx.warParticipant.findMany({
    where: { warId: me.warId, locationId: me.locationId, alive: true, id: { not: me.id } },
    select: { id: true },
  });
  return Promise.all(others.map((o) => loadParticipant(tx, o.id)));
}

async function damage(tx: Tx, me: FullParticipant, fraction: [number, number]): Promise<number> {
  const f = fraction[0] + randomFloat() * (fraction[1] - fraction[0]);
  let amount = Math.round(me.maxHp * f);
  amount = Math.min(amount, Math.max(0, me.currentHp - cfg.minHpFromEvents));
  if (amount > 0) await tx.warParticipant.update({ where: { id: me.id }, data: { currentHp: { decrement: amount } } });
  return amount;
}

export const WarActionService = {
  // ------------------------------------------------------------ viagens

  async travelOptions(guildId: string, userId: string) {
    const war = await WarService.getOpenWar(guildId);
    if (!war || war.status !== WarStatus.ACTIVE) return [];
    const me = await prisma.warParticipant.findUnique({
      where: { warId_userId: { warId: war.id, userId } },
      include: participantInclude,
    });
    if (!me?.location) return [];
    const locations = await prisma.warLocation.findMany({ where: { warId: war.id } });
    const movement = parseClassModifiers(me.servant?.class.modifiers).movement;
    const reach = reachable(locations, me.location.slug, movement);
    return locations
      .filter((l) => reach.has(l.slug))
      .map((l) => ({ location: l, hops: reach.get(l.slug)! }))
      .sort((a, b) => a.hops - b.hops);
  },

  async travel(guildId: string, userId: string, destSlug: string) {
    return act(guildId, userId, 'travel', async ({ tx, war, me }) => {
      const locations = await tx.warLocation.findMany({ where: { warId: war.id } });
      const dest = locations.find((l) => l.slug === destSlug);
      if (!dest) throw new GameError('Região desconhecida.');
      if (!me.location) throw new GameError('Sua posição é desconhecida.');
      if (dest.id === me.locationId) throw new GameError('Você já está aí.');
      const movement = parseClassModifiers(me.servant?.class.modifiers).movement;
      const hops = reachable(locations, me.location.slug, movement).get(dest.slug);
      if (hops === undefined) {
        throw new GameError(`${dest.emoji} **${dest.name}** não é alcançável daqui${movement > 1 ? ` (alcance: ${movement} regiões)` : ' — só regiões conectadas'}.`);
      }
      await tx.warParticipant.update({ where: { id: me.id }, data: { locationId: dest.id } });
      await addWarEvent(tx, {
        warId: war.id, day: war.currentDay, type: 'TRAVEL', participantId: me.id,
        message: `Viajou de ${me.location.emoji} ${me.location.name} para ${dest.emoji} ${dest.name}.`,
      });
      return {
        title: `${dest.emoji} Você chegou a: ${dest.name}`,
        lines: [
          `*${dest.description}*`,
          '',
          `Perigo: **${['', 'Baixo', 'Médio', 'Alto'][dest.dangerLevel] ?? dest.dangerLevel}**`,
          hops > 1 ? `🐎 Seu Rider cobriu **${hops}** regiões de uma vez.` : '',
        ].filter((l, i, a) => l !== '' || a[i - 1] !== ''),
        color: 'info',
      };
    });
  },

  // ------------------------------------------------------------ exploração

  async explore(guildId: string, userId: string) {
    return act(guildId, userId, 'explore', async ({ tx, war, me }) => {
      const loc = me.location!;
      const effects = parseLocationEffects(loc.effects);
      const others = await othersHere(tx, me);
      const type: ExploreEventType = rollExploreEvent(loc.dangerLevel, others.length > 0);
      const lines: string[] = [];
      let color: ActionResult['color'] = 'info';

      // Regiões ricas em mana regeneram MP de quem explora
      if (effects.manaRegen > 0 && me.currentMp < me.maxMp) {
        const mp = Math.min(effects.manaRegen, me.maxMp - me.currentMp);
        await tx.warParticipant.update({ where: { id: me.id }, data: { currentMp: { increment: mp } } });
        lines.push(`🔷 A mana da região restaura **${mp} MP**.`);
      }

      switch (type) {
        case 'nothing':
          lines.unshift(pick(texts.nothing));
          break;

        case 'npc': {
          lines.unshift(`🗣️ ${pick(texts.npc)}`);
          // Às vezes o boato revela a existência de um Master que você não conhecia
          if (randomFloat() < 0.35) {
            const unknown = await tx.warParticipant.findMany({
              where: { warId: war.id, alive: true, id: { not: me.id }, intelAsTarget: { none: { observerId: me.id } } },
              include: { user: true, location: true },
            });
            if (unknown.length) {
              const t = pick(unknown);
              await raiseIntel(tx, war, me.id, t.id, { atLeast: 0 });
              lines.push(`📜 O boato menciona um Master chamado **${t.user.username}**. Agora você pode investigá-lo.`);
            }
          }
          break;
        }

        case 'item': {
          const slug = weightedPick(exploreItems.map((e) => ({ item: e.item, weight: e.weight })));
          const item = await InventoryService.findBySlug(tx, slug);
          if (item) {
            await InventoryService.grant(tx, userId, item.id, 1, `war:${war.id}:explore`);
            lines.unshift(`🎁 Entre os escombros, vocês encontram: ${item.emoji} **${item.name}**.`);
            color = 'success';
          } else lines.unshift(pick(texts.nothing));
          break;
        }

        case 'catalyst': {
          const item = await InventoryService.rollRandomItem(tx, ItemType.CATALYST);
          if (item) {
            await InventoryService.grant(tx, userId, item.id, 1, `war:${war.id}:explore`);
            lines.unshift(`✨ Uma relíquia antiga pulsa com mana: ${item.emoji} **${item.name}** (catalisador).`);
            color = 'success';
          } else lines.unshift(pick(texts.nothing));
          break;
        }

        case 'enemy': {
          const dmg = await damage(tx, me, [0.05, 0.12]);
          const bond = await BondService.addBondXp(tx, userId, me.servantId!, 15, `war:${war.id}:enemy`);
          lines.unshift(`👹 ${pick(texts.enemy)}`, `❤️ -${dmg} HP · 💞 +15 Bond (${bond.servantName})`);
          color = 'warning';
          break;
        }

        case 'trap': {
          const agile = rankValue(me.servant!.agility) >= 5;
          const dmg = await damage(tx, me, agile ? [0.04, 0.07] : [0.08, 0.15]);
          lines.unshift(`💥 ${pick(texts.trap)}`, agile ? `Graças à agilidade do seu Servant, o dano foi reduzido. ❤️ -${dmg} HP` : `❤️ -${dmg} HP`);
          color = 'danger';
          break;
        }

        case 'special_event': {
          const mp = Math.round(me.maxMp * 0.3);
          const hp = Math.round(me.maxHp * 0.1);
          await tx.warParticipant.update({
            where: { id: me.id },
            data: { currentMp: Math.min(me.maxMp, me.currentMp + mp), currentHp: Math.min(me.maxHp, me.currentHp + hp) },
          });
          lines.unshift(`🌟 ${pick(texts.special_event)}`, `❤️ +${hp} HP · 🔷 +${mp} MP`);
          color = 'success';
          break;
        }

        case 'master':
        case 'servant': {
          const target = pick(others);
          const chance = detectionChance(investigationOf(me), stealthOf(target, war));
          if (randomFloat() < chance) {
            const { before, after } = await raiseIntel(tx, war, me.id, target.id, {
              atLeast: type === 'servant' ? 1 : 0,
              seenAt: loc.id,
            });
            const view = buildIntelView(toIntelServant(target), after, target.identityRevealed);
            if (type === 'master') {
              lines.unshift(`👁️ Você avista um Master nas sombras: **${target.user.username}**.`);
              lines.push(after >= 1 ? `Servant: ${view.classEmoji} **${view.className}**` : 'O Servant dele não estava à vista.');
            } else {
              lines.unshift(`⚡ Uma presença poderosa! Você detecta um Servant **${view.classEmoji} ${view.className}** acompanhando **${target.user.username}**.`);
            }
            if (after > before && before >= 0) lines.push('📈 Informação atualizada — veja em `/intel`.');
            color = 'warning';
            // O alvo pode perceber que foi observado
            if (randomFloat() < cfg.noticeChance) {
              await addWarEvent(tx, {
                warId: war.id, day: war.currentDay, type: 'NOTICED', participantId: target.id,
                message: `👀 Você sentiu olhares em ${loc.emoji} **${loc.name}**. Alguém pode ter te visto.`,
              });
            }
          } else {
            lines.unshift('🌫️ Você sente uma presença por um instante… mas ela se dissipa antes que possa identificá-la.');
          }
          break;
        }
      }

      await addWarEvent(tx, {
        warId: war.id, day: war.currentDay, type: `EXPLORE_${type.toUpperCase()}`, participantId: me.id,
        message: `Explorou ${loc.emoji} ${loc.name}: ${lines[0] ?? ''}`.slice(0, 500),
      });
      return { title: `🔍 Exploração — ${loc.emoji} ${loc.name}`, lines, color };
    });
  },

  // ------------------------------------------------------------ investigação

  async investigate(guildId: string, userId: string, targetUserId: string) {
    if (targetUserId === userId) throw new GameError('Você já sabe tudo sobre o seu próprio Servant.');
    return act(guildId, userId, 'investigate', async ({ tx, war, me }) => {
      const t = await tx.warParticipant.findUnique({ where: { warId_userId: { warId: war.id, userId: targetUserId } } });
      if (!t) throw new GameError('Esse jogador não participa desta Guerra.');
      const target = await loadParticipant(tx, t.id);
      const intel = await tx.playerIntel.findUnique({
        where: { warId_observerId_targetId: { warId: war.id, observerId: me.id, targetId: target.id } },
      });
      if (!intel) throw new GameError('Você ainda não sabe nada sobre esse Master. Encontre-o com `/explore` ou ouça boatos.');
      if (intel.informationLevel >= MAX_INTEL || target.identityRevealed) {
        throw new GameError('Você já conhece a verdadeira identidade desse Servant.');
      }

      const same = target.locationId === me.locationId;
      const chance = investigateChance(investigationOf(me), stealthOf(target, war), same);
      const lines: string[] = [];
      let color: ActionResult['color'];

      if (randomFloat() < chance) {
        const { after } = await raiseIntel(tx, war, me.id, target.id, { increment: true, ...(same ? { seenAt: me.locationId } : {}) });
        lines.push(`🔎 Suas investigações sobre **${target.user.username}** revelam:`, '', describeLevelGain(toIntelServant(target), after));
        if (after < MAX_INTEL) lines.push('', `Informação: **${after}/${MAX_INTEL}**`);
        color = after >= MAX_INTEL ? 'danger' : 'success';
      } else {
        lines.push(`As pistas sobre **${target.user.username}** não levaram a lugar nenhum desta vez.`);
        color = 'info';
        if (randomFloat() < cfg.noticeChance) {
          await addWarEvent(tx, {
            warId: war.id, day: war.currentDay, type: 'INVESTIGATED', participantId: target.id,
            message: '🕵️ Você percebeu que alguém está fazendo perguntas sobre você.',
          });
        }
      }
      lines.push('', `Chance desta investigação: ${Math.round(chance * 100)}%${same ? ' (mesma região: bônus)' : ''}`);
      await addWarEvent(tx, {
        warId: war.id, day: war.currentDay, type: 'INVESTIGATE', participantId: me.id,
        message: `Investigou ${target.user.username}: ${lines[0]}`.slice(0, 500),
      });
      return { title: '🕵️ Investigação', lines, color };
    });
  },

  // ------------------------------------------------------------ hide / train

  async hide(guildId: string, userId: string) {
    return act(guildId, userId, 'hide', async ({ tx, war, me }) => {
      if (isHidden(me, war)) throw new GameError('Você já está oculto até o fim do dia.');
      await tx.warParticipant.update({ where: { id: me.id }, data: { hiddenOnDay: war.currentDay } });
      const mods = parseClassModifiers(me.servant?.class.modifiers);
      await addWarEvent(tx, { warId: war.id, day: war.currentDay, type: 'HIDE', participantId: me.id, message: 'Ocultou-se.' });
      return {
        title: '🌑 Oculto',
        lines: [
          'Você apaga seus rastros de mana e se mantém longe dos olhares.',
          `Sua furtividade fica **×${cfg.hideStealthMultiplier}** até o fim do dia${mods.stealth > 1.2 ? ' — somada à Ocultação de Presença do seu Servant' : ''}.`,
        ],
        color: 'info',
      };
    });
  },

  async train(guildId: string, userId: string) {
    return act(guildId, userId, 'train', async ({ tx, war, me }) => {
      const bond = await BondService.addBondXp(tx, userId, me.servantId!, cfg.train.bondXp, `war:${war.id}:train`);
      const stacks = Math.min(cfg.train.maxStacks, me.trainingStacks + 1);
      await tx.warParticipant.update({ where: { id: me.id }, data: { trainingStacks: stacks } });
      await addWarEvent(tx, { warId: war.id, day: war.currentDay, type: 'TRAIN', participantId: me.id, message: 'Treinou com o Servant.' });
      return {
        title: '🏋️ Treino',
        lines: [
          `Você e **${bond.servantName}** passam horas coordenando táticas.`,
          `💞 +${cfg.train.bondXp} Bond${bond.reached.length ? ` — **Bond ${bond.level}!**` : ''}`,
          ...bond.rewards.map((r) => `   ↳ ${r.text}`),
          `🎯 Preparo para combate: **${stacks}/${cfg.train.maxStacks}**${stacks === me.trainingStacks ? ' (máximo)' : ''}`,
        ],
        color: 'success',
      };
    });
  },

  // ------------------------------------------------------------ consultas (sem AP)

  async locationView(guildId: string, userId: string) {
    const war = await WarService.requireOpenWar(guildId);
    if (war.status !== WarStatus.ACTIVE) throw new GameError('A Guerra ainda não começou.');
    const p = await prisma.warParticipant.findUnique({ where: { warId_userId: { warId: war.id, userId } } });
    if (!p) throw new GameError('Você não participa desta Guerra.');
    const me = await loadParticipant(prisma, p.id);
    if (!me.location) throw new GameError('Sua posição é desconhecida.');

    const locations = await prisma.warLocation.findMany({ where: { warId: war.id } });
    const bySlug = new Map(locations.map((l) => [l.slug, l]));
    const connections = me.location.connections.map((c) => bySlug.get(c)).filter((l): l is NonNullable<typeof l> => !!l);

    // Presenças que VOCÊ detectou nesta região hoje
    const sightings = await prisma.playerIntel.findMany({
      where: { warId: war.id, observerId: me.id, lastSeenLocationId: me.location.id, lastSeenDay: war.currentDay },
      include: { target: { include: participantInclude } },
    });
    const presences = sightings.map((s) => {
      const view = buildIntelView(toIntelServant(s.target), s.informationLevel, s.target.identityRevealed);
      return { master: s.target.user.username, view };
    });

    return { war, me, location: me.location, connections, presences, hidden: isHidden(me, war) };
  },

  async intelList(guildId: string, userId: string) {
    const war = await WarService.requireOpenWar(guildId);
    const me = await prisma.warParticipant.findUnique({ where: { warId_userId: { warId: war.id, userId } } });
    if (!me) throw new GameError('Você não participa desta Guerra.');
    const rows = await prisma.playerIntel.findMany({
      where: { warId: war.id, observerId: me.id },
      include: { target: { include: participantInclude } },
      orderBy: { informationLevel: 'desc' },
    });
    const locations = await prisma.warLocation.findMany({ where: { warId: war.id } });
    const locById = new Map(locations.map((l) => [l.id, l]));
    return {
      war,
      entries: rows.map((r) => ({
        master: r.target.user.username,
        userId: r.target.userId,
        alive: r.target.alive,
        view: buildIntelView(toIntelServant(r.target), r.informationLevel, r.target.identityRevealed),
        lastSeen: r.lastSeenLocationId ? { location: locById.get(r.lastSeenLocationId) ?? null, day: r.lastSeenDay } : null,
      })),
    };
  },

  /** Masters conhecidos (para autocomplete de /investigate) */
  async knownTargets(guildId: string, userId: string) {
    const war = await WarService.getOpenWar(guildId);
    if (!war) return [];
    const me = await prisma.warParticipant.findUnique({ where: { warId_userId: { warId: war.id, userId } } });
    if (!me) return [];
    const rows = await prisma.playerIntel.findMany({
      where: { warId: war.id, observerId: me.id, target: { alive: true } },
      include: { target: { include: { user: true } } },
    });
    return rows.map((r) => ({ userId: r.target.userId, name: r.target.user.username, level: r.informationLevel }));
  },
};
