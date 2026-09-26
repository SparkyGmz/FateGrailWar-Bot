import { EmbedBuilder, SlashCommandBuilder } from 'discord.js';
import { ItemType } from '@prisma/client';
import { InventoryService } from '../../modules/inventory/inventory.service';
import { ItemUseService } from '../../modules/inventory/item-use.service';
import { ServantService } from '../../modules/servants/servant.service';
import { UserService } from '../../modules/users/user.service';
import { truncate } from '../../shared/format';
import { COLORS, errorEmbed, successEmbed } from '../embeds/common';
import type { Command } from '../types';
import { respond } from './shared';

const TYPE_LABEL: Record<ItemType, string> = {
  CONSUMABLE: '🧪 Consumíveis',
  CATALYST: '🔮 Catalisadores',
  MATERIAL: '🧱 Materiais',
};

export const inventoryCommand: Command = {
  defer: 'ephemeral',
  data: new SlashCommandBuilder().setName('inventory').setDescription('Mostra seu inventário e moedas'),

  async execute(interaction) {
    const [items, user] = await Promise.all([InventoryService.list(interaction.user.id), UserService.get(interaction.user.id)]);
    const embed = new EmbedBuilder()
      .setColor(COLORS.primary)
      .setTitle('🎒 Inventário')
      .setDescription(
        `🪙 **${user?.coins ?? 0}** moedas · 💠 **${user?.spiritOrigin ?? 0}** Spirit Origin · 🏆 **${user?.grails ?? 0}** Grails`,
      );
    for (const type of [ItemType.CONSUMABLE, ItemType.CATALYST, ItemType.MATERIAL]) {
      const list = items.filter((i) => i.item.type === type);
      if (!list.length) continue;
      embed.addFields({
        name: TYPE_LABEL[type],
        value: list.map((i) => `${i.item.emoji} ${i.item.name} ×**${i.quantity}**`).join('\n').slice(0, 1024),
      });
    }
    if (!items.length) embed.addFields({ name: 'Itens', value: '*Vazio. Faça missões ou visite a `/shop`.*' });
    embed.setFooter({ text: 'Consumíveis: /use · Catalisadores: /summon ou /catalysts' });
    await respond(interaction, { embeds: [embed] });
  },
};

export const useCommand: Command = {
  data: new SlashCommandBuilder()
    .setName('use')
    .setDescription('Usa um item consumível')
    .addStringOption((o) => o.setName('item').setDescription('Item do inventário').setRequired(true).setAutocomplete(true))
    .addStringOption((o) => o.setName('servant').setDescription('Servant alvo (para incensos de Bond)').setAutocomplete(true)),

  async execute(interaction) {
    const itemRaw = interaction.options.getString('item', true);
    const servantRaw = interaction.options.getString('servant');
    if (!/^\d+$/.test(itemRaw) || (servantRaw && !/^\d+$/.test(servantRaw))) {
      await respond(interaction, { embeds: [errorEmbed('Escolha o item e o Servant pelas listas de sugestões.')] }, { ephemeral: true });
      return;
    }
    const r = await ItemUseService.use(interaction.user.id, Number(itemRaw), servantRaw ? Number(servantRaw) : null);
    const b = r.bond;
    const lines = [
      `Você usou **${r.itemName}** em **${b.servantName}**.`,
      b.reached.length ? `💞 Bond **${b.before} → ${b.level}** (+${b.gained})` : `💞 Bond +${b.gained} (Nível ${b.level})`,
      ...b.rewards.map((x) => `   ↳ Bond ${x.level}: ${x.text}`),
    ];
    await respond(interaction, { embeds: [successEmbed(lines.join('\n'))] });
  },

  async autocomplete(interaction) {
    const focused = interaction.options.getFocused(true);
    if (focused.name === 'item') {
      const items = await InventoryService.list(interaction.user.id, ItemType.CONSUMABLE);
      await interaction.respond(
        items
          .filter((i) => i.item.name.toLowerCase().includes(focused.value.toLowerCase()))
          .slice(0, 25)
          .map((i) => ({
            name: truncate(`${i.item.name} ×${i.quantity}${ItemUseService.needsServant(i.item.data) ? ' (escolha um Servant)' : ''}`, 100),
            value: String(i.itemId),
          })),
      );
      return;
    }
    const servants = await ServantService.searchOwned(interaction.user.id, focused.value, 25);
    await interaction.respond(servants.map((s) => ({ name: truncate(`${s.name} (${s.class.name})`, 100), value: String(s.id) })));
  },
};
