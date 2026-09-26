import { SlashCommandBuilder } from 'discord.js';
import { MissionService } from '../../modules/missions/mission.service';
import { computeSuccess, parseRules } from '../../modules/missions/mission.logic';
import { ServantService } from '../../modules/servants/servant.service';
import { UserService } from '../../modules/users/user.service';
import { formatDuration, truncate } from '../../shared/format';
import { errorEmbed } from '../embeds/common';
import {
  missionClaimEmbeds,
  missionListEmbed,
  missionStartedEmbed,
  missionStatusEmbed,
} from '../embeds/mission.embed';
import type { Command } from '../types';
import { respond } from './shared';

export const missionCommand: Command = {
  data: new SlashCommandBuilder()
    .setName('mission')
    .setDescription('Expedições PvE com seus Servants')
    .addSubcommand((s) =>
      s
        .setName('list')
        .setDescription('Lista as missões disponíveis')
        .addStringOption((o) =>
          o.setName('servant').setDescription('Mostrar a chance de sucesso deste Servant').setAutocomplete(true),
        ),
    )
    .addSubcommand((s) =>
      s
        .setName('start')
        .setDescription('Envia um Servant em uma missão')
        .addStringOption((o) => o.setName('missao').setDescription('Missão').setRequired(true).setAutocomplete(true))
        .addStringOption((o) => o.setName('servant').setDescription('Servant disponível').setRequired(true).setAutocomplete(true)),
    )
    .addSubcommand((s) => s.setName('status').setDescription('Mostra suas expedições em andamento'))
    .addSubcommand((s) => s.setName('claim').setDescription('Resgata as recompensas das expedições concluídas')),

  async execute(interaction) {
    const sub = interaction.options.getSubcommand();
    const userId = interaction.user.id;

    if (sub === 'list') {
      const [missions, user] = await Promise.all([MissionService.list(), UserService.get(userId)]);
      const raw = interaction.options.getString('servant');
      let withServant: { name: string; chances: Map<number, number> } | null = null;
      if (raw && /^\d+$/.test(raw)) {
        const link = await ServantService.getOwnership(userId, Number(raw));
        const servant = link ? await ServantService.getById(Number(raw)) : null;
        if (link && servant) {
          withServant = {
            name: servant.name,
            chances: new Map(missions.map((m) => [m.id, computeSuccess(servant, link.bondLevel, parseRules(m)).chance])),
          };
        }
      }
      await respond(interaction, { embeds: [missionListEmbed(missions, user?.level ?? 1, withServant)] });
      return;
    }

    if (sub === 'start') {
      const missionRaw = interaction.options.getString('missao', true);
      const servantRaw = interaction.options.getString('servant', true);
      if (!/^\d+$/.test(missionRaw) || !/^\d+$/.test(servantRaw)) {
        await respond(interaction, { embeds: [errorEmbed('Escolha a missão e o Servant pelas listas de sugestões.')] }, { ephemeral: true });
        return;
      }
      const r = await MissionService.start(userId, Number(missionRaw), Number(servantRaw));
      await respond(interaction, {
        embeds: [
          missionStartedEmbed({
            missionName: r.mission.name,
            missionEmoji: r.mission.emoji,
            servantName: r.servant.name,
            className: r.servant.class.name,
            endsAt: r.run.endsAt,
            breakdown: r.breakdown,
            slotsUsed: r.slotsUsed,
            maxSlots: r.maxSlots,
          }),
        ],
      });
      return;
    }

    if (sub === 'status') {
      await respond(interaction, { embeds: [missionStatusEmbed(await MissionService.status(userId))] });
      return;
    }

    if (sub === 'claim') {
      await respond(interaction, { embeds: missionClaimEmbeds(await MissionService.claimFinished(userId)) });
    }
  },

  async autocomplete(interaction) {
    const focused = interaction.options.getFocused(true);
    const sub = interaction.options.getSubcommand();

    if (focused.name === 'missao') {
      const [missions, user] = await Promise.all([MissionService.search(focused.value), UserService.get(interaction.user.id)]);
      const level = user?.level ?? 1;
      await interaction.respond(
        missions
          .filter((m) => m.minLevel <= level)
          .map((m) => ({ name: truncate(`${m.name} · ${formatDuration(m.durationMinutes)} · dif. ${m.difficulty}`, 100), value: String(m.id) })),
      );
      return;
    }

    if (focused.name === 'servant') {
      // Em "start" só aparecem Servants livres; em "list", toda a coleção
      const servants = sub === 'start'
        ? (await MissionService.idleServants(interaction.user.id, focused.value)).map((l) => ({ s: l.servant, bond: l.bondLevel }))
        : (await ServantService.searchOwned(interaction.user.id, focused.value)).map((s) => ({ s, bond: null as number | null }));
      await interaction.respond(
        servants.slice(0, 25).map(({ s, bond }) => ({
          name: truncate(`${s.name} (${s.class.name})${bond !== null ? ` · Bond ${bond}` : ''}`, 100),
          value: String(s.id),
        })),
      );
    }
  },
};
