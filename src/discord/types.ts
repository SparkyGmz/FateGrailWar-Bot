import type {
  AutocompleteInteraction,
  ButtonInteraction,
  ChatInputCommandInteraction,
  RESTPostAPIChatInputApplicationCommandsJSONBody,
  StringSelectMenuInteraction,
} from 'discord.js';

export interface Command {
  data: { name: string; toJSON(): RESTPostAPIChatInputApplicationCommandsJSONBody };
  /**
   * Como o router "segura" a interação antes de executar o comando
   * (o Discord exige resposta em até 3 s). Padrão: 'public'.
   */
  defer?: 'public' | 'ephemeral';
  execute(interaction: ChatInputCommandInteraction): Promise<void>;
  autocomplete?(interaction: AutocompleteInteraction): Promise<void>;
}

export type ComponentInteraction = ButtonInteraction | StringSelectMenuInteraction;

/**
 * Handler de botões/menus. O customId segue o formato
 *   <prefix>:<ownerId>:<arg1>:<arg2>...
 * O router só entrega a interação se quem clicou for o ownerId.
 */
export interface ComponentHandler {
  prefix: string;
  handle(interaction: ComponentInteraction, args: string[]): Promise<void>;
}

export function customId(prefix: string, ownerId: string, ...args: (string | number)[]): string {
  const id = [prefix, ownerId, ...args].join(':');
  if (id.length > 100) throw new Error(`customId excede 100 caracteres: ${id}`);
  return id;
}
