import {
  ActionRowBuilder,
  EmbedBuilder,
  SlashCommandBuilder,
  StringSelectMenuBuilder,
  type ChatInputCommandInteraction,
  type Client,
} from 'discord.js';
import { BattleService, type BattleCommand, type CommandSpellUse } from '../../modules/battle/battle.service';
import { WarService } from '../../modules/grail-war/war.service';
import { prisma } from '../../database/prisma';
import { GameError } from '../../shared/errors';
import { truncate } from '../../shared/format';
import { privatePanelEmbed, refreshBattleMessage } from '../battle/battle.render';
import { COLORS, errorEmbed, successEmbed } from '../embeds/common';
import { actionResultEmbed } from '../embeds/war.embed';
import { customId, type Command, type ComponentHandler, type ComponentInteraction } from '../types';
import { EPHEMERAL, respond } from './shared';

function guild(i: { guildId: string | null }): string {
  if (!i.guildId) throw new GameError('Batalhas só acontecem dentro de um servidor.');
  return i.guildId;
}

async function requireBattle(guildId: string, userId: string) {
  const battle = await BattleService.activeBattleFor(guildId, userId);
  if (!battle) throw new GameError('Você não está em nenhuma batalha.');
  return battle;
}

function resultEmbed(lines: string[], ended: boolean): EmbedBuilder {
  return new EmbedBuilder()
    .setColor(ended ? COLORS.ritual : COLORS.info)
    .setDescription(lines.join('\n').slice(0, 4000) || 'Feito.')
    .setFooter({ text: ended ? 'A batalha terminou.' : 'A mensagem da batalha no canal foi atualizada.' });
}

/** Executa uma ação de batalha e atualiza a mensagem pública */
async function runBattleCommand(client: Client, guildId: string, userId: string, cmd: BattleCommand) {
  const battle = await requireBattle(guildId, userId);
  const res = await BattleService.perform(battle.id, userId, cmd);
  await refreshBattleMessage(client, battle.id);
  return res;
}

const CS_OPTIONS: { value: CommandSpellUse; label: string; description: string; emoji: string }[] = [
  { value: 'FULL_HEAL', label: 'Cura total', description: 'Restaura todo o HP e remove efeitos negativos (ação livre)', emoji: '💚' },
  { value: 'FORCED_NP', label: 'Noble Phantasm forçado', description: 'Libera o NP sem custo de mana e 20% mais forte', emoji: '💥' },
  { value: 'ESCAPE', label: 'Fuga', description: 'Encerra a batalha e teleporta para uma região vizinha', emoji: '🌀' },
];

function skillSelect(userId: string, battleId: number, skills: Awaited<ReturnType<typeof BattleService.privateView>>['skills'], mp: number) {
  return new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
    new StringSelectMenuBuilder()
      .setCustomId(customId('bts', userId, battleId))
      .setPlaceholder('Escolha uma Skill')
      .addOptions(
        skills.map((k) => ({
          label: truncate(k.name, 100),
          value: k.slug,
          emoji: k.cooldown ? '⏳' : k.cost > mp ? '🔷' : '✨',
          description: truncate(`${k.cost} MP${k.cooldown ? ` · recarga ${k.cooldown}t` : ''} — ${k.description}`, 100),
        })),
      ),
  );
}

function csSelect(userId: string, battleId: number) {
  return new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
    new StringSelectMenuBuilder()
      .setCustomId(customId('btc', userId, battleId))
      .setPlaceholder('Qual ordem você dará ao seu Servant?')
      .addOptions(CS_OPTIONS.map((o) => ({ label: o.label, value: o.value, description: o.description, emoji: o.emoji }))),
  );
}

