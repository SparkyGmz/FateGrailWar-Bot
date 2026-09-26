import { MessageFlags, type ChatInputCommandInteraction, type InteractionEditReplyOptions } from 'discord.js';
import { classes } from '../../content/classes';

/** Choices estáticas para opções de classe (geradas a partir do conteúdo) */
export const classChoices = classes.map((c) => ({ name: c.name, value: c.id }));

export const EPHEMERAL = { flags: MessageFlags.Ephemeral } as const;

type Payload = Pick<InteractionEditReplyOptions, 'embeds' | 'components'>;

/**
 * Responde um slash command. O router já fez deferReply (para nunca estourar
 * o limite de 3 s do Discord), então aqui normalmente editamos a resposta.
 *
 * Se a resposta pedir `ephemeral` mas o defer foi público (ex.: aviso de
 * cooldown no /summon), a mensagem pública "pensando…" é apagada e o aviso
 * vai só para quem usou o comando.
 */
export async function respond(
  interaction: ChatInputCommandInteraction,
  payload: Payload,
  opts: { ephemeral?: boolean } = {},
): Promise<void> {
  if (!interaction.deferred && !interaction.replied) {
    await interaction.reply({ ...payload, ...(opts.ephemeral ? EPHEMERAL : {}) });
    return;
  }
  if (opts.ephemeral && !interaction.ephemeral) {
    await interaction.deleteReply().catch(() => undefined);
    await interaction.followUp({ ...payload, ...EPHEMERAL });
    return;
  }
  await interaction.editReply(payload);
}
