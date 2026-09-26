import { EmbedBuilder } from 'discord.js';
import type { NoblePhantasm, PlayerServant, Servant, ServantClass, ServantSkill, Skill } from '@prisma/client';
import { progressBar, rarityColor, stars } from '../../shared/format';
import { classLabel } from './common';
import { gameConfig } from '../../config/game';

type FullServant = Servant & {
  class: ServantClass;
  noblePhantasms: NoblePhantasm[];
  skills?: (ServantSkill & { skill: Skill })[];
};

export function statBlock(s: Pick<Servant, 'strength' | 'endurance' | 'agility' | 'mana' | 'luck' | 'npRank'>): string {
  const rows: [string, string][] = [
    ['STR', s.strength],
    ['END', s.endurance],
    ['AGI', s.agility],
    ['MANA', s.mana],
    ['LUCK', s.luck],
    ['NP', s.npRank],
  ];
  return '```\n' + rows.map(([k, v]) => `${k.padEnd(5)} ${v}`).join('\n') + '\n```';
}

export function servantEmbed(s: FullServant, owned: PlayerServant | null): EmbedBuilder {
  const embed = new EmbedBuilder()
    .setColor(rarityColor[s.rarity] ?? 0xffffff)
    .setTitle(`${s.class.name.toUpperCase()} — ${s.name}`)
    .setDescription(`${stars(s.rarity)}\n\n*${s.description}*`)
    .addFields(
      { name: 'Classe', value: classLabel(s.class), inline: true },
      { name: 'Alinhamento', value: s.alignment || '—', inline: true },
      { name: 'Sexo', value: s.gender || '—', inline: true },
      { name: 'Origem', value: s.origin || '—', inline: true },
      { name: 'Região', value: s.region || '—', inline: true },
      { name: 'Era', value: s.era || '—', inline: true },
      { name: 'Parâmetros', value: statBlock(s), inline: true },
    );

  const np = s.noblePhantasms[0];
  if (np) {
    embed.addFields({ name: 'Noble Phantasm', value: `**${np.name}**\nRank ${np.rank}${np.type ? ` · ${np.type}` : ''}`, inline: true });
  }
  if (s.skills?.length) {
    embed.addFields({
      name: 'Skills',
      value: s.skills.map((k) => `**${k.skill.name}** — ${k.skill.description}`).join('\n').slice(0, 1024),
    });
  }
  if (s.traits.length) {
    embed.addFields({ name: 'Traits', value: s.traits.map((t) => `\`${t}\``).join(' ') });
  }

  if (owned) {
    embed.addFields({
      name: '📜 Contrato',
      value: [
        `Bond Lv. **${owned.bondLevel}** ${progressBar(owned.bondXp, gameConfig.bond.xpToNextLevel(owned.bondLevel))}`,
        `Duplicatas: **${owned.duplicates}** · Batalhas: **${owned.battles}** · Vitórias: **${owned.wins}**`,
      ].join('\n'),
    });
    embed.setFooter({ text: 'Você possui este Servant' });
  } else {
    embed.setFooter({ text: 'Você ainda não invocou este Servant' });
  }

  if (s.imageUrl) embed.setThumbnail(s.imageUrl);
  return embed;
}
