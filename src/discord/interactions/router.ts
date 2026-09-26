import { EmbedBuilder, type Interaction, type RepliableInteraction } from 'discord.js';
import { gameConfig } from '../../config/game';
import { UserService } from '../../modules/users/user.service';
import { GameError } from '../../shared/errors';
import { logger } from '../../shared/logger';
import { commands, componentHandlers } from '../commands';
import { EPHEMERAL } from '../commands/shared';
import { COLORS, errorEmbed } from '../embeds/common';

const commandMap = new Map(commands.map((c) => [c.data.name, c]));
const componentMap = new Map(componentHandlers.map((h) => [h.prefix, h]));

async function sendError(interaction: RepliableInteraction, message: string) {
  const payload = { embeds: [errorEmbed(message)] };
  try {
    if (interaction.deferred && !interaction.replied) await interaction.editReply({ ...payload, components: [] });
    else if (interaction.replied) await interaction.followUp({ ...payload, ...EPHEMERAL });
    else await interaction.reply({ ...payload, ...EPHEMERAL });
  } catch (e) {
    logger.warn('Falha ao enviar mensagem de erro', e);
  }
}

function welcomeEmbed(): EmbedBuilder {
  return new EmbedBuilder()
    .setColor(COLORS.primary)
    .setTitle('🩸 Os Selos de Comando surgem em sua mão')
    .setDescription(
      [
        'Você foi escolhido pelo Graal como **Master**.',
        '',
        `• Você começou com **${gameConfig.newPlayer.startingCoins} moedas** e ${gameConfig.newPlayer.startingCatalysts} catalisador(es) aleatório(s) — veja em \`/catalysts\`.`,
        '• Use `/summon` uma vez por semana para invocar um Servant.',
        '• `/banner` mostra quem está disponível e as taxas.',
        '• `/mission` envia Servants em expedições por XP, moedas, itens e Bond.',
        '• `/servants` mostra sua coleção e `/profile` o seu perfil.',
      ].join('\n'),
    );
}

export async function handleInteraction(interaction: Interaction): Promise<void> {
  try {
    if (interaction.isAutocomplete()) {
      const cmd = commandMap.get(interaction.commandName);
      await cmd?.autocomplete?.(interaction);
      return;
    }

    if (interaction.isChatInputCommand()) {
      const cmd = commandMap.get(interaction.commandName);
      if (!cmd) return;
      // O Discord dá só 3 s para a primeira resposta. Segura a interação ANTES
      // de tocar no banco (a criação do perfil + a primeira query podem demorar).
      await interaction.deferReply(cmd.defer === 'ephemeral' ? EPHEMERAL : {});
      // Criação automática de perfil no primeiro comando
      const { created } = await UserService.ensure(interaction.user.id, interaction.user.username);
      await cmd.execute(interaction);
      if (created) await interaction.followUp({ embeds: [welcomeEmbed()], ...EPHEMERAL }).catch(() => undefined);
      return;
    }

    if (interaction.isButton() || interaction.isStringSelectMenu()) {
      const [prefix, ownerId, ...args] = interaction.customId.split(':');
      const handler = prefix ? componentMap.get(prefix) : undefined;
      if (!handler) return;
      // ownerId "*" = componente compartilhado (ex.: botões de batalha); o handler valida quem pode usar
      if (ownerId && ownerId !== '*' && ownerId !== interaction.user.id) {
        await interaction.reply({ embeds: [errorEmbed('Esses controles pertencem a outro Master.')], ...EPHEMERAL });
        return;
      }
      await handler.handle(interaction, args);
    }
  } catch (err) {
    if (!interaction.isRepliable()) {
      logger.error('Erro em autocomplete', err);
      return;
    }
    if (err instanceof GameError) {
      await sendError(interaction, err.message);
      return;
    }
    logger.error(`Erro inesperado na interação ${interaction.id}`, err);
    await sendError(interaction, 'Algo deu errado no ritual. O erro foi registrado.');
  }
}
