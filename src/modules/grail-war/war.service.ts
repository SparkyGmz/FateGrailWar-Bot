import { ItemType, Prisma, WarStatus, type GrailWar } from '@prisma/client';
import { gameConfig } from '../../config/game';
import { maps } from '../../content/maps';
import { lockWar } from '../../database/locks';
import { prisma, type Db, type Tx } from '../../database/prisma';
import { GameError } from '../../shared/errors';
import { LogService } from '../logs/log.service';
import { BondService } from '../bond/bond.service';
import { InventoryService } from '../inventory/inventory.service';
import { TitleService } from '../titles/title.service';
import { UserService } from '../users/user.service';
import { nextDayBoundary, validateGraph } from './war.logic';

export const OPEN_STATUSES: WarStatus[] = [WarStatus.REGISTRATION, WarStatus.PREPARATION, WarStatus.ACTIVE];

const cfg = gameConfig.war;

export function nextDayAt(now = new Date()): Date {
  return nextDayBoundary(now, cfg.dayResetHour, gameConfig.summon.utcOffsetMinutes);
}

/** Registra um evento da Guerra. Públicos são publicados no canal pelo scheduler. */
export async function addWarEvent(
  db: Db,
  e: { warId: number; day: number; type: string; message: string; participantId?: number | null; isPublic?: boolean; data?: Prisma.InputJsonValue },
): Promise<void> {
  await db.warEvent.create({
    data: {
      warId: e.warId,
      day: e.day,
      type: e.type,
      message: e.message,
      participantId: e.participantId ?? null,
      isPublic: e.isPublic ?? false,
      data: e.data ?? {},
    },
  });
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j]!, a[i]!];
  }
  return a;
}

