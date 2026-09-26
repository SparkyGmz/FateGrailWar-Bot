import { EmbedBuilder } from 'discord.js';
import type { SummonPool } from '@prisma/client';
import type { ActivePool } from '../../modules/pools/pool.service';
import type { WeightedEntry } from '../../modules/summon/summon.weights';
import { discordTime, percent, stars } from '../../shared/format';
import { COLORS } from './common';

type Entry = WeightedEntry<ActivePool['servants'][number]['servant']>;

export function bannerEmbed(pool: ActivePool, rates: Entry[], upcoming: SummonPool[]): EmbedBuilder {
  const byRarity = new Map<number, Entry[]>();
  for (const e of rates) {
    const list = byRarity.get(e.servant.rarity) ?? [];
    list.push(e);
    byRarity.set(e.servant.rarity, list);
  }

  const embed = new EmbedBuilder()
    .setColor(COLORS.ritual)
    .setTitle(`🔮 Banner atual: ${pool.name}`)
    .setDescription(
      [
        pool.description ? `*${pool.description}*` : '',
        pool.endDate ? `Termina ${discordTime(pool.endDate, 'R')} (${discordTime(pool.endDate, 'f')})` : 'Banner permanente.',
      ].filter(Boolean).join('\n'),
    );

  for (const rarity of [...byRarity.keys()].sort((a, b) => b - a)) {
    const list = byRarity.get(rarity)!.sort((a, b) => b.probability - a.probability);
    const total = list.reduce((s, e) => s + e.probability, 0);
    const value = list
      .map((e) => `${e.featured ? '⭐' : e.servant.class.emoji} ${e.servant.name} — ${percent(e.probability, 2)}`)
      .join('\n');
    embed.addFields({ name: `${stars(rarity)} (${percent(total)})`, value: value.slice(0, 1024) });
  }

  if (upcoming.length) {
    embed.addFields({
      name: 'Próximos banners',
      value: upcoming.map((p) => `• **${p.name}** — ${discordTime(p.startDate, 'R')}`).join('\n'),
    });
  }
  embed.setFooter({ text: '⭐ = Servant em destaque · Taxas sem catalisador' });
  return embed;
}
