import { Client, Events, GatewayIntentBits } from 'discord.js';
import { env } from './config/env';
import { prisma } from './database/prisma';
import { handleInteraction } from './discord/interactions/router';
import { startScheduler } from './jobs/scheduler';
import { logger } from './shared/logger';

async function main() {
  const config = env();
  await prisma.$connect();
  // Aquece o pool de conexões para a primeira interação não pagar esse custo
  await prisma.$queryRaw`SELECT 1`;
  logger.info('Conectado ao PostgreSQL');

  // Slash commands não precisam de intents privilegiadas
  const client = new Client({ intents: [GatewayIntentBits.Guilds] });

  client.once(Events.ClientReady, (c) => {
    logger.info(`Bot online como ${c.user.tag}`);
    startScheduler(c);
  });
  client.on(Events.InteractionCreate, (interaction) => void handleInteraction(interaction));

  const shutdown = async (signal: string) => {
    logger.info(`${signal} recebido, encerrando…`);
    await client.destroy();
    await prisma.$disconnect();
    process.exit(0);
  };
  process.on('SIGINT', () => void shutdown('SIGINT'));
  process.on('SIGTERM', () => void shutdown('SIGTERM'));

  await client.login(config.DISCORD_TOKEN);
}

main().catch((err) => {
  logger.error('Falha fatal na inicialização', err);
  process.exit(1);
});