export const WarService = {
  async getOpenWar(guildId: string) {
    return prisma.grailWar.findFirst({
      where: { guildId, status: { in: OPEN_STATUSES } },
      orderBy: { createdAt: 'desc' },
    });
  },

  async requireOpenWar(guildId: string): Promise<GrailWar> {
    const war = await WarService.getOpenWar(guildId);
    if (!war) throw new GameError('Não há nenhuma Guerra do Santo Graal aberta neste servidor.');
    return war;
  },

  async create(p: {
    guildId: string;
    channelId: string;
    adminId: string;
    name: string;
    maxPlayers: number;
    minPlayers?: number;
    registrationHours: number;
    mapSlug?: string;
  }) {
    const existing = await WarService.getOpenWar(p.guildId);
    if (existing) throw new GameError(`Já existe uma Guerra aberta: **${existing.name}** (${existing.status}).`);

    const map = maps.find((m) => m.slug === (p.mapSlug ?? 'fuyuki'));
    if (!map) throw new GameError('Mapa não encontrado.');
    const graphErrors = validateGraph(map.locations);
    if (graphErrors.length) throw new Error(`Mapa ${map.slug} inválido: ${graphErrors.join('; ')}`);

    const maxPlayers = Math.min(cfg.hardMaxPlayers, Math.max(1, p.maxPlayers));
    const minPlayers = Math.min(maxPlayers, Math.max(1, p.minPlayers ?? cfg.defaultMinPlayers));
    return prisma.$transaction(async (tx) => {
      const war = await tx.grailWar.create({
        data: {
          guildId: p.guildId,
          channelId: p.channelId,
          name: p.name,
          createdById: p.adminId,
          minPlayers,
          maxPlayers,
          mapSlug: map.slug,
          registrationEnd: new Date(Date.now() + p.registrationHours * 3600 * 1000),
        },
      });
      await tx.warLocation.createMany({
        data: map.locations.map((l) => ({
          warId: war.id,
          slug: l.slug,
          name: l.name,
          emoji: l.emoji,
          description: l.description,
          dangerLevel: l.dangerLevel,
          connections: l.connections,
          effects: l.effects ?? {},
        })),
      });
      await addWarEvent(tx, {
        warId: war.id, day: 0, type: 'WAR_CREATED', isPublic: true,
        message: `🏆 **A ${war.name} foi anunciada!** O Graal escolherá até **${maxPlayers}** Masters.\nUse \`/grailwar join\` para responder ao chamado.`,
      });
      await LogService.log(tx, p.adminId, 'WAR_CREATED', { warId: war.id, name: war.name });
      return war;
    });
  },

  async join(guildId: string, userId: string, username: string) {
    const war = await WarService.requireOpenWar(guildId);
    if (war.status !== WarStatus.REGISTRATION) throw new GameError('As inscrições desta Guerra estão encerradas.');
    return prisma.$transaction(async (tx) => {
      await lockWar(tx, war.id);
      const count = await tx.warParticipant.count({ where: { warId: war.id } });
      if (count >= war.maxPlayers) throw new GameError('Todas as vagas de Master já foram preenchidas.');
      try {
        await tx.warParticipant.create({ data: { warId: war.id, userId } });
      } catch (err) {
        if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
          throw new GameError('Você já está inscrito nesta Guerra.');
        }
        throw err;
      }
      await addWarEvent(tx, {
        warId: war.id, day: 0, type: 'JOIN', isPublic: true,
        message: `🩸 Os Selos de Comando surgiram na mão de **${username}**. (${count + 1}/${war.maxPlayers} Masters)`,
      });
      await LogService.log(tx, userId, 'WAR_JOINED', { warId: war.id });
      return { war, count: count + 1 };
    });
  },

  async leave(guildId: string, userId: string) {
    const war = await WarService.requireOpenWar(guildId);
    if (war.status === WarStatus.ACTIVE) throw new GameError('Não é possível abandonar uma Guerra em andamento.');
    const res = await prisma.warParticipant.deleteMany({ where: { warId: war.id, userId } });
    if (res.count === 0) throw new GameError('Você não está inscrito nesta Guerra.');
    await LogService.log(prisma, userId, 'WAR_LEFT', { warId: war.id });
    return war;
  },

  async setServant(guildId: string, userId: string, servantId: number) {
    const war = await WarService.requireOpenWar(guildId);
    if (war.status === WarStatus.ACTIVE) throw new GameError('O contrato não pode ser alterado depois que a Guerra começou.');
    const participant = await prisma.warParticipant.findUnique({ where: { warId_userId: { warId: war.id, userId } } });
    if (!participant) throw new GameError('Inscreva-se primeiro com `/grailwar join`.');
    const owned = await prisma.playerServant.findUnique({
      where: { userId_servantId: { userId, servantId } },
      include: { servant: { include: { class: true } } },
    });
    if (!owned) throw new GameError('Você só pode firmar contrato com um Servant da sua coleção.');
    await prisma.warParticipant.update({ where: { id: participant.id }, data: { servantId } });
    await LogService.log(prisma, userId, 'WAR_CONTRACT', { warId: war.id, servant: owned.servant.slug });
    return { war, servant: owned.servant };
  },

  async start(guildId: string, adminId: string, dropWithoutServant: boolean) {
    const war = await WarService.requireOpenWar(guildId);
    if (war.status === WarStatus.ACTIVE) throw new GameError('Esta Guerra já começou.');

    return prisma.$transaction(async (tx) => {
      await lockWar(tx, war.id);
      let participants = await tx.warParticipant.findMany({
        where: { warId: war.id },
        include: { user: true, servant: { include: { class: true } } },
      });
      const missing = participants.filter((p) => !p.servant);
      if (missing.length) {
        if (!dropWithoutServant) {
          throw new GameError(
            `Masters sem contrato: ${missing.map((m) => `**${m.user.username}**`).join(', ')}.\n` +
              'Peça que usem `/grailwar servant`, ou inicie com `remover_sem_servant:True`.',
          );
        }
        await tx.warParticipant.deleteMany({ where: { id: { in: missing.map((m) => m.id) } } });
        participants = participants.filter((p) => p.servant);
      }
      if (participants.length < war.minPlayers) {
        throw new GameError(`São necessários pelo menos **${war.minPlayers}** Masters com contrato (há ${participants.length}).`);
      }

      const locations = await tx.warLocation.findMany({ where: { warId: war.id } });
      const spread = shuffle(locations);
      for (const [i, p] of participants.entries()) {
        const s = p.servant!;
        const loc = spread[i % spread.length]!;
        await tx.warParticipant.update({
          where: { id: p.id },
          data: {
            maxHp: s.baseHp, currentHp: s.baseHp,
            maxMp: s.baseMp, currentMp: s.baseMp,
            commandSpells: cfg.commandSpells,
            actionsRemaining: cfg.apPerDay,
            locationId: loc.id,
            alive: true,
          },
        });
        await addWarEvent(tx, {
          warId: war.id, day: 1, type: 'START_LOCATION', participantId: p.id,
          message: `Você e **${s.name}** começam a Guerra em ${loc.emoji} **${loc.name}**.`,
        });
      }

      const updated = await tx.grailWar.update({
        where: { id: war.id },
        data: { status: WarStatus.ACTIVE, paused: false, currentDay: 1, startDate: new Date(), nextDayAt: nextDayAt() },
      });
      await addWarEvent(tx, {
        warId: war.id, day: 1, type: 'WAR_STARTED', isPublic: true,
        message: [
          `⚔️ **A ${war.name} começou!** ${participants.length} Masters e seus Servants se espalham por Fuyuki.`,
          'Suas ações são secretas: use `/location`, `/explore`, `/investigate`, `/hide`, `/train` e `/travel`.',
          `Cada Master tem **${cfg.apPerDay} AP** por dia.`,
        ].join('\n'),
      });
      await LogService.log(tx, adminId, 'WAR_STARTED', { warId: war.id, players: participants.length });
      return { war: updated, players: participants.length };
    });
  },

  async setPaused(guildId: string, adminId: string, paused: boolean) {
    const war = await WarService.requireOpenWar(guildId);
    if (war.status !== WarStatus.ACTIVE) throw new GameError('Só uma Guerra em andamento pode ser pausada.');
    if (war.paused === paused) throw new GameError(paused ? 'A Guerra já está pausada.' : 'A Guerra não está pausada.');
    await prisma.$transaction(async (tx) => {
      await tx.grailWar.update({
        where: { id: war.id },
        data: { paused, ...(paused ? {} : { nextDayAt: nextDayAt() }) },
      });
      await addWarEvent(tx, {
        warId: war.id, day: war.currentDay, type: paused ? 'PAUSED' : 'RESUMED', isPublic: true,
        message: paused ? '⏸️ **A Guerra foi pausada pelo supervisor.** Nenhuma ação pode ser realizada.' : '▶️ **A Guerra foi retomada.**',
      });
      await LogService.log(tx, adminId, 'WAR_STATUS', { warId: war.id, paused });
    });
  },

  async end(guildId: string, adminId: string, cancel: boolean) {
    const war = await WarService.requireOpenWar(guildId);
    return prisma.$transaction(async (tx) => {
      await lockWar(tx, war.id);
      if (cancel || war.status !== WarStatus.ACTIVE) {
        const status = cancel ? WarStatus.CANCELLED : WarStatus.FINISHED;
        await tx.grailWar.update({ where: { id: war.id }, data: { status, endDate: new Date(), nextDayAt: null } });
        await tx.battle.updateMany({ where: { warId: war.id, status: 'ACTIVE' }, data: { status: 'FINISHED', endedReason: 'CANCELLED', endedAt: new Date() } });
        await addWarEvent(tx, {
          warId: war.id, day: war.currentDay, type: status, isPublic: true,
          message: cancel ? `❌ **A ${war.name} foi cancelada.**` : `🏁 **A ${war.name} foi encerrada pelo supervisor.**`,
        });
        await LogService.log(tx, adminId, 'WAR_STATUS', { warId: war.id, status });
        return { war, status };
      }
      // Guerra ativa encerrada manualmente: sem vencedor, mas com recompensas de participação e histórico
      await WarService.finishWar(tx, war.id, null);
      await LogService.log(tx, adminId, 'WAR_STATUS', { warId: war.id, status: 'FINISHED', manual: true });
      return { war, status: WarStatus.FINISHED };
    }, { timeout: 30000 });
  },

  /**
   * Encerra a Guerra, entrega recompensas, grava o histórico e revela os Servants.
   * `winnerPid` nulo = encerramento sem vencedor.
   */
  async finishWar(tx: Tx, warId: number, winnerPid: number | null): Promise<void> {
    const war = await tx.grailWar.findUniqueOrThrow({ where: { id: warId } });
    if (war.status === WarStatus.FINISHED || war.status === WarStatus.CANCELLED) return;
    const participants = await tx.warParticipant.findMany({
      where: { warId },
      include: { user: true, servant: { include: { class: true } } },
    });
    const winner = participants.find((p) => p.id === winnerPid) ?? null;
    const v = gameConfig.victory;

    await tx.battle.updateMany({ where: { warId, status: 'ACTIVE' }, data: { status: 'FINISHED', endedReason: 'CANCELLED', endedAt: new Date() } });
    await tx.grailWar.update({
      where: { id: warId },
      data: { status: WarStatus.FINISHED, endDate: new Date(), nextDayAt: null, winnerId: winner?.userId ?? null },
    });

    for (const p of participants) {
      const isWinner = p.id === winner?.id;
      const r = isWinner ? v.winner : null;
      const xp = r ? r.xp : v.participant.xp + p.kills * v.participant.xpPerKill;
      const coins = r ? r.coins : v.participant.coins;
      await tx.user.update({
        where: { id: p.userId },
        data: {
          warsPlayed: { increment: 1 },
          coins: { increment: coins },
          ...(r ? { spiritOrigin: { increment: r.spiritOrigin }, grails: { increment: r.grails }, wins: { increment: 1 } } : {}),
          ...(!isWinner && winner ? { losses: { increment: 1 } } : {}),
        },
      });
      await UserService.addXp(tx, p.userId, xp);
      if (p.servantId) {
        await BondService.addBondXp(tx, p.userId, p.servantId, r ? r.bondXp : v.participant.bondXp, `war:${warId}:end`);
      }
      if (isWinner) {
        await TitleService.grant(tx, p.userId, `war-winner:${warId}`, v.winnerTitle.replace('{war}', war.name), 'war');
        const cat = await InventoryService.rollRandomItem(tx, ItemType.CATALYST);
        if (cat) await InventoryService.grant(tx, p.userId, cat.id, 1, `war:${warId}:victory`);
        await LogService.log(tx, p.userId, 'WAR_VICTORY', { warId });
      }
      await LogService.log(tx, p.userId, 'WAR_REWARD', { warId, xp, coins, winner: isWinner });
    }

    const days = war.currentDay;
    const totalKills = participants.reduce((s, p) => s + p.kills, 0);
    await tx.warHistory.upsert({
      where: { warId },
      create: {
        warId,
        winnerId: winner?.userId ?? null,
        servantId: winner?.servantId ?? null,
        durationDays: days,
        kills: totalKills,
        participants: participants.map((p) => ({
          userId: p.userId, username: p.user.username, servant: p.servant?.slug ?? null,
          kills: p.kills, damageDealt: p.damageDealt, alive: p.alive,
        })),
      },
      update: {},
    });

    const reveal = participants
      .filter((p) => p.servant)
      .map((p) => `${p.alive ? '🩸' : '💀'} **${p.user.username}** — ${p.servant!.class.emoji} ${p.servant!.class.name} **${p.servant!.name}** · ${p.kills} abate(s)`)
      .join('\n');
    await addWarEvent(tx, {
      warId, day: days, type: 'WAR_FINISHED', isPublic: true,
      message: [
        winner
          ? `🏆 **O Santo Graal escolheu seu vencedor!**\n\nMaster **${winner.user.username}** e ${winner.servant!.class.emoji} **${winner.servant!.class.name} — ${winner.servant!.name}** triunfaram na **${war.name}** após ${days} dia(s).`
          : `🏁 **A ${war.name} terminou sem vencedor** após ${days} dia(s).`,
        '',
        '**As identidades verdadeiras:**',
        reveal,
      ].join('\n').slice(0, 4000),
    });
  },

  /** Virada de dia: restaura AP, regenera HP/MP e anuncia o novo dia */
  async advanceDay(warId: number, tx?: Tx): Promise<number | null> {
    const run = async (t: Tx) => {
      await lockWar(t, warId);
      const war = await t.grailWar.findUniqueOrThrow({ where: { id: warId } });
      if (war.status !== WarStatus.ACTIVE || war.paused) return null;
      const day = war.currentDay + 1;

      const participants = await t.warParticipant.findMany({
        where: { warId, alive: true },
        include: { servant: { include: { class: true } } },
      });
      for (const p of participants) {
        const mods = (p.servant?.class.modifiers ?? {}) as Record<string, unknown>;
        const manaRegen = typeof mods.manaRegen === 'number' ? mods.manaRegen : 1;
        await t.warParticipant.update({
          where: { id: p.id },
          data: {
            actionsRemaining: cfg.apPerDay,
            currentHp: Math.min(p.maxHp, p.currentHp + Math.round(p.maxHp * cfg.dailyHpRegen)),
            currentMp: Math.min(p.maxMp, p.currentMp + Math.round(p.maxMp * cfg.dailyMpRegen * manaRegen)),
          },
        });
      }
      await t.grailWar.update({ where: { id: warId }, data: { currentDay: day, nextDayAt: nextDayAt() } });
      await addWarEvent(t, {
        warId, day, type: 'NEW_DAY', isPublic: true,
        message: `🌅 **Dia ${day} da ${war.name}.** ${participants.length} Masters seguem na disputa. Os AP foram restaurados.`,
      });
      await LogService.log(t, null, 'WAR_DAY', { warId, day });
      return day;
    };
    return tx ? run(tx) : prisma.$transaction(run);
  },

  async forceNextDay(guildId: string): Promise<number> {
    const war = await WarService.requireOpenWar(guildId);
    if (war.status !== WarStatus.ACTIVE) throw new GameError('A Guerra não está em andamento.');
    if (war.paused) throw new GameError('A Guerra está pausada.');
    const day = await WarService.advanceDay(war.id);
    if (day === null) throw new GameError('Não foi possível avançar o dia.');
    return day;
  },

  async overview(guildId: string, userId: string) {
    const war = await WarService.requireOpenWar(guildId);
    const participants = await prisma.warParticipant.findMany({
      where: { warId: war.id },
      include: { user: true, location: true, servant: { include: { class: true } } },
      orderBy: { joinedAt: 'asc' },
    });
    const me = participants.find((p) => p.userId === userId) ?? null;
    return { war, participants, me };
  },

  async myEvents(guildId: string, userId: string, limit = 10) {
    const war = await WarService.requireOpenWar(guildId);
    const me = await prisma.warParticipant.findUnique({ where: { warId_userId: { warId: war.id, userId } } });
    if (!me) throw new GameError('Você não participa desta Guerra.');
    const events = await prisma.warEvent.findMany({
      where: { warId: war.id, participantId: me.id, isPublic: false },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
    return { war, events };
  },

  // ---------------------------------------------------------------- jobs

  async closeExpiredRegistrations(now = new Date()): Promise<number> {
    const wars = await prisma.grailWar.findMany({
      where: { status: WarStatus.REGISTRATION, registrationEnd: { lte: now } },
    });
    for (const war of wars) {
      await prisma.$transaction(async (tx) => {
        const upd = await tx.grailWar.updateMany({
          where: { id: war.id, status: WarStatus.REGISTRATION },
          data: { status: WarStatus.PREPARATION },
        });
        if (upd.count === 0) return;
        await addWarEvent(tx, {
          warId: war.id, day: 0, type: 'REGISTRATION_CLOSED', isPublic: true,
          message: '📜 **As inscrições foram encerradas.** Masters: confirmem seus contratos com `/grailwar servant` antes do início.',
        });
      });
    }
    return wars.length;
  },

  async advanceDueDays(now = new Date()): Promise<number> {
    const wars = await prisma.grailWar.findMany({
      where: { status: WarStatus.ACTIVE, paused: false, nextDayAt: { lte: now } },
      select: { id: true },
    });
    for (const w of wars) await WarService.advanceDay(w.id);
    return wars.length;
  },

  async pendingPublicEvents(limit = 20) {
    return prisma.warEvent.findMany({
      where: { isPublic: true, announcedAt: null },
      include: { war: { select: { channelId: true } } },
      orderBy: { id: 'asc' },
      take: limit,
    });
  },

  async markAnnounced(ids: number[]) {
    if (ids.length) await prisma.warEvent.updateMany({ where: { id: { in: ids } }, data: { announcedAt: new Date() } });
  },
};
