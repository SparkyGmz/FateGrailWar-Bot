/**
 * Registra os slash commands no Discord.
 *   npm run deploy-commands
 * Com DEV_GUILD_ID definido, registra só naquele servidor (instantâneo).
 */
import { REST, Routes } from 'discord.js';
import { env } from '../config/env';
import { commands } from './commands';

async function main() {
  const { DISCORD_TOKEN, DISCORD_CLIENT_ID, DEV_GUILD_ID } = env();
  const rest = new REST().setToken(DISCORD_TOKEN);
  const body = commands.map((c) => c.data.toJSON());

  const route = DEV_GUILD_ID
    ? Routes.applicationGuildCommands(DISCORD_CLIENT_ID, DEV_GUILD_ID)
    : Routes.applicationCommands(DISCORD_CLIENT_ID);

  await rest.put(route, { body });
  console.log(`✅ ${body.length} comandos registrados ${DEV_GUILD_ID ? `no servidor ${DEV_GUILD_ID}` : 'globalmente'}.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
