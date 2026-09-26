import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  SlashCommandBuilder,
  StringSelectMenuBuilder,
  type ChatInputCommandInteraction,
  type ButtonInteraction,
  type StringSelectMenuInteraction,
} from 'discord.js';
import { ItemType } from '@prisma/client';
import { gameConfig } from '../../config/game';
import { InventoryService } from '../../modules/inventory/inventory.service';
import { SummonService, type SummonSource } from '../../modules/summon/summon.service';
import { UserService } from '../../modules/users/user.service';
import { GameError, SummonCooldownError } from '../../shared/errors';
import { truncate } from '../../shared/format';
import { errorEmbed } from '../embeds/common';
import { castingEmbed, cooldownEmbed, ritualEmbed, summonResultEmbed } from '../embeds/summon.embed';
import { customId, type Command, type ComponentHandler, type ComponentInteraction } from '../types';
import { EPHEMERAL, respond } from './shared';

const PREFIX = 'summon';
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

const SRC = { free: 'f', ticket: 't' } as const;
const parseSrc = (v: string | undefined): SummonSource => (v === 't' ? 'ticket' : 'free');

/** Decide como o jogador vai pagar o summon agora (ou null se não puder) */
async function resolveSource(userId: string): Promise<{ source: SummonSource | null; nextAt: Date; tickets: number }> {
  const user = await UserService.get(userId);
  const status = SummonService.status(user?.lastFreeSummonAt ?? null);
  const tickets = await SummonService.ticketCount(userId);
  if (status.canSummon) return { source: 'free', nextAt: status.nextAt, tickets };
  return { source: tickets > 0 ? 'ticket' : null, nextAt: status.nextAt, tickets };
}

async function buildRitual(userId: string, selectedItemId: number | null, source: SummonSource) {
  const pool = await SummonService.getActivePoolOrThrow();
  const owned = await InventoryService.list(userId, ItemType.CATALYST);
  const selected = selectedItemId ? owned.find((o) => o.itemId === selectedItemId) ?? null : null;
  const preview = selected ? SummonService.previewCatalyst(pool, selected.item) : null;

  const components: ActionRowBuilder<StringSelectMenuBuilder | ButtonBuilder>[] = [];
  if (owned.length > 0) {
    const select = new StringSelectMenuBuilder()
      .setCustomId(customId(PREFIX, userId, 'pick', SRC[source]))
      .setPlaceholder('Escolha um catalisador (opcional)')
      .addOptions(
        { label: 'Sem catalisador', value: '0', emoji: '⭕', default: !selected },
        ...owned.slice(0, 24).map((o) => {
          const p = SummonService.previewCatalyst(pool, o.item);
          return {
            label: truncate(`${o.item.name} ×${o.quantity}`, 100),
            value: String(o.itemId),
            emoji: o.item.emoji,
            default: selected?.itemId === o.itemId,
            description: truncate(
              p.resonating.length ? `Ressoa com: ${p.resonating.map((s) => s.name).join(', ')}` : 'Sem ressonância neste banner',
              100,
            ),
          };
        }),
      );
    components.push(new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(select));
  }

  const canUse = !preview || preview.resonating.length > 0;
  components.push(
    new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setCustomId(customId(PREFIX, userId, 'go', selected?.itemId ?? 0, SRC[source]))
        .setLabel(source === 'ticket' ? 'Invocar (usar 1 ticket)' : 'Iniciar invocação')
        .setEmoji('🔮')
        .setStyle(ButtonStyle.Primary)
        .setDisabled(!canUse),
      new ButtonBuilder().setCustomId(customId(PREFIX, userId, 'cancel')).setLabel('Cancelar').setStyle(ButtonStyle.Secondary),
    ),
  );

  const tickets = await SummonService.ticketCount(userId);
  return { embeds: [ritualEmbed(pool, preview, owned.length, source, tickets)], components };
}