export const battleCommand: Command = {
  defer: 'ephemeral',
  data: new SlashCommandBuilder()
    .setName('battle')
    .setDescription('Combate da Guerra do Santo Graal')
    .setDMPermission(false)
    .addSubcommand((s) =>
      s
        .setName('challenge')
        .setDescription('Ataca um Master que você encontrou na sua região hoje (1 AP)')
        .addUserOption((o) => o.setName('master').setDescription('Master alvo').setRequired(true)),
    )
    .addSubcommand((s) => s.setName('status').setDescription('Seu painel privado de combate'))
    .addSubcommand((s) => s.setName('attack').setDescription('Ataque básico'))
    .addSubcommand((s) => s.setName('defend').setDescription('Reduz o dano recebido até o seu próximo turno'))
    .addSubcommand((s) =>
      s
        .setName('skill')
        .setDescription('Usa uma Skill do seu Servant')
        .addStringOption((o) => o.setName('skill').setDescription('Skill').setRequired(true).setAutocomplete(true)),
    )
    .addSubcommand((s) => s.setName('retreat').setDescription('Tenta recuar da batalha')),

  async execute(interaction) {
    const g = guild(interaction);
    const sub = interaction.options.getSubcommand();
    const uid = interaction.user.id;

    if (sub === 'challenge') {
      const target = interaction.options.getUser('master', true);
      const res = await BattleService.challenge(g, uid, target.id);
      await refreshBattleMessage(interaction.client, res.battleId);
      await respond(interaction, { embeds: [actionResultEmbed(res)] });
      return;
    }
    if (sub === 'status') {
      const battle = await requireBattle(g, uid);
      await respond(interaction, { embeds: [privatePanelEmbed(await BattleService.privateView(battle.id, uid))] });
      return;
    }
    const cmd: BattleCommand =
      sub === 'attack' ? { kind: 'ATTACK' }
      : sub === 'defend' ? { kind: 'DEFEND' }
      : sub === 'retreat' ? { kind: 'RETREAT' }
      : { kind: 'SKILL', skillSlug: interaction.options.getString('skill', true) };
    const res = await runBattleCommand(interaction.client, g, uid, cmd);
    await respond(interaction, { embeds: [resultEmbed(res.lines, res.ended)] });
  },

  async autocomplete(interaction) {
    if (!interaction.guildId) return interaction.respond([]);
    const battle = await BattleService.activeBattleFor(interaction.guildId, interaction.user.id);
    if (!battle) return interaction.respond([]);
    const view = await BattleService.privateView(battle.id, interaction.user.id);
    const q = interaction.options.getFocused().toLowerCase();
    await interaction.respond(
      view.skills
        .filter((k) => k.name.toLowerCase().includes(q))
        .map((k) => ({ name: truncate(`${k.name} · ${k.cost} MP${k.cooldown ? ` · recarga ${k.cooldown}t` : ''}`, 100), value: k.slug })),
    );
  },
};

export const npCommand: Command = {
  defer: 'ephemeral',
  data: new SlashCommandBuilder().setName('np').setDescription('Libera o Noble Phantasm do seu Servant').setDMPermission(false),
  async execute(interaction) {
    const res = await runBattleCommand(interaction.client, guild(interaction), interaction.user.id, { kind: 'NP' });
    await respond(interaction, { embeds: [resultEmbed(res.lines, res.ended)] });
  },
};

export const commandSpellCommand: Command = {
  defer: 'ephemeral',
  data: new SlashCommandBuilder()
    .setName('commandspell')
    .setDescription('Usa um dos seus três Selos de Comando')
    .setDMPermission(false)
    .addStringOption((o) =>
      o.setName('uso').setDescription('A ordem').setRequired(true).addChoices(
        { name: 'Cura total', value: 'FULL_HEAL' },
        { name: 'Noble Phantasm forçado (em combate)', value: 'FORCED_NP' },
        { name: 'Fuga (em combate)', value: 'ESCAPE' },
        { name: 'Teleporte (fora de combate)', value: 'TELEPORT' },
      ),
    )
    .addStringOption((o) => o.setName('destino').setDescription('Região (para teleporte)').setAutocomplete(true)),

  async execute(interaction: ChatInputCommandInteraction) {
    const g = guild(interaction);
    const use = interaction.options.getString('uso', true) as CommandSpellUse;
    const battle = await BattleService.activeBattleFor(g, interaction.user.id);
    if (battle) {
      const res = await runBattleCommand(interaction.client, g, interaction.user.id, { kind: 'COMMAND_SPELL', use });
      await respond(interaction, { embeds: [resultEmbed(res.lines, res.ended)] });
      return;
    }
    const text = await BattleService.commandSpellOutside(g, interaction.user.id, use, interaction.options.getString('destino'));
    await respond(interaction, { embeds: [successEmbed(text)] });
  },

  async autocomplete(interaction) {
    if (!interaction.guildId) return interaction.respond([]);
    const war = await WarService.getOpenWar(interaction.guildId);
    if (!war) return interaction.respond([]);
    const q = interaction.options.getFocused().toLowerCase();
    const locs = await prisma.warLocation.findMany({ where: { warId: war.id }, orderBy: { name: 'asc' } });
    await interaction.respond(
      locs.filter((l) => l.name.toLowerCase().includes(q)).map((l) => ({ name: `${l.emoji} ${l.name}`, value: l.slug })),
    );
  },
};

