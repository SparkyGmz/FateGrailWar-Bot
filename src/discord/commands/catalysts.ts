import { EmbedBuilder, SlashCommandBuilder } from 'discord.js';
import { ItemType } from '@prisma/client';
import { InventoryService } from '../../modules/inventory/inventory.service';
import { PoolService } from '../../modules/pools/pool.service';
import { SummonService } from '../../modules/summon/summon.service';
import { UserService } from '../../modules/users/user.service';
import { stars } from '../../shared/format';
import { COLORS } from '../embeds/common';
import type { Command } from '../types';
import { EPHEMERAL, respond } from './shared';

export const catalystsCommand: Command = {
  defer: 'ephemeral',
  data: new SlashCommandBuilder().setName('catalysts').setDescription('Mostra seus catalisadores e com quem ressoam no banner atual'),

  async execute(interaction) {
    const [owned, pool, user] = await Promise.all([
      InventoryService.list(interaction.user.id, ItemType.CATALYST),
      PoolService.getActive(),
      UserService.get(interaction.user.id),
    ]);

    const embed = new EmbedBuilder()
      .setColor(COLORS.primary)
      .setTitle('🎒 Seus catalisadores')
      .setFooter({ text: `Spirit Origin: ${user?.spiritOrigin ?? 0}${pool ? ` · Banner: ${pool.name}` : ''}` });

    if (owned.length === 0) {
      embed.setDescription('*Você não possui catalisadores. Eles podem cair durante invocações.*');
    } else {
      for (const o of owned.slice(0, 25)) {
        const res = pool ? SummonService.previewCatalyst(pool, o.item).resonating : [];
        embed.addFields({
          name: `${o.item.emoji} ${o.item.name} ×${o.quantity}`,
          value: [
            `\`${stars(o.item.rarity)}\` *${o.item.description}*`,
            res.length ? `🔗 Ressoa com: ${res.map((s) => s.name).join(', ')}` : '💤 Sem ressonância no banner atual',
          ].join('\n').slice(0, 1024),
        });
      }
    }
    await respond(interaction, { embeds: [embed] }, { ephemeral: true });
  },
};
