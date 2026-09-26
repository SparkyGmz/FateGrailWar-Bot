import { randomBytes } from 'node:crypto';

/** Float uniforme em [0, 1) com RNG criptográfico */
export function randomFloat(): number {
  return randomBytes(6).readUIntBE(0, 6) / 2 ** 48;
}

export function chance(p: number, rng: () => number = randomFloat): boolean {
  return rng() < p;
}

/** Escolhe um item proporcional ao peso. Pesos <= 0 nunca são escolhidos. */
export function weightedPick<T>(entries: readonly { item: T; weight: number }[], rng: () => number = randomFloat): T {
  const valid = entries.filter((e) => e.weight > 0 && Number.isFinite(e.weight));
  if (valid.length === 0) throw new Error('weightedPick: nenhum item com peso positivo');
  const total = valid.reduce((s, e) => s + e.weight, 0);
  let roll = rng() * total;
  for (const e of valid) {
    roll -= e.weight;
    if (roll < 0) return e.item;
  }
  return valid[valid.length - 1]!.item;
}