/** Executa o summon e anima o resultado. A interação já deve ter sido respondida/deferida. */
async function runSummon(
  interaction: ChatInputCommandInteraction | ButtonInteraction,
  catalystItemId: number | null,
  source: SummonSource,
): Promise<void> {
  const user = interaction.user;
  const masterName = interaction.inGuild() && interaction.member && 'displayName' in interaction.member
    ? (interaction.member.displayName as string)
    : user.globalName ?? user.username;

  try {
    const result = await SummonService.perform(user.id, user.username, catalystItemId, source);
    await interaction.editReply({ embeds: [castingEmbed(result.servant.rarity, result.servant.class, result.catalyst)], components: [] });
    await sleep(gameConfig.summon.ritualDelayMs);
    await interaction.editReply({ embeds: [summonResultEmbed(result, masterName)], components: [] });
  } catch (err) {
    if (!(err instanceof GameError)) throw err;
    const embed = err instanceof SummonCooldownError ? cooldownEmbed(err.nextAvailableAt) : errorEmbed(err.message);
    if (interaction.isButton()) {
      // Pelo botão, a mensagem pode já conter o resultado de um clique anterior
      // (duplo clique): o erro vai só para quem clicou, sem sobrescrever nada.
      await interaction.followUp({ embeds: [embed], ...EPHEMERAL });
    } else {
      await interaction.editReply({ embeds: [embed], components: [] });
    }
  }
}

export const summonCommand: Command = {
  data: new SlashCommandBuilder()
    .setName('summon')
    .setDescription('Realiza o ritual de invocação semanal de um Servant')
    .addStringOption((o) =>
      o.setName('catalyst').setDescription('Catalisador a ser usado (opcional)').setAutocomplete(true),
    ),

  async execute(interaction) {
    const { source, nextAt } = await resolveSource(interaction.user.id);
    if (!source) {
      await respond(interaction, { embeds: [cooldownEmbed(nextAt)] }, { ephemeral: true });
      return;
    }

    const catalystOpt = interaction.options.getString('catalyst');
    if (catalystOpt && catalystOpt !== '0') {
      const itemId = Number(catalystOpt);
      const owned = Number.isInteger(itemId) ? await InventoryService.getOwned(interaction.user.id, itemId) : null;
      if (!owned || owned.quantity <= 0 || owned.item.type !== ItemType.CATALYST) {
        await respond(interaction, { embeds: [errorEmbed('Você não possui esse catalisador. Escolha um da lista.')] }, { ephemeral: true });
        return;
      }
      await runSummon(interaction, itemId, source);
      return;
    }

    await respond(interaction, await buildRitual(interaction.user.id, null, source));
  },

  async autocomplete(interaction) {
    const focused = interaction.options.getFocused().toLowerCase();
    const owned = await InventoryService.list(interaction.user.id, ItemType.CATALYST);
    await interaction.respond(
      owned
        .filter((o) => o.item.name.toLowerCase().includes(focused))
        .slice(0, 25)
        .map((o) => ({ name: truncate(`${o.item.name} (×${o.quantity})`, 100), value: String(o.itemId) })),
    );
  },
};

export const summonComponents: ComponentHandler = {
  prefix: PREFIX,
  async handle(interaction: ComponentInteraction, args: string[]) {
    const [action, arg] = args;

    if (action === 'cancel' && interaction.isButton()) {
      await interaction.update({ embeds: [errorEmbed('Ritual cancelado. O círculo se apaga em silêncio.')], components: [] });
      return;
    }

    if (action === 'pick' && interaction.isStringSelectMenu()) {
      const value = (interaction as StringSelectMenuInteraction).values[0] ?? '0';
      const itemId = value === '0' ? null : Number(value);
      await interaction.update(await buildRitual(interaction.user.id, itemId, parseSrc(arg)));
      return;
    }

    if (action === 'go' && interaction.isButton()) {
      const itemId = arg && arg !== '0' ? Number(arg) : null;
      await interaction.deferUpdate();
      await runSummon(interaction, itemId, parseSrc(args[2]));
    }
  },
};
