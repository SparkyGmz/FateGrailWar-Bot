import { SlashCommandBuilder } from 'discord.js';
import { LogService } from '../../modules/logs/log.service';
import { TitleService } from '../../modules/titles/title.service';
import { prisma } from '../../database/prisma';
import { truncate } from '../../shared/format';
import { errorEmbed, successEmbed } from '../embeds/common';
import type { Command } from '../types';
import { respond } from './shared';

const NONE = '__none__';

export const titleCommand: Command = {
  defer: 'ephemeral',
  data: new SlashCommandBuilder()
    .setName('title')
    .setDescription('Escolhe o título exibido no seu perfil')
    .addStringOption((o) => o.setName('titulo').setDescription('Um dos seus títulos').setRequired(true).setAutocomplete(true)),

  async execute(interaction) {
    const key = interaction.options.getString('titulo', true);
    if (key === NONE) {
      await TitleService.equip(interaction.user.id, null);
      await respond(interaction, { embeds: [successEmbed('Título removido do perfil.')] });
      return;
    }
    const titles = await TitleService.list(interaction.user.id);
    const match = titles.find((t) => t.key === key) ?? titles.find((t) => t.text.toLowerCase() === key.toLowerCase());
    if (!match) {
      await respond(interaction, { embeds: [errorEmbed('Você não possui esse título. Títulos vêm de Bond e conquistas.')] });
      return;
    }
    const text = await TitleService.equip(interaction.user.id, match.key);
    await LogService.log(prisma, interaction.user.id, 'TITLE_EQUIPPED', { key: match.key });
    await respond(interaction, { embeds: [successEmbed(`Título equipado: **${text}**`)] });
  },

  async autocomplete(interaction) {
    const q = interaction.options.getFocused().toLowerCase();
    const titles = await TitleService.list(interaction.user.id);
    await interaction.respond([
      { name: '— Nenhum título —', value: NONE },
      ...titles
        .filter((t) => t.text.toLowerCase().includes(q))
        .slice(0, 24)
        .map((t) => ({ name: truncate(t.text, 100), value: t.key })),
    ]);
  },
};
