import { EmbedBuilder } from 'discord.js';
import type { Mission } from '@prisma/client';
import type { ClaimSummary } from '../../modules/missions/mission.service';
import type { MissionService } from '../../modules/missions/mission.service';
import {
  parseRewards,
  parseRules,
  STAT_LABEL,
  type MissionOutcome,
  type StatKey,
  type SuccessBreakdown,
} from '../../modules/missions/mission.logic';
import { discordTime, formatDuration, percent, signedPercent } from '../../shared/format';
import { COLORS } from './common';

const OUTCOME: Record<MissionOutcome, { label: string; color: number }> = {
  GREAT_SUCCESS: { label: '🌟 GRANDE SUCESSO', color: 0xffd700 },
  SUCCESS: { label: '✅ Sucesso', color: COLORS.success },
  FAILURE: { label: '❌ Fracasso', color: COLORS.error },
};

export function difficultyLabel(d: number): string {
  return '◆'.repeat(d) + '◇'.repeat(Math.max(0, 5 - d));
}

function missionSummary(m: Mission): string {
  const rules = parseRules(m);
  const stats = (Object.entries(rules.statWeights) as [StatKey, number][])
    .sort((a, b) => b[1] - a[1])
    .map(([k]) => STAT_LABEL[k])
    .join(' / ');
  const classes = Object.keys(rules.classBonus).map((c) => c[0]!.toUpperCase() + c.slice(1)).join(', ');
  const rw = parseRewards(m.rewards);
  const rewardParts = [
    rw.xp ? `${rw.xp} XP` : '',
    rw.coins ? `🪙${rw.coins}` : '',
    rw.spiritOrigin ? `💠${rw.spiritOrigin}` : '',
    rw.bondXp ? `💞${rw.bondXp} Bond` : '',
    rw.drops?.length ? '🎁 itens' : '',
  ].filter(Boolean);
  return [
    `Dificuldade \`${difficultyLabel(m.difficulty)}\` · ⏱️ ${formatDuration(m.durationMinutes)}${m.minLevel > 1 ? ` · Nível ${m.minLevel}+` : ''}`,
    `Testa: **${stats || '—'}**${classes ? ` · Bônus: ${classes}` : ''}`,
    `Recompensas: ${rewardParts.join(' · ')}`,
  ].join('\n');
}

export function missionListEmbed(
  list: Mission[],
  playerLevel: number,
  withServant: { name: string; chances: Map<number, number> } | null,
): EmbedBuilder {
  const embed = new EmbedBuilder()
    .setColor(COLORS.info)
    .setTitle('🗺️ Expedições disponíveis')
    .setDescription(
      withServant
        ? `Chances calculadas para **${withServant.name}**.`
        : 'Envie um Servant com `/mission start`. Dica: use `/mission list servant:` para ver a chance de cada missão.',
    );
  for (const m of list.slice(0, 25)) {
    const locked = playerLevel < m.minLevel;
    const chance = withServant?.chances.get(m.id);
    embed.addFields({
      name: `${locked ? '🔒' : m.emoji} ${m.name}${chance !== undefined && !locked ? ` — ${percent(chance, 0)}` : ''}`,
      value: missionSummary(m).slice(0, 1024),
    });
  }
  return embed;
}

