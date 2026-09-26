import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  type Client,
  type MessageCreateOptions,
  type TextBasedChannel,
} from 'discord.js';
import { gameConfig } from '../../config/game';
import { BattleService, publicLabel } from '../../modules/battle/battle.service';
import { discordTime, progressBar } from '../../shared/format';
import { logger } from '../../shared/logger';
import { customId } from '../types';
import { COLORS } from '../embeds/common';
import { commandSpells } from '../embeds/war.embed';

type View = Awaited<ReturnType<typeof BattleService.publicView>>;

function side(p: View['attacker'], isTurn: boolean): string {
  const s = p.servant!;
  const pct = p.maxHp ? p.currentHp / p.maxHp : 0;
  return [
    `${s.class.emoji} **${publicLabel(p)}**${isTurn ? ' ⏳' : ''}`,
    `Master: ${p.user.username}`,
    `❤️ ${progressBar(pct, 1)} ${Math.round(pct * 100)}%`,
    `Selos: ${commandSpells(p.commandSpells)}`,
  ].join('\n');
}

const REASON: Record<string, string> = {
  KO: '☠️ Vitória por nocaute',
  RETREAT: '🏃 Um dos lados recuou',
  ESCAPE: '🌀 Fuga com Selo de Comando',
  CANCELLED: '❌ Batalha interrompida',
};

export function renderBattle(v: View): { content: string; embeds: EmbedBuilder[]; components: ActionRowBuilder<ButtonBuilder>[] } {
  const { battle, attacker, defender, location } = v;
  const active = battle.status === 'ACTIVE';
  const actor = battle.currentActorId === attacker.id ? attacker : defender;
  const log = (Array.isArray(battle.log) ? (battle.log as string[]) : []).join('\n');

  const embed = new EmbedBuilder()
    .setColor(active ? COLORS.error : COLORS.ritual)
    .setTitle(`⚔️ Batalha${location ? ` — ${location.emoji} ${location.name}` : ''}`)
    .addFields(
      { name: 'Atacante', value: side(attacker, active && actor.id === attacker.id), inline: true },
      { name: 'Defensor', value: side(defender, active && actor.id === defender.id), inline: true },
    )
    .setDescription(log.slice(-3800) || '—');

  if (active) {
    embed.addFields({
      name: `Turno ${battle.turn}`,
      value: `Vez de **${actor.user.username}** · tempo limite ${discordTime(battle.turnDeadline, 'R')}\n*Se o tempo acabar, o Servant ataca sozinho.*`,
    });
  } else {
    const winner = battle.winnerId === attacker.id ? attacker : battle.winnerId === defender.id ? defender : null;
    embed.addFields({
      name: 'Resultado',
      value: `${REASON[battle.endedReason ?? ''] ?? 'Fim'}${winner ? ` — **${publicLabel(winner)}** (${winner.user.username}) venceu` : ''}`,
    });
  }

  const id = (action: string) => customId('bt', '*', battle.id, action);
  const components = active
    ? [
        new ActionRowBuilder<ButtonBuilder>().addComponents(
          new ButtonBuilder().setCustomId(id('attack')).setLabel('Atacar').setEmoji('⚔️').setStyle(ButtonStyle.Danger),
          new ButtonBuilder().setCustomId(id('defend')).setLabel('Defender').setEmoji('🛡️').setStyle(ButtonStyle.Secondary),
          new ButtonBuilder().setCustomId(id('skill')).setLabel('Skill').setEmoji('✨').setStyle(ButtonStyle.Primary),
          new ButtonBuilder().setCustomId(id('np')).setLabel('Noble Phantasm').setEmoji('💥').setStyle(ButtonStyle.Primary),
        ),
        new ActionRowBuilder<ButtonBuilder>().addComponents(
          new ButtonBuilder().setCustomId(id('cs')).setLabel('Selo de Comando').setEmoji('🔴').setStyle(ButtonStyle.Secondary),
          new ButtonBuilder().setCustomId(id('retreat')).setLabel('Recuar').setEmoji('🏃').setStyle(ButtonStyle.Secondary),
          new ButtonBuilder().setCustomId(id('panel')).setLabel('Meu painel').setEmoji('📋').setStyle(ButtonStyle.Success),
        ),
      ]
    : [];

  return {
    content: active ? `<@${actor.userId}>, é a sua vez!` : '',
    embeds: [embed],
    components,
  };
}

