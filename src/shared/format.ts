export function stars(rarity: number): string {
  return '★'.repeat(rarity) + '☆'.repeat(Math.max(0, 5 - rarity));
}

export function progressBar(current: number, max: number, size = 10): string {
  const ratio = max <= 0 ? 0 : Math.min(1, Math.max(0, current / max));
  const filled = Math.round(ratio * size);
  return '█'.repeat(filled) + '░'.repeat(size - filled);
}

export function percent(p: number, digits = 1): string {
  return `${(p * 100).toFixed(digits)}%`;
}

/** Timestamp do Discord: <t:unix:R> etc. */
export function discordTime(date: Date, style: 'R' | 'F' | 'f' | 'D' | 'd' | 't' = 'R'): string {
  return `<t:${Math.floor(date.getTime() / 1000)}:${style}>`;
}

export const rarityColor: Record<number, number> = {
  1: 0xa97142,
  2: 0xa97142,
  3: 0xc0c0c0,
  4: 0xe6b422,
  5: 0xffd700,
};

export function truncate(text: string, max: number): string {
  return text.length <= max ? text : `${text.slice(0, max - 1)}…`;
}

export function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m ? `${h} h ${m} min` : `${h} h`;
}

export function signedPercent(p: number): string {
  const v = Math.round(p * 100);
  return `${v >= 0 ? '+' : ''}${v}%`;
}
