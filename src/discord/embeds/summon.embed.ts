import { EmbedBuilder } from 'discord.js';
import type { Item, ServantClass } from '@prisma/client';
import type { ActivePool } from '../../modules/pools/pool.service';
import type { CatalystPreview, SummonResult, SummonSource } from '../../modules/summon/summon.service';
import { discordTime, percent, rarityColor, stars, truncate } from '../../shared/format';
import { COLORS, classLabel } from './common';

export function cooldownEmbed(nextAt: Date): EmbedBuilder {
  return new EmbedBuilder()
    .setColor(COLORS.ritual)
    .setTitle('🔮 O círculo ainda não se recarregou')
    .setDescription(
      [
        'A mana da terra ainda não se acumulou o suficiente para um novo ritual.',
        '',
        `Próxima invocação gratuita: ${discordTime(nextAt, 'R')} (${discordTime(nextAt, 'f')})`,
        '',
        '🎫 Quer invocar antes? Compre um **Ticket de Invocação** na `/shop` com Spirit Origin.',
      ].join('\n'),
    );
}

export function ritualEmbed(
  pool: ActivePool,
  preview: CatalystPreview | null,
  catalystCount: number,
  source: SummonSource,
  tickets: number,
): EmbedBuilder {
  const featured = pool.servants.filter((s) => s.featured).map((s) => `**${s.servant.name}** (${s.servant.class.name})`);
  const embed = new EmbedBuilder()
    .setColor(COLORS.ritual)
    .setTitle('🔮 Ritual de Invocação')
    .setDescription(
      [
        '*"Que o vazio seja preenchido. Que o círculo se complete cinco vezes..."*',
        '',
        `**Banner:** ${pool.name}`,
        pool.description ? `*${pool.description}*` : '',
        featured.length ? `**Em destaque:** ${featured.join(', ')}` : '',
        '',
        source === 'free'
          ? '🟢 **Custo:** invocação gratuita da semana'
          : `🎫 **Custo:** 1 Ticket de Invocação (você tem ${tickets})`,
      ].filter((l, i, a) => l !== '' || (i > 0 && a[i - 1] !== '')).join('\n'),
    );

  if (preview) {
    const lines = preview.boosted
      .slice(0, 8)
      .map((e) => `${e.servant.class.emoji} ${e.servant.name} — ${percent(e.probability)}`);
    embed.addFields({
      name: `${preview.item.emoji} Catalisador: ${preview.item.name}`,
      value: lines.length
        ? `O catalisador ressoa com:\n${lines.join('\n')}${preview.boosted.length > 8 ? `\n… e mais ${preview.boosted.length - 8}` : ''}`
        : '⚠️ Este catalisador **não ressoa** com nenhum Servant deste banner.',
    });
  } else {
    embed.addFields({
      name: 'Catalisador',
      value: catalystCount > 0
        ? 'Nenhum selecionado. Escolha um no menu abaixo para aumentar a chance de Servants específicos.'
        : 'Você não possui catalisadores. A invocação será guiada apenas pelo acaso.',
    });
  }
  embed.setFooter({ text: 'Catalisadores aumentam chances, mas nunca garantem um Servant.' });
  return embed;
}

const LIGHTS: Record<number, { text: string; color: number }> = {
  5: { text: '🌈 Um **brilho arco-íris** irrompe do círculo! O ar vibra com um poder imenso…', color: 0xffd700 },
  4: { text: '🌟 Uma luz **dourada** preenche a sala. Algo poderoso responde ao chamado…', color: 0xe6b422 },
  3: { text: '⚪ Um brilho **prateado** gira pelo círculo…', color: 0xc0c0c0 },
  2: { text: '🟤 Faíscas **acobreadas** correm pelas linhas do círculo…', color: 0xa97142 },
  1: { text: '🟤 Faíscas **acobreadas** correm pelas linhas do círculo…', color: 0xa97142 },
};

export function castingEmbed(rarity: number, cls: ServantClass, catalyst: Item | null): EmbedBuilder {
  const light = LIGHTS[rarity] ?? LIGHTS[3]!;
  return new EmbedBuilder()
    .setColor(light.color)
    .setTitle('🔮 O ritual começou')
    .setDescription(
      [
        catalyst ? `${catalyst.emoji} O **${catalyst.name}** se desfaz em partículas de luz…` : '',
        light.text,
        '',
        `A silhueta de um **${cls.name}** começa a tomar forma…`,
      ].filter(Boolean).join('\n'),
    );
}

export function summonResultEmbed(r: SummonResult, masterName: string): EmbedBuilder {
  const s = r.servant;
  const lines = [
    `${stars(s.rarity)}`,
    '',
    `*"Servant ${s.class.name}, atendendo ao seu chamado. Pergunto: você é meu Master?"*`,
    '',
    `**Master:** ${masterName}`,
    `**Classe:** ${classLabel(s.class)}`,
    r.noblePhantasm ? `**Noble Phantasm:** ${r.noblePhantasm.name} (${r.noblePhantasm.rank})` : '',
    `**Chance deste resultado:** ${percent(r.probability, 2)}${r.featured ? ' · ⭐ destaque do banner' : ''}`,
  ];

  const embed = new EmbedBuilder()
    .setColor(rarityColor[s.rarity] ?? 0xffffff)
    .setTitle(`${r.isDuplicate ? '🔁' : '✨'} ${s.class.name.toUpperCase()} — ${s.name}`)
    .setDescription(lines.filter(Boolean).join('\n'));

  const rewards: string[] = [];
  if (r.isDuplicate) {
    rewards.push(`🔁 Duplicata (#${r.duplicates}) → **+${r.spiritOriginGained} Spirit Origin**`);
  } else {
    rewards.push('🆕 **Novo Servant** adicionado à sua coleção!');
  }
  rewards.push(`+${r.xpGained} XP · +${r.coinsGained} moedas`);
  if (r.source === 'ticket') rewards.push(`🎫 1 Ticket de Invocação usado (restam ${r.ticketsLeft})`);
  if (r.levelsGained > 0) rewards.push(`⬆️ **Level up!** Agora você é nível **${r.level}**.`);
  if (r.droppedItem) rewards.push(`${r.droppedItem.emoji} O círculo deixou para trás: **${r.droppedItem.name}**`);

  embed.addFields({ name: 'Recompensas', value: rewards.join('\n') });
  embed.setFooter({ text: truncate(`Banner: ${r.pool.name}${r.catalyst ? ` · Catalisador: ${r.catalyst.name}` : ''}`, 2000) });
  if (s.imageUrl) embed.setImage(s.imageUrl);
  return embed;
}
