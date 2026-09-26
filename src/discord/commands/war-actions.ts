import { SlashCommandBuilder, type ChatInputCommandInteraction } from 'discord.js';
import { gameConfig } from '../../config/game';
import { WarActionService } from '../../modules/grail-war/war-action.service';
import { GameError } from '../../shared/errors';
import { truncate } from '../../shared/format';
import { errorEmbed } from '../embeds/common';
import { actionResultEmbed, intelCardEmbed, intelListEmbed, locationEmbed } from '../embeds/war.embed';
import type { Command } from '../types';
import { respond } from './shared';

/** Todas as ações da Guerra são secretas: respostas ephemeral */
function guild(i: ChatInputCommandInteraction): string {
  if (!i.guildId) throw new GameError('A Guerra do Santo Graal só acontece dentro de um servidor.');
  return i.guildId;
}

const ap = (action: string) => `(${gameConfig.war.actionCost[action] ?? 1} AP)`;

export const locationCommand: Command = {
  defer: 'ephemeral',
  data: new SlashCommandBuilder().setName('location').setDescription('Mostra onde você está na Guerra').setDMPermission(false),
  async execute(interaction) {
    await respond(interaction, { embeds: [locationEmbed(await WarActionService.locationView(guild(interaction), interaction.user.id))] });
  },
};

export const travelCommand: Command = {
  defer: 'ephemeral',
  data: new SlashCommandBuilder()
    .setName('travel')
    .setDescription(`Viaja para uma região conectada ${ap('travel')}`)
    .setDMPermission(false)
    .addStringOption((o) => o.setName('destino').setDescription('Região').setRequired(true).setAutocomplete(true)),
  async execute(interaction) {
    const dest = interaction.options.getString('destino', true);
    await respond(interaction, { embeds: [actionResultEmbed(await WarActionService.travel(guild(interaction), interaction.user.id, dest))] });
  },
  async autocomplete(interaction) {
    if (!interaction.guildId) return interaction.respond([]);
    const q = interaction.options.getFocused().toLowerCase();
    const opts = await WarActionService.travelOptions(interaction.guildId, interaction.user.id);
    await interaction.respond(
      opts
        .filter((o) => o.location.name.toLowerCase().includes(q))
        .slice(0, 25)
        .map((o) => ({ name: `${o.location.emoji} ${o.location.name}${o.hops > 1 ? ` (${o.hops} regiões)` : ''}`, value: o.location.slug })),
    );
  },
};

export const exploreCommand: Command = {
  defer: 'ephemeral',
  data: new SlashCommandBuilder().setName('explore').setDescription(`Explora a região atual ${ap('explore')}`).setDMPermission(false),
  async execute(interaction) {
    await respond(interaction, { embeds: [actionResultEmbed(await WarActionService.explore(guild(interaction), interaction.user.id))] });
  },
};

export const investigateCommand: Command = {
  defer: 'ephemeral',
  data: new SlashCommandBuilder()
    .setName('investigate')
    .setDescription(`Investiga um Master que você já conhece ${ap('investigate')}`)
    .setDMPermission(false)
    .addUserOption((o) => o.setName('master').setDescription('Master alvo').setRequired(true)),
  async execute(interaction) {
    const target = interaction.options.getUser('master', true);
    await respond(interaction, {
      embeds: [actionResultEmbed(await WarActionService.investigate(guild(interaction), interaction.user.id, target.id))],
    });
  },
};

export const hideCommand: Command = {
  defer: 'ephemeral',
  data: new SlashCommandBuilder().setName('hide').setDescription(`Oculta sua presença até o fim do dia ${ap('hide')}`).setDMPermission(false),
  async execute(interaction) {
    await respond(interaction, { embeds: [actionResultEmbed(await WarActionService.hide(guild(interaction), interaction.user.id))] });
  },
};

export const trainCommand: Command = {
  defer: 'ephemeral',
  data: new SlashCommandBuilder().setName('train').setDescription(`Treina com seu Servant ${ap('train')}`).setDMPermission(false),
  async execute(interaction) {
    await respond(interaction, { embeds: [actionResultEmbed(await WarActionService.train(guild(interaction), interaction.user.id))] });
  },
};

export const intelCommand: Command = {
  defer: 'ephemeral',
  data: new SlashCommandBuilder()
    .setName('intel')
    .setDescription('Seu dossiê sobre os outros Masters')
    .setDMPermission(false)
    .addUserOption((o) => o.setName('master').setDescription('Ver a ficha de um Master específico')),
  async execute(interaction) {
    const list = await WarActionService.intelList(guild(interaction), interaction.user.id);
    const target = interaction.options.getUser('master');
    if (!target) {
      await respond(interaction, { embeds: [intelListEmbed(list)] });
      return;
    }
    const entry = list.entries.find((e) => e.userId === target.id);
    if (!entry) {
      await respond(interaction, { embeds: [errorEmbed(`Você não tem informações sobre **${truncate(target.username, 50)}**.`)] });
      return;
    }
    await respond(interaction, { embeds: [intelCardEmbed(entry)] });
  },
};
