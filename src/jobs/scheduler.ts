/**
 * Jobs automáticos. A rotação de banner não precisa de job (o banner ativo é
 * resolvido pela data), mas o anúncio no canal sim.
 *
 * Guerra do Santo Graal: fim das inscrições, virada do dia (reset de AP) e
 * publicação da crônica pública no canal da Guerra.
 */
import type { Client, TextBasedChannel } from 'discord.js';
import { env } from '../config/env';
import { PoolService } from '../modules/pools/pool.service';
import { SummonService } from '../modules/summon/summon.service';
import { logger } from '../shared/logger';
import { bannerEmbed } from '../discord/embeds/banner.embed';
import { publicEventEmbed } from '../discord/embeds/war.embed';
import { WarService } from '../modules/grail-war/war.service';
import { BattleService } from '../modules/battle/battle.service';
import { refreshBattleMessage } from '../discord/battle/battle.render';

const MINUTE = 60 * 1000;

async function announceBanner(client: Client) {
  const channelId = env().BANNER_ANNOUNCE_CHANNEL_ID;
  if (!channelId) return;
  const pool = await PoolService.getActive();
  if (!pool || pool.announcedAt) return;

  const channel = await client.channels.fetch(channelId).catch(() => null);
  if (!channel || !channel.isTextBased() || !('send' in channel)) {
    logger.warn(`Canal de anúncio ${channelId} inválido`);
    return;
  }
  const upcoming = await PoolService.getUpcoming();
  await (channel as TextBasedChannel & { send: Function }).send({
    content: '🔮 **Um novo banner de invocação começou!**',
    embeds: [bannerEmbed(pool, SummonService.rates(pool), upcoming)],
  });
  await PoolService.markAnnounced(pool.id);
  logger.info(`Banner anunciado: ${pool.slug}`);
}

async function warTick() {
  const closed = await WarService.closeExpiredRegistrations();
  const advanced = await WarService.advanceDueDays();
  if (closed || advanced) logger.info(`Guerras: ${closed} inscrição(ões) encerrada(s), ${advanced} dia(s) avançado(s)`);
}

async function announceWarEvents(client: Client) {
  const events = await WarService.pendingPublicEvents();
  const done: number[] = [];
  for (const e of events) {
    try {
      const channel = await client.channels.fetch(e.war.channelId).catch(() => null);
      if (channel && channel.isTextBased() && 'send' in channel) {
        await (channel as TextBasedChannel & { send: Function }).send({ embeds: [publicEventEmbed(e.message, e.day)] });
      } else {
        logger.warn(`Canal da Guerra ${e.war.channelId} indisponível; evento ${e.id} descartado`);
      }
    } catch (err) {
      logger.error(`Falha ao publicar evento ${e.id}`, err);
    }
    // Marca mesmo em caso de falha para não repetir mensagens indefinidamente
    done.push(e.id);
  }
  await WarService.markAnnounced(done);
}

/** Turnos que estouraram o tempo: o Servant ataca sozinho */
async function battleTimeouts(client: Client) {
  const expired = await BattleService.expiredTurns();
  for (const b of expired) {
    try {
      await BattleService.perform(b.id, null, { kind: 'ATTACK' }, b.currentActorId);
      await refreshBattleMessage(client, b.id);
      logger.info(`Batalha ${b.id}: turno resolvido por tempo esgotado`);
    } catch (err) {
      logger.warn(`Batalha ${b.id}: falha no turno automático`, err);
    }
  }
}

export function startScheduler(client: Client): void {
  const jobs: { name: string; everyMs: number; run: (c: Client) => Promise<void> }[] = [
    { name: 'announce-banner', everyMs: 10 * MINUTE, run: announceBanner },
    { name: 'war-tick', everyMs: MINUTE, run: warTick },
    { name: 'war-announcer', everyMs: 15 * 1000, run: announceWarEvents },
    { name: 'battle-timeouts', everyMs: MINUTE, run: battleTimeouts },
  ];

  for (const job of jobs) {
    const tick = () =>
      job.run(client).catch((err) => logger.error(`Job ${job.name} falhou`, err));
    void tick();
    setInterval(tick, job.everyMs).unref();
  }
  logger.info(`Scheduler iniciado com ${jobs.length} job(s)`);
}
