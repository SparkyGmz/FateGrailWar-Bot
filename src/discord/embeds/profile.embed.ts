import { EmbedBuilder } from 'discord.js';
import type { UserService } from '../../modules/users/user.service';
import type { SummonStatus } from '../../modules/summon/summon.service';
import { discordTime, progressBar } from '../../shared/format';
import { COLORS } from './common';

type Profile = NonNullable<Awaited<ReturnType<typeof UserService.getProfile>>>;

export function profileEmbed(p: Profile, displayName: string, avatarUrl: string, totalServants: number, summon: SummonStatus): EmbedBuilder {
  const u = p.user;
  const embed = new EmbedBuilder()
    .setColor(COLORS.primary)
    .setAuthor({ name: `MASTER — ${displayName}`, iconURL: avatarUrl })
    .setThumbnail(avatarUrl)
    .setDescription(p.title ? `🏷️ *${p.title}*` : null)
    .addFields(
      { name: 'Level', value: `**${u.level}**\n${progressBar(u.xp, p.xpToNext)} ${u.xp} / ${p.xpToNext} XP`, inline: false },
      { name: 'Servants', value: `**${p.servantCount}** / ${totalServants}`, inline: true },
      { name: 'Grails', value: `🏆 **${u.grails}**`, inline: true },
      { name: 'Moedas', value: `🪙 **${u.coins}**`, inline: true },
      { name: 'Spirit Origin', value: `💠 **${u.spiritOrigin}**`, inline: true },
      { name: 'Guerras', value: `Participadas: **${u.warsPlayed}**\nVencidas: **${u.wins}**`, inline: true },
      { name: 'Expedições', value: `🗺️ **${p.activeMissions}** em andamento`, inline: true },
      {
        name: 'Invocação semanal',
        value: summon.canSummon ? '🟢 Disponível agora — use `/summon`' : `⏳ ${discordTime(summon.nextAt, 'R')}`,
        inline: true,
      },
    );

  if (p.favorite) {
    const { servant, link } = p.favorite;
    embed.addFields({
      name: 'Servant favorito',
      value: `${servant.class.emoji} **${servant.class.name} — ${servant.name}**\nBond: **${link.bondLevel}**`,
    });
  } else {
    embed.addFields({ name: 'Servant favorito', value: '*Nenhum — use `/favorite`*' });
  }

  embed.setFooter({ text: `Master desde` }).setTimestamp(u.createdAt);
  return embed;
}
