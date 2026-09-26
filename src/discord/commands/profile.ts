import { SlashCommandBuilder } from 'discord.js';
import { ServantService } from '../../modules/servants/servant.service';
import { SummonService } from '../../modules/summon/summon.service';
import { UserService } from '../../modules/users/user.service';
import { errorEmbed } from '../embeds/common';
import { profileEmbed } from '../embeds/profile.embed';
import type { Command } from '../types';
import { EPHEMERAL, respond } from './shared';

export const profileCommand: Command = {
  data: new SlashCommandBuilder()
    .setName('profile')
    .setDescription('Mostra o perfil de um Master')
    .addUserOption((o) => o.setName('master').setDescription('Outro jogador (opcional)')),

  async execute(interaction) {
    const target = interaction.options.getUser('master') ?? interaction.user;
    const profile = await UserService.getProfile(target.id);
    if (!profile) {
      await respond(interaction, { embeds: [errorEmbed(`${target.username} ainda não é um Master.`)] }, { ephemeral: true });
      return;
    }
    const member = interaction.guild ? await interaction.guild.members.fetch(target.id).catch(() => null) : null;
    const displayName = member?.displayName ?? target.globalName ?? target.username;
    const total = await ServantService.totalEnabled();
    const status = SummonService.status(profile.user.lastFreeSummonAt);
    await respond(interaction, { embeds: [profileEmbed(profile, displayName, target.displayAvatarURL(), total, status)] });
  },
};
