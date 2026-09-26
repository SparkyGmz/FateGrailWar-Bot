import { ActionRowBuilder, ButtonBuilder, ButtonStyle, SlashCommandBuilder } from 'discord.js';
import { ServantService } from '../../modules/servants/servant.service';
import { UserService } from '../../modules/users/user.service';
import { truncate } from '../../shared/format';
import { errorEmbed, successEmbed } from '../embeds/common';
import { servantEmbed } from '../embeds/servant.embed';
import { customId, type Command, type ComponentHandler } from '../types';
import { EPHEMERAL, respond } from './shared';

const FAV_PREFIX = 'fav';

export const servantCommand: Command = {
  data: new SlashCommandBuilder()
    .setName('servant')
    .setDescription('Mostra a ficha de um Servant')
    .addStringOption((o) => o.setName('nome').setDescription('Nome do Servant').setRequired(true).setAutocomplete(true)),

  async execute(interaction) {
    const raw = interaction.options.getString('nome', true);
    let servant = /^\d+$/.test(raw) ? await ServantService.getById(Number(raw)) : null;
    if (!servant) {
      const [first] = await ServantService.search(raw, 1);
      servant = first ? await ServantService.getById(first.id) : null;
    }
    if (!servant || !servant.enabled) {
      await respond(interaction, { embeds: [errorEmbed('Servant não encontrado no Trono dos Heróis.')] }, { ephemeral: true });
      return;
    }

    const owned = await ServantService.getOwnership(interaction.user.id, servant.id);
    const components = owned
      ? [
          new ActionRowBuilder<ButtonBuilder>().addComponents(
            new ButtonBuilder()
              .setCustomId(customId(FAV_PREFIX, interaction.user.id, servant.id))
              .setLabel('Definir como favorito')
              .setEmoji('⭐')
              .setStyle(ButtonStyle.Secondary),
          ),
        ]
      : [];
    await respond(interaction, { embeds: [servantEmbed(servant, owned)], components });
  },

  async autocomplete(interaction) {
    const focused = interaction.options.getFocused();
    const results = await ServantService.search(focused, 25);
    await interaction.respond(
      results.map((s) => ({ name: truncate(`${s.name} (${s.class.name})`, 100), value: String(s.id) })),
    );
  },
};

export const favoriteCommand: Command = {
  defer: 'ephemeral',
  data: new SlashCommandBuilder()
    .setName('favorite')
    .setDescription('Define seu Servant favorito (aparece no /profile)')
    .addStringOption((o) => o.setName('servant').setDescription('Um Servant da sua coleção').setRequired(true).setAutocomplete(true)),

  async execute(interaction) {
    const raw = interaction.options.getString('servant', true);
    const id = /^\d+$/.test(raw) ? Number(raw) : (await ServantService.searchOwned(interaction.user.id, raw, 1))[0]?.id;
    if (!id) {
      await respond(interaction, { embeds: [errorEmbed('Servant não encontrado na sua coleção.')] }, { ephemeral: true });
      return;
    }
    await UserService.setFavorite(interaction.user.id, id);
    const servant = await ServantService.getById(id);
    await respond(interaction, { embeds: [successEmbed(`**${servant?.name}** agora é seu Servant favorito.`)] }, { ephemeral: true });
  },

  async autocomplete(interaction) {
    const results = await ServantService.searchOwned(interaction.user.id, interaction.options.getFocused(), 25);
    await interaction.respond(results.map((s) => ({ name: truncate(`${s.name} (${s.class.name})`, 100), value: String(s.id) })));
  },
};

export const favoriteComponents: ComponentHandler = {
  prefix: FAV_PREFIX,
  async handle(interaction, args) {
    const servantId = Number(args[0]);
    await UserService.setFavorite(interaction.user.id, servantId);
    await interaction.reply({ embeds: [successEmbed('Servant favorito atualizado.')], ...EPHEMERAL });
  },
};
