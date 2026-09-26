import { EmbedBuilder } from 'discord.js';
import type { WarEvent } from '@prisma/client';
import { gameConfig } from '../../config/game';
import type { ActionResult, WarActionService } from '../../modules/grail-war/war-action.service';
import type { WarService } from '../../modules/grail-war/war.service';
import type { IntelView } from '../../modules/grail-war/war.logic';
import { MAX_INTEL } from '../../modules/grail-war/war.logic';
import { discordTime, progressBar } from '../../shared/format';
import { COLORS } from './common';

const STATUS_LABEL: Record<string, string> = {
  REGISTRATION: '📜 Inscrições abertas',
  PREPARATION: '🕯️ Preparação',
  ACTIVE: '⚔️ Em andamento',
  FINISHED: '🏁 Encerrada',
  CANCELLED: '❌ Cancelada',
};
const DANGER = ['', 'Baixo', 'Médio', 'Alto'];

export function commandSpells(n: number): string {
  const max = gameConfig.war.commandSpells;
  return '🔴 '.repeat(n).trim() + (n < max ? ' ' + '⚪ '.repeat(max - n).trim() : '');
}

type Overview = Awaited<ReturnType<typeof WarService.overview>>;

export function warStatusEmbed(o: Overview): EmbedBuilder {
  const { war, participants, me } = o;
  const alive = participants.filter((p) => p.alive).length;
  const embed = new EmbedBuilder()
    .setColor(COLORS.ritual)
    .setTitle(`🏆 ${war.name}`)
    .setDescription(
      [
        `**Status:** ${STATUS_LABEL[war.status] ?? war.status}${war.paused ? ' (⏸️ pausada)' : ''}`,
        war.status === 'ACTIVE' ? `**Dia:** ${war.currentDay}${war.nextDayAt && !war.paused ? ` · próximo ${discordTime(war.nextDayAt, 'R')}` : ''}` : '',
        war.status === 'REGISTRATION' && war.registrationEnd ? `Inscrições até ${discordTime(war.registrationEnd, 'f')}` : '',
        `**Masters:** ${war.status === 'ACTIVE' ? `${alive} vivos de ${participants.length}` : `${participants.length}/${war.maxPlayers}`}`,
      ].filter(Boolean).join('\n'),
    );

  if (participants.length) {
    embed.addFields({
      name: 'Masters',
      value: participants
        .map((p) => `${p.alive ? '🩸' : '💀'} ${p.user.username}${war.status !== 'ACTIVE' ? (p.servantId ? ' · contrato firmado' : ' · *sem contrato*') : ''}`)
        .join('\n')
        .slice(0, 1024),
    });
  }

  if (me) {
    if (!me.servant) {
      embed.addFields({ name: 'Você', value: 'Inscrito, mas **sem contrato**. Use `/grailwar servant`.' });
    } else if (war.status !== 'ACTIVE') {
      embed.addFields({ name: 'Seu contrato (secreto)', value: `${me.servant.class.emoji} **${me.servant.class.name} — ${me.servant.name}**` });
    } else {
      embed.addFields({
        name: 'Seu Servant (secreto)',
        value: [
          `${me.servant.class.emoji} **${me.servant.class.name} — ${me.servant.name}**${me.alive ? '' : ' · 💀 eliminado'}`,
          `❤️ ${progressBar(me.currentHp, me.maxHp)} ${me.currentHp}/${me.maxHp}`,
          `🔷 ${progressBar(me.currentMp, me.maxMp)} ${me.currentMp}/${me.maxMp}`,
          `⚡ AP **${me.actionsRemaining}/${gameConfig.war.apPerDay}** · Selos ${commandSpells(me.commandSpells)}`,
          me.location ? `📍 ${me.location.emoji} ${me.location.name}${me.hiddenOnDay === war.currentDay ? ' · 🌑 oculto' : ''}` : '',
          me.trainingStacks ? `🎯 Preparo ${me.trainingStacks}/${gameConfig.war.train.maxStacks}` : '',
        ].filter(Boolean).join('\n'),
      });
    }
  } else if (war.status === 'REGISTRATION') {
    embed.addFields({ name: 'Você', value: 'Não inscrito. Use `/grailwar join`.' });
  }
  embed.setFooter({ text: 'Só você vê esta mensagem. Identidades de Servants nunca são publicadas.' });
  return embed;
}

const RESULT_COLOR = { success: COLORS.success, warning: 0xf59e0b, danger: COLORS.error, info: COLORS.info } as const;

