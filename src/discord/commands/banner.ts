import { SlashCommandBuilder } from 'discord.js';
import { PoolService } from '../../modules/pools/pool.service';
import { SummonService } from '../../modules/summon/summon.service';
import { bannerEmbed } from '../embeds/banner.embed';
import type { Command } from '../types';
import { respond } from './shared';

export const bannerCommand: Command = {
  data: new SlashCommandBuilder().setName('banner').setDescription('Mostra o banner de invocação atual e suas taxas'),

  async execute(interaction) {
    const pool = await SummonService.getActivePoolOrThrow();
    const upcoming = await PoolService.getUpcoming();
    await respond(interaction, { embeds: [bannerEmbed(pool, SummonService.rates(pool), upcoming)] });
  },
};
