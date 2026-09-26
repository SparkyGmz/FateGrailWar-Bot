import { PermissionFlagsBits, SlashCommandBuilder, type ChatInputCommandInteraction } from 'discord.js';
import { gameConfig } from '../../config/game';
import { WarService } from '../../modules/grail-war/war.service';
import { ServantService } from '../../modules/servants/servant.service';
import { GameError } from '../../shared/errors';
import { truncate } from '../../shared/format';
import { successEmbed } from '../embeds/common';
import { warLogEmbed, warStatusEmbed } from '../embeds/war.embed';
import type { Command } from '../types';
import { respond } from './shared';

const ADMIN_SUBS = new Set(['create', 'start', 'pause', 'resume', 'end', 'next-day']);

function requireGuild(i: ChatInputCommandInteraction): string {
  if (!i.guildId) throw new GameError('A Guerra do Santo Graal só acontece dentro de um servidor.');
  return i.guildId;
}

function requireAdmin(i: ChatInputCommandInteraction) {
  if (!i.memberPermissions?.has(PermissionFlagsBits.ManageGuild)) {
    throw new GameError('Apenas o supervisor (quem pode Gerenciar Servidor) pode fazer isso.');
  }
}

export const grailwarCommand: Command = {
  defer: 'ephemeral',
  data: new SlashCommandBuilder()
    .setName('grailwar')
    .setDescription('Guerra do Santo Graal')
    .setDMPermission(false)
    .addSubcommand((s) => s.setName('status').setDescription('Situação da Guerra e do seu Servant'))
    .addSubcommand((s) => s.setName('join').setDescription('Inscreve-se como Master na Guerra'))
    .addSubcommand((s) => s.setName('leave').setDescription('Sai da Guerra (antes do início)'))
    .addSubcommand((s) =>
      s
        .setName('servant')
        .setDescription('Firma contrato com um Servant da sua coleção para esta Guerra')
        .addStringOption((o) => o.setName('servant').setDescription('Servant').setRequired(true).setAutocomplete(true)),
    )
    .addSubcommand((s) => s.setName('log').setDescription('Seu diário privado de eventos da Guerra'))
    // ---- administração
    .addSubcommand((s) =>
      s
        .setName('create')
        .setDescription('[Admin] Cria uma nova Guerra neste canal')
        .addStringOption((o) => o.setName('nome').setDescription('Nome da Guerra').setMaxLength(60))
        .addIntegerOption((o) =>
          o.setName('max_masters').setDescription('Máximo de Masters').setMinValue(2).setMaxValue(gameConfig.war.hardMaxPlayers),
        )
        .addIntegerOption((o) =>
          o.setName('min_masters').setDescription('Mínimo de Masters para iniciar (1 = teste solo)').setMinValue(1).setMaxValue(gameConfig.war.hardMaxPlayers),
        )
        .addIntegerOption((o) =>
          o.setName('inscricao_horas').setDescription('Duração das inscrições em horas').setMinValue(1).setMaxValue(24 * 14),
        ),
    )
    .addSubcommand((s) =>
      s
        .setName('start')
        .setDescription('[Admin] Inicia a Guerra')
        .addBooleanOption((o) => o.setName('remover_sem_servant').setDescription('Remove quem não firmou contrato')),
    )
    .addSubcommand((s) => s.setName('pause').setDescription('[Admin] Pausa a Guerra'))
    .addSubcommand((s) => s.setName('resume').setDescription('[Admin] Retoma a Guerra'))
    .addSubcommand((s) =>
      s
        .setName('end')
        .setDescription('[Admin] Encerra ou cancela a Guerra')
        .addBooleanOption((o) => o.setName('cancelar').setDescription('Cancelar em vez de encerrar')),
    )
    .addSubcommand((s) => s.setName('next-day').setDescription('[Admin] Avança para o próximo dia (testes)')),

  async execute(interaction) {
    const guildId = requireGuild(interaction);
    const sub = interaction.options.getSubcommand();
    const user = interaction.user;
    if (ADMIN_SUBS.has(sub)) requireAdmin(interaction);

    switch (sub) {
      case 'status': {
        await respond(interaction, { embeds: [warStatusEmbed(await WarService.overview(guildId, user.id))] });
        return;
      }
      case 'join': {
        const { war, count } = await WarService.join(guildId, user.id, user.username);
        await respond(interaction, {
          embeds: [successEmbed(`Você é um dos Masters da **${war.name}** (${count}/${war.maxPlayers}).\nAgora firme contrato com \`/grailwar servant\` — **ninguém mais verá qual Servant você escolheu.**`)],
        });
        return;
      }
      case 'leave': {
        const war = await WarService.leave(guildId, user.id);
        await respond(interaction, { embeds: [successEmbed(`Você deixou a **${war.name}**.`)] });
        return;
      }
      case 'servant': {
        const raw = interaction.options.getString('servant', true);
        if (!/^\d+$/.test(raw)) throw new GameError('Escolha o Servant pela lista de sugestões.');
        const { servant } = await WarService.setServant(guildId, user.id, Number(raw));
        await respond(interaction, {
          embeds: [successEmbed(`**Contrato estabelecido.**\n\nMaster: **${user.username}**\nServant: ${servant.class.emoji} **${servant.class.name.toUpperCase()} — ${servant.name.toUpperCase()}**\n\nVocê pode trocar até a Guerra começar.`)],
        });
        return;
      }
      case 'log': {
        const { events } = await WarService.myEvents(guildId, user.id, 15);
        await respond(interaction, { embeds: [warLogEmbed(events)] });
        return;
      }
      case 'create': {
        const war = await WarService.create({
          guildId,
          channelId: interaction.channelId,
          adminId: user.id,
          name: interaction.options.getString('nome') ?? 'Quinta Guerra do Santo Graal',
          maxPlayers: interaction.options.getInteger('max_masters') ?? gameConfig.war.defaultMaxPlayers,
          minPlayers: interaction.options.getInteger('min_masters') ?? gameConfig.war.defaultMinPlayers,
          registrationHours: interaction.options.getInteger('inscricao_horas') ?? gameConfig.war.defaultRegistrationHours,
        });
        await respond(interaction, {
          embeds: [successEmbed(`**${war.name}** criada. Os anúncios públicos serão publicados neste canal.\nQuando houver Masters suficientes, use \`/grailwar start\`.`)],
        });
        return;
      }
      case 'start': {
        const r = await WarService.start(guildId, user.id, interaction.options.getBoolean('remover_sem_servant') ?? false);
        await respond(interaction, { embeds: [successEmbed(`A **${r.war.name}** começou com **${r.players}** Masters.`)] });
        return;
      }
      case 'pause':
      case 'resume': {
        await WarService.setPaused(guildId, user.id, sub === 'pause');
        await respond(interaction, { embeds: [successEmbed(sub === 'pause' ? 'Guerra pausada.' : 'Guerra retomada.')] });
        return;
      }
      case 'end': {
        const cancel = interaction.options.getBoolean('cancelar') ?? false;
        const r = await WarService.end(guildId, user.id, cancel);
        await respond(interaction, { embeds: [successEmbed(`**${r.war.name}** ${cancel ? 'cancelada' : 'encerrada'}.`)] });
        return;
      }
      case 'next-day': {
        const day = await WarService.forceNextDay(guildId);
        await respond(interaction, { embeds: [successEmbed(`Avançado para o **Dia ${day}**. AP restaurados.`)] });
      }
    }
  },

  async autocomplete(interaction) {
    const results = await ServantService.searchOwned(interaction.user.id, interaction.options.getFocused(), 25);
    await interaction.respond(results.map((s) => ({ name: truncate(`${s.name} (${s.class.name})`, 100), value: String(s.id) })));
  },
};