// ---------------------------------------------------------------- botões e menus

/** Erros de botões na mensagem pública vão só para quem clicou (nunca editam a mensagem) */
async function safe(interaction: ComponentInteraction, fn: () => Promise<void>) {
  try {
    await fn();
  } catch (err) {
    if (!(err instanceof GameError)) throw err;
    const payload = { embeds: [errorEmbed(err.message)], ...EPHEMERAL };
    if (interaction.deferred || interaction.replied) await interaction.followUp(payload);
    else await interaction.reply(payload);
  }
}

export const battleButtons: ComponentHandler = {
  prefix: 'bt',
  async handle(interaction, args) {
    const battleId = Number(args[0]);
    const action = args[1];
    const uid = interaction.user.id;

    await safe(interaction, async () => {
      if (action === 'panel') {
        await interaction.reply({ embeds: [privatePanelEmbed(await BattleService.privateView(battleId, uid))], ...EPHEMERAL });
        return;
      }
      if (action === 'skill') {
        const view = await BattleService.privateView(battleId, uid);
        if (!view.myTurn) throw new GameError('Não é o seu turno.');
        await interaction.reply({ components: [skillSelect(uid, battleId, view.skills, view.combatant.mp)], ...EPHEMERAL });
        return;
      }
      if (action === 'cs') {
        const view = await BattleService.privateView(battleId, uid);
        if (!view.myTurn) throw new GameError('Não é o seu turno.');
        if (view.commandSpells <= 0) throw new GameError('Você não tem mais Selos de Comando. ⚪ ⚪ ⚪');
        await interaction.reply({ content: `Selos restantes: **${view.commandSpells}**`, components: [csSelect(uid, battleId)], ...EPHEMERAL });
        return;
      }
      const cmd: BattleCommand | null =
        action === 'attack' ? { kind: 'ATTACK' }
        : action === 'defend' ? { kind: 'DEFEND' }
        : action === 'np' ? { kind: 'NP' }
        : action === 'retreat' ? { kind: 'RETREAT' }
        : null;
      if (!cmd) return;
      await interaction.deferUpdate();
      await BattleService.perform(battleId, uid, cmd);
      await refreshBattleMessage(interaction.client, battleId);
    });
  },
};

export const battleSkillSelect: ComponentHandler = {
  prefix: 'bts',
  async handle(interaction, args) {
    if (!interaction.isStringSelectMenu()) return;
    const battleId = Number(args[0]);
    const slug = interaction.values[0]!;
    await interaction.deferUpdate();
    try {
      const res = await BattleService.perform(battleId, interaction.user.id, { kind: 'SKILL', skillSlug: slug });
      await interaction.editReply({ content: '', embeds: [resultEmbed(res.lines, res.ended)], components: [] });
      await refreshBattleMessage(interaction.client, battleId);
    } catch (err) {
      if (!(err instanceof GameError)) throw err;
      await interaction.editReply({ embeds: [errorEmbed(err.message)], components: [] });
    }
  },
};

export const battleCommandSpellSelect: ComponentHandler = {
  prefix: 'btc',
  async handle(interaction, args) {
    if (!interaction.isStringSelectMenu()) return;
    const battleId = Number(args[0]);
    const use = interaction.values[0] as CommandSpellUse;
    await interaction.deferUpdate();
    try {
      const res = await BattleService.perform(battleId, interaction.user.id, { kind: 'COMMAND_SPELL', use });
      await interaction.editReply({ content: '', embeds: [resultEmbed(res.lines, res.ended)], components: [] });
      await refreshBattleMessage(interaction.client, battleId);
    } catch (err) {
      if (!(err instanceof GameError)) throw err;
      await interaction.editReply({ content: '', embeds: [errorEmbed(err.message)], components: [] });
    }
  },
};
