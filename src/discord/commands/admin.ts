import { PermissionFlagsBits, SlashCommandBuilder } from 'discord.js';
import { prisma } from '../../database/prisma';
import { InventoryService } from '../../modules/inventory/inventory.service';
import { MissionService } from '../../modules/missions/mission.service';
import { LogService } from '../../modules/logs/log.service';
import { UserService } from '../../modules/users/user.service';
import { truncate } from '../../shared/format';
import { successEmbed } from '../embeds/common';
import type { Command } from '../types';
import { EPHEMERAL, respond } from './shared';

export const adminCommand: Command = {
  defer: 'ephemeral',
  data: new SlashCommandBuilder()
    .setName('admin')
    .setDescription('Ferramentas administrativas do jogo')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .setDMPermission(false)
    .addSubcommand((s) =>
      s
        .setName('give-item')
        .setDescription('Dá um item/catalisador a um jogador')
        .addUserOption((o) => o.setName('master').setDescription('Jogador').setRequired(true))
        .addStringOption((o) => o.setName('item').setDescription('Item').setRequired(true).setAutocomplete(true))
        .addIntegerOption((o) => o.setName('quantidade').setDescription('Quantidade').setMinValue(1).setMaxValue(99)),
    )
    .addSubcommand((s) =>
      s
        .setName('give-currency')
        .setDescription('Dá moedas ou Spirit Origin a um jogador')
        .addUserOption((o) => o.setName('master').setDescription('Jogador').setRequired(true))
        .addStringOption((o) =>
          o.setName('moeda').setDescription('Moeda').setRequired(true).addChoices(
            { name: 'Moedas', value: 'coins' },
            { name: 'Spirit Origin', value: 'spiritOrigin' },
          ),
        )
        .addIntegerOption((o) => o.setName('quantidade').setDescription('Quantidade').setRequired(true).setMinValue(1).setMaxValue(100000)),
    )
    .addSubcommand((s) =>
      s
        .setName('finish-missions')
        .setDescription('Conclui na hora as expedições de um jogador (para testes)')
        .addUserOption((o) => o.setName('master').setDescription('Jogador').setRequired(true)),
    )
    .addSubcommand((s) =>
      s
        .setName('reset-summon')
        .setDescription('Libera novamente o summon semanal de um jogador')
        .addUserOption((o) => o.setName('master').setDescription('Jogador').setRequired(true)),
    ),

  async execute(interaction) {
    const sub = interaction.options.getSubcommand();
    const target = interaction.options.getUser('master', true);
    await UserService.ensure(target.id, target.username);

    if (sub === 'give-item') {
      const item = await InventoryService.findItem(interaction.options.getString('item', true));
      const qty = interaction.options.getInteger('quantidade') ?? 1;
      await prisma.$transaction(async (tx) => {
        await InventoryService.grant(tx, target.id, item.id, qty, `admin:${interaction.user.id}`);
        await LogService.log(tx, target.id, 'ADMIN_GIVE_ITEM', { adminId: interaction.user.id, itemId: item.id, qty });
      });
      await respond(interaction, { embeds: [successEmbed(`${item.emoji} **${item.name}** ×${qty} entregue a ${target}.`)] }, { ephemeral: true });
      return;
    }

    if (sub === 'give-currency') {
      const field = interaction.options.getString('moeda', true) as 'coins' | 'spiritOrigin';
      const amount = interaction.options.getInteger('quantidade', true);
      await prisma.$transaction(async (tx) => {
        await tx.user.update({ where: { id: target.id }, data: { [field]: { increment: amount } } });
        await LogService.log(tx, target.id, 'ADMIN_GIVE_CURRENCY', { adminId: interaction.user.id, field, amount });
      });
      const label = field === 'coins' ? '🪙 moedas' : '💠 Spirit Origin';
      await respond(interaction, { embeds: [successEmbed(`${amount} ${label} entregues a ${target}.`)] }, { ephemeral: true });
      return;
    }

    if (sub === 'finish-missions') {
      const n = await MissionService.adminFinishAll(target.id, interaction.user.id);
      await respond(interaction, { embeds: [successEmbed(`${n} expedição(ões) de ${target} concluída(s). Use \`/mission claim\`.`)] }, { ephemeral: true });
      return;
    }

    if (sub === 'reset-summon') {
      await UserService.resetFreeSummon(target.id, interaction.user.id);
      await respond(interaction, { embeds: [successEmbed(`Summon semanal de ${target} liberado.`)] }, { ephemeral: true });
    }
  },

  async autocomplete(interaction) {
    const items = await InventoryService.searchItems(interaction.options.getFocused(), 25);
    await interaction.respond(items.map((i) => ({ name: truncate(`${i.name} [${i.type}]`, 100), value: String(i.id) })));
  },
};