export function missionStartedEmbed(p: {
  missionName: string;
  missionEmoji: string;
  servantName: string;
  className: string;
  endsAt: Date;
  breakdown: SuccessBreakdown;
  slotsUsed: number;
  maxSlots: number;
}): EmbedBuilder {
  const b = p.breakdown;
  const bonuses = [
    b.classBonus ? `classe ${signedPercent(b.classBonus)}` : '',
    b.traitBonus ? `trait ${signedPercent(b.traitBonus)}` : '',
    b.bondBonus ? `bond ${signedPercent(b.bondBonus)}` : '',
  ].filter(Boolean);
  return new EmbedBuilder()
    .setColor(COLORS.info)
    .setTitle(`${p.missionEmoji} Expedição iniciada: ${p.missionName}`)
    .setDescription(`**${p.className} — ${p.servantName}** partiu em missão.`)
    .addFields(
      { name: 'Chance de sucesso', value: `**${percent(b.chance, 0)}**`, inline: true },
      { name: 'Retorno', value: `${discordTime(p.endsAt, 'R')}`, inline: true },
      { name: 'Expedições', value: `${p.slotsUsed}/${p.maxSlots}`, inline: true },
      {
        name: 'Análise',
        value: [
          `Parâmetros testados: **${b.statScore.toFixed(1)}** vs. dificuldade **${b.target.toFixed(1)}**`,
          bonuses.length ? `Bônus: ${bonuses.join(', ')}` : '',
        ].filter(Boolean).join('\n'),
      },
    )
    .setFooter({ text: 'Quando terminar, use /mission claim para receber as recompensas.' });
}

type Status = Awaited<ReturnType<typeof MissionService.status>>;

export function missionStatusEmbed(s: Status): EmbedBuilder {
  const now = Date.now();
  const embed = new EmbedBuilder()
    .setColor(COLORS.info)
    .setTitle(`🗺️ Suas expedições (${s.runs.length}/${s.maxSlots})`);
  if (s.runs.length === 0) {
    embed.setDescription('Nenhuma expedição em andamento. Veja as opções com `/mission list`.');
    return embed;
  }
  for (const r of s.runs) {
    const done = r.endsAt.getTime() <= now;
    const sv = r.playerServant.servant;
    embed.addFields({
      name: `${r.mission.emoji} ${r.mission.name}`,
      value: `${sv.class.emoji} ${sv.name} · chance ${percent(r.successChance, 0)}\n${done ? '✅ **Pronta!** Use `/mission claim`' : `⏳ Retorna ${discordTime(r.endsAt, 'R')}`}`,
    });
  }
  return embed;
}

export function missionClaimEmbeds(c: ClaimSummary): EmbedBuilder[] {
  if (c.claimed.length === 0) {
    return [
      new EmbedBuilder()
        .setColor(COLORS.info)
        .setDescription(
          c.stillRunning
            ? `Nenhuma expedição terminou ainda (${c.stillRunning} em andamento). Veja em \`/mission status\`.`
            : 'Você não tem expedições para resgatar. Comece uma com `/mission start`.',
        ),
    ];
  }
  const embeds = c.claimed.slice(0, 9).map((m) => {
    const o = OUTCOME[m.outcome];
    const lines = [
      `**${m.servantName}** retornou.`,
      '',
      [`+${m.xp} XP`, m.coins ? `🪙 +${m.coins}` : '', m.spiritOrigin ? `💠 +${m.spiritOrigin}` : ''].filter(Boolean).join(' · '),
      ...m.items.map((i) => `${i.emoji} ${i.name} ×${i.quantity}`),
      m.bond.reached.length
        ? `💞 Bond **${m.bond.before} → ${m.bond.level}** (+${m.bond.gained})`
        : `💞 Bond +${m.bond.gained} (Nível ${m.bond.level})`,
      ...m.bond.rewards.map((r) => `   ↳ Bond ${r.level}: ${r.text}`),
    ];
    return new EmbedBuilder()
      .setColor(o.color)
      .setTitle(`${m.missionEmoji} ${m.missionName} — ${o.label}`)
      .setDescription(lines.filter((l, i) => l !== '' || i === 1).join('\n').slice(0, 4000));
  });
  const footer = [
    c.levelsGained > 0 ? `⬆️ Level up! Agora você é nível ${c.level}.` : '',
    c.stillRunning ? `${c.stillRunning} expedição(ões) ainda em andamento.` : '',
    c.claimed.length > 9 ? `+${c.claimed.length - 9} outras resgatadas.` : '',
  ].filter(Boolean).join(' ');
  if (footer) embeds[embeds.length - 1]!.setFooter({ text: footer });
  return embeds;
}
