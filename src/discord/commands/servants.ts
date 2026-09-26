import { ActionRowBuilder, ButtonBuilder, ButtonStyle, SlashCommandBuilder } from 'discord.js';
import { ServantService } from '../../modules/servants/servant.service';
import { collectionEmbed } from '../embeds/collection.embed';
import { customId, type Command, type ComponentHandler } from '../types';
import { classChoices, respond } from './shared';

const PREFIX = 'col';

async function render(viewerId: string, targetId: string, targetName: string, classId: string | null, page: number) {
  const [collection, classes, total] = await Promise.all([
    ServantService.collection(targetId, classId, page),
    ServantService.listClasses(),
    ServantService.totalEnabled(),
  ]);
  const cls = classId ? classes.find((c) => c.id === classId) : null;
  const embed = collectionEmbed(collection, targetName, cls ? `${cls.emoji} ${cls.name}` : null, total);

  const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId(customId(PREFIX, viewerId, targetId, classId ?? 'all', collection.page - 1))
      .setEmoji('◀️')
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(collection.page <= 0),
    new ButtonBuilder()
      .setCustomId(customId(PREFIX, viewerId, targetId, classId ?? 'all', collection.page + 1))
      .setEmoji('▶️')
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(collection.page >= collection.totalPages - 1),
  );
  return { embeds: [embed], components: collection.totalPages > 1 ? [row] : [] };
}

export const servantsCommand: Command = {
  data: new SlashCommandBuilder()
    .setName('servants')
    .setDescription('Mostra a coleção de Servants')
    .addStringOption((o) => o.setName('classe').setDescription('Filtrar por classe').addChoices(...classChoices))
    .addUserOption((o) => o.setName('master').setDescription('Ver a coleção de outro jogador')),

  async execute(interaction) {
    const target = interaction.options.getUser('master') ?? interaction.user;
    const classId = interaction.options.getString('classe');
    await respond(interaction, await render(interaction.user.id, target.id, target.globalName ?? target.username, classId, 0));
  },
};

export const collectionComponents: ComponentHandler = {
  prefix: PREFIX,
  async handle(interaction, args) {
    const [targetId, classArg, pageArg] = args;
    if (!targetId || !interaction.isButton()) return;
    const target = await interaction.client.users.fetch(targetId).catch(() => null);
    const name = target?.globalName ?? target?.username ?? 'Master';
    await interaction.update(
      await render(interaction.user.id, targetId, name, classArg === 'all' ? null : classArg ?? null, Number(pageArg) || 0),
    );
  },
};
