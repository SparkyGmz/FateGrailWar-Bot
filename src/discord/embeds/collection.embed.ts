import { EmbedBuilder } from 'discord.js';
import type { ServantService } from '../../modules/servants/servant.service';
import { stars } from '../../shared/format';
import { COLORS } from './common';

type Collection = Awaited<ReturnType<typeof ServantService.collection>>;

export function collectionEmbed(c: Collection, ownerName: string, classFilterName: string | null, totalServants: number): EmbedBuilder {
  const lines = c.items.map((ps) => {
    const s = ps.servant;
    const dup = ps.duplicates > 0 ? ` · 🔁${ps.duplicates}` : '';
    return `${s.class.emoji} \`${stars(s.rarity)}\` **${s.name}** — Bond ${ps.bondLevel}${dup}`;
  });

  return new EmbedBuilder()
    .setColor(COLORS.primary)
    .setTitle(`📖 Coleção de ${ownerName}${classFilterName ? ` — ${classFilterName}` : ''}`)
    .setDescription(lines.length ? lines.join('\n') : '*Nenhum Servant aqui ainda. Use `/summon`!*')
    .setFooter({ text: `Página ${c.page + 1}/${c.totalPages} · ${c.total} Servant(s) · Catálogo: ${totalServants}` });
}
