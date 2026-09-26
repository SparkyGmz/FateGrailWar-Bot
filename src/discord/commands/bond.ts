import { EmbedBuilder, SlashCommandBuilder } from 'discord.js';
import { gameConfig } from '../../config/game';
import { BondService } from '../../modules/bond/bond.service';
import { ServantService } from '../../modules/servants/servant.service';
import { percent, progressBar, rarityColor, stars, truncate } from '../../shared/format';
import { errorEmbed } from '../embeds/common';
import type { Command } from '../types';
import { respond } from './shared';

export const bondCommand: Command = {
  data: new SlashCommandBuilder()
    .setName('bond')
    .setDescription('Mostra seu vínculo com um Servant')
    .addStringOption((o) => o.setName('servant').setDescription('Servant da sua coleção').setRequired(true).setAutocomplete(true)),

  async execute(interaction) {
    const raw = interaction.options.getString('servant', true);
    const id = /^\d+$/.test(raw) ? Number(raw) : (await ServantService.searchOwned(interaction.user.id, raw, 1))[0]?.id;
    const view = id ? await BondService.getView(interaction.user.id, id) : null;
    if (!view) {
      await respond(interaction, { embeds: [errorEmbed('Servant não encontrado na sua coleção.')] }, { ephemeral: true });
      return;
    }
    const { link, nextRewards, missionsDone } = view;
    const s = link.servant;
    const max = gameConfig.bond.maxLevel;
    const isMax = link.bondLevel >= max;
    const need = isMax ? 1 : gameConfig.bond.xpToNextLevel(link.bondLevel);
    const ratio = isMax ? 1 : link.bondXp / need;

    const embed = new EmbedBuilder()
      .setColor(rarityColor[s.rarity] ?? 0xffffff)
      .setTitle(`${s.class.name.toUpperCase()} — ${s.name.toUpperCase()}`)
      .setDescription(
        [
          `\`${stars(s.rarity)}\``,
          '',
          `Bond ${progressBar(ratio, 1)} ${isMax ? 'MAX' : percent(ratio, 0)}`,
          '',
          `**Bond Level:** ${link.bondLevel}/${max}${isMax ? '' : ` · ${link.bondXp}/${need} XP`}`,
          '',
          `**Missões:** ${missionsDone}`,
          `**Battles:** ${link.battles}`,
          `**Victories:** ${link.wins}`,
          link.duplicates ? `**Duplicatas:** ${link.duplicates}` : '',
        ].filter((l, i, a) => l !== '' || a[i - 1] !== '').join('\n'),
      );

    if (!isMax && nextRewards.length) {
      embed.addFields({
        name: `Próxima recompensa (Bond ${link.bondLevel + 1})`,
        value: nextRewards
          .map((r) => {
            switch (r.type) {
              case 'COINS': return `🪙 ${r.amount} moedas`;
              case 'SPIRIT_ORIGIN': return `💠 ${r.amount} Spirit Origin`;
              case 'ITEM': return r.item ? `${r.item.emoji} ${r.item.name} ×${r.amount}` : '';
              case 'TITLE': return `🏷️ Título **${(r.title ?? '').replaceAll('{servant}', s.name)}**`;
            }
          })
          .filter(Boolean)
          .join('\n'),
      });
    }
    embed.setFooter({ text: 'Bond sobe com missões e incensos (/use).' });
    await respond(interaction, { embeds: [embed] });
  },

  async autocomplete(interaction) {
    const results = await ServantService.searchOwned(interaction.user.id, interaction.options.getFocused(), 25);
    await interaction.respond(results.map((s) => ({ name: truncate(`${s.name} (${s.class.name})`, 100), value: String(s.id) })));
  },
};
