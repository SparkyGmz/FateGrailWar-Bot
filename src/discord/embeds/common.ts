import { EmbedBuilder } from 'discord.js';

export const COLORS = {
  primary: 0x7c3aed,
  error: 0xdc2626,
  success: 0x16a34a,
  info: 0x2563eb,
  ritual: 0x4c1d95,
} as const;

export function errorEmbed(message: string): EmbedBuilder {
  return new EmbedBuilder().setColor(COLORS.error).setDescription(`❌ ${message}`);
}

export function successEmbed(message: string): EmbedBuilder {
  return new EmbedBuilder().setColor(COLORS.success).setDescription(`✅ ${message}`);
}

export function classLabel(c: { emoji: string; name: string }): string {
  return `${c.emoji} ${c.name}`;
}