export function actionResultEmbed(r: ActionResult): EmbedBuilder {
  return new EmbedBuilder()
    .setColor(RESULT_COLOR[r.color ?? 'info'])
    .setTitle(r.title)
    .setDescription(r.lines.join('\n').slice(0, 4000))
    .setFooter({ text: `AP restantes: ${r.apLeft}/${gameConfig.war.apPerDay}` });
}

type LocationView = Awaited<ReturnType<typeof WarActionService.locationView>>;

function intelLine(v: IntelView): string {
  if (v.identity) return `${v.classEmoji} **${v.className} — ${v.identity}**`;
  if (v.className) return `${v.classEmoji} ${v.className} — Identidade: ???`;
  return 'Servant: ???';
}

export function locationEmbed(v: LocationView): EmbedBuilder {
  const embed = new EmbedBuilder()
    .setColor(COLORS.info)
    .setTitle(`${v.location.emoji} ${v.location.name}`)
    .setDescription(
      [
        `*${v.location.description}*`,
        '',
        `**Perigo:** ${DANGER[v.location.dangerLevel] ?? v.location.dangerLevel}`,
        v.hidden ? '🌑 Você está **oculto** até o fim do dia.' : '',
      ].filter((l, i, a) => l !== '' || a[i - 1] !== '').join('\n'),
    )
    .addFields(
      {
        name: 'Presenças detectadas',
        value: v.presences.length
          ? v.presences.map((p) => `👤 **${p.master}** — ${intelLine(p.view)}`).join('\n')
          : '???  *(use `/explore` para procurar)*',
      },
      { name: 'Conexões', value: v.connections.map((c) => `→ ${c.emoji} ${c.name}`).join('\n') || '—' },
    )
    .setFooter({ text: `Dia ${v.war.currentDay} · AP ${v.me.actionsRemaining}/${gameConfig.war.apPerDay}` });
  return embed;
}

type IntelList = Awaited<ReturnType<typeof WarActionService.intelList>>;

export function intelCardEmbed(entry: IntelList['entries'][number]): EmbedBuilder {
  const v = entry.view;
  const statBlock = '```\n' + v.stats.map((s) => `${s.label.padEnd(5)} ${s.value}`).join('\n') + '\n```';
  return new EmbedBuilder()
    .setColor(v.identity ? 0xdc2626 : COLORS.ritual)
    .setTitle(`Enemy Servant — Master ${entry.master}${entry.alive ? '' : ' 💀'}`)
    .addFields(
      { name: 'Classe', value: v.className ? `${v.classEmoji} ${v.className}` : '???', inline: true },
      { name: 'Identidade', value: v.identity ?? '???', inline: true },
      { name: 'Informação', value: `${progressBar(v.level, MAX_INTEL, 5)} ${Math.max(0, v.level)}/${MAX_INTEL}`, inline: true },
      { name: 'Parâmetros', value: statBlock, inline: true },
      {
        name: 'Pistas',
        value: [
          `Origem provável: **${v.region ?? '???'}**`,
          `Era: **${v.era ?? '???'}**`,
          `Noble Phantasm: **${v.np ?? '???'}**`,
        ].join('\n'),
        inline: true,
      },
    )
    .setFooter({
      text: entry.lastSeen?.location
        ? `Visto por último em ${entry.lastSeen.location.name} (dia ${entry.lastSeen.day})`
        : 'Localização desconhecida',
    });
}

export function intelListEmbed(list: IntelList): EmbedBuilder {
  const embed = new EmbedBuilder().setColor(COLORS.ritual).setTitle('🗂️ Seu dossiê de inimigos');
  if (!list.entries.length) {
    return embed.setDescription('Você ainda não sabe nada sobre os outros Masters. Explore Fuyuki com `/explore`.');
  }
  return embed
    .setDescription(
      list.entries
        .map((e) => `${e.alive ? '👤' : '💀'} **${e.master}** — ${intelLine(e.view)} · info ${Math.max(0, e.view.level)}/${MAX_INTEL}`)
        .join('\n'),
    )
    .setFooter({ text: 'Detalhes: /intel master:@Master · Descubra mais com /investigate' });
}

export function warLogEmbed(events: WarEvent[]): EmbedBuilder {
  return new EmbedBuilder()
    .setColor(COLORS.info)
    .setTitle('📓 Seu diário de guerra')
    .setDescription(
      events.length
        ? events.map((e) => `\`Dia ${e.day}\` ${e.message}`).join('\n').slice(0, 4000)
        : 'Nada registrado ainda.',
    );
}

export function publicEventEmbed(message: string, day: number): EmbedBuilder {
  return new EmbedBuilder().setColor(COLORS.ritual).setDescription(message).setFooter({ text: day > 0 ? `Dia ${day}` : 'Guerra do Santo Graal' });
}