/** Cria ou atualiza a mensagem pública da batalha no canal da Guerra */
export async function refreshBattleMessage(client: Client, battleId: number): Promise<void> {
  try {
    const view = await BattleService.publicView(battleId);
    const channelId = view.battle.channelId;
    if (!channelId) return;
    const channel = await client.channels.fetch(channelId).catch(() => null);
    if (!channel || !channel.isTextBased() || !('send' in channel)) return;
    const payload = renderBattle(view);
    const opts = { ...payload, allowedMentions: { users: view.battle.status === 'ACTIVE' ? [view.battle.currentActorId === view.attacker.id ? view.attacker.userId : view.defender.userId] : [] } };

    if (view.battle.messageId) {
      const msg = await channel.messages.fetch(view.battle.messageId).catch(() => null);
      if (msg) {
        await msg.edit(opts);
        return;
      }
    }
    const sent = await (channel as TextBasedChannel & { send: (o: MessageCreateOptions) => Promise<{ id: string }> }).send(opts);
    await BattleService.setMessage(battleId, channelId, sent.id);
  } catch (err) {
    logger.error(`Falha ao atualizar mensagem da batalha ${battleId}`, err);
  }
}

type Private = Awaited<ReturnType<typeof BattleService.privateView>>;

export function privatePanelEmbed(p: Private): EmbedBuilder {
  const c = p.combatant;
  const s = p.me.servant!;
  const buffs = c.state.buffs.length
    ? c.state.buffs.map((b) => `${b.value >= 0 ? '⬆️' : '⬇️'} ${b.stat} ${b.stat === 'guts' ? '' : `${Math.round(b.value * 100)}% · ${b.turns}t`}`).join('\n')
    : '—';
  return new EmbedBuilder()
    .setColor(COLORS.info)
    .setTitle(`📋 ${s.class.name} — ${s.name}`)
    .setDescription(
      [
        p.myTurn ? '🟢 **É a sua vez.**' : '⏳ Aguardando o oponente.',
        '',
        `❤️ ${progressBar(c.hp, c.maxHp)} ${c.hp}/${c.maxHp}`,
        `🔷 ${progressBar(c.mp, c.maxMp)} ${c.mp}/${c.maxMp}`,
        `🎯 Chance de crítico: **${Math.round(p.critChance * 100)}%**`,
        c.state.defending ? '🛡️ Em postura defensiva' : '',
        `Selos: ${commandSpells(p.commandSpells)}`,
      ].filter((l, i, a) => l !== '' || a[i - 1] !== '').join('\n'),
    )
    .addFields(
      {
        name: 'Skills',
        value: p.skills
          .map((k) => `**${k.name}** — ${k.cost} MP${k.cooldown ? ` · ⏳ ${k.cooldown}t` : ' · ✅ pronta'}\n*${k.description}*`)
          .join('\n') || '—',
      },
      {
        name: 'Noble Phantasm',
        value: p.np ? `**${p.np.name}** (${p.np.rank}) — ${p.np.cost} MP\n${p.np.cooldown ? `⏳ recarga: ${p.np.cooldown} turno(s)` : '✅ pronto'}` : '—',
        inline: true,
      },
      { name: 'Efeitos ativos', value: buffs, inline: true },
    )
    .setFooter({ text: `Turno ${p.battle.turn} · recuperação de ${Math.round(gameConfig.combat.mpRegenPerTurn * c.mods.manaRegen)} MP por turno` });
}
