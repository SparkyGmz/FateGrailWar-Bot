import { EmbedBuilder, SlashCommandBuilder } from 'discord.js';
import { CURRENCY_LABEL, ShopService } from '../../modules/shop/shop.service';
import { UserService } from '../../modules/users/user.service';
import { discordTime, truncate } from '../../shared/format';
import { COLORS, errorEmbed, successEmbed } from '../embeds/common';
import type { Command } from '../types';
import { respond } from './shared';

export const shopCommand: Command = {
  data: new SlashCommandBuilder().setName('shop').setDescription('Mostra a loja do Graal'),

  async execute(interaction) {
    const [offers, user] = await Promise.all([ShopService.listOffers(interaction.user.id), UserService.get(interaction.user.id)]);
    const embed = new EmbedBuilder()
      .setColor(COLORS.primary)
      .setTitle('🏪 Loja do Graal')
      .setDescription(
        [
          `Seu saldo: 🪙 **${user?.coins ?? 0}** moedas · 💠 **${user?.spiritOrigin ?? 0}** Spirit Origin`,
          `Limites semanais resetam ${discordTime(ShopService.nextReset(), 'R')}.`,
          'Compre com `/buy`.',
        ].join('\n'),
      );
    for (const { offer, bought } of offers.slice(0, 25)) {
      const c = CURRENCY_LABEL[offer.currency];
      const limit = offer.weeklyLimit !== null ? ` · ${offer.weeklyLimit - bought}/${offer.weeklyLimit} esta semana` : '';
      embed.addFields({
        name: `${offer.item.emoji} ${offer.item.name}${offer.quantity > 1 ? ` ×${offer.quantity}` : ''}`,
        value: `${c.emoji} **${offer.price}**${limit}\n*${truncate(offer.item.description, 150)}*`,
        inline: true,
      });
    }
    await respond(interaction, { embeds: [embed] });
  },
};

export const buyCommand: Command = {
  defer: 'ephemeral',
  data: new SlashCommandBuilder()
    .setName('buy')
    .setDescription('Compra um item da loja')
    .addStringOption((o) => o.setName('item').setDescription('Oferta da loja').setRequired(true).setAutocomplete(true))
    .addIntegerOption((o) => o.setName('quantidade').setDescription('Quantas compras (padrão 1)').setMinValue(1).setMaxValue(20)),

  async execute(interaction) {
    const raw = interaction.options.getString('item', true);
    if (!/^\d+$/.test(raw)) {
      await respond(interaction, { embeds: [errorEmbed('Escolha o item pela lista de sugestões.')] }, { ephemeral: true });
      return;
    }
    const times = interaction.options.getInteger('quantidade') ?? 1;
    const r = await ShopService.buy(interaction.user.id, Number(raw), times);
    const c = CURRENCY_LABEL[r.offer.currency];
    await respond(interaction, {
      embeds: [
        successEmbed(
          `Você comprou ${r.offer.item.emoji} **${r.offer.item.name} ×${r.quantity}** por ${c.emoji} **${r.total}**.\nSaldo restante: ${c.emoji} **${r.balance}** ${c.name}.`,
        ),
      ],
    });
  },

  async autocomplete(interaction) {
    const q = interaction.options.getFocused().toLowerCase();
    const offers = await ShopService.listOffers(interaction.user.id);
    await interaction.respond(
      offers
        .filter(({ offer }) => offer.item.name.toLowerCase().includes(q))
        .slice(0, 25)
        .map(({ offer, bought }) => {
          const c = CURRENCY_LABEL[offer.currency];
          const left = offer.weeklyLimit !== null ? ` · restam ${offer.weeklyLimit - bought}` : '';
          return { name: truncate(`${offer.item.name} — ${offer.price} ${c.name}${left}`, 100), value: String(offer.id) };
        }),
    );
  },
};
