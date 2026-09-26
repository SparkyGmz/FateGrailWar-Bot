/**
 * Conversão de ranks de parâmetro (E..A, EX, com +) em números.
 * Usado para derivar HP/MP e, na V0.4, pela fórmula de combate.
 */
const BASE: Record<string, number> = { E: 1, D: 2, C: 3, B: 4, A: 5, EX: 7 };

export function rankValue(rank: string): number {
  const r = rank.trim().toUpperCase();
  // "E~A++" → usa o maior
  if (r.includes('~')) return Math.max(...r.split('~').map(rankValue));
  const m = /^(EX|[A-E])(\+*)(-?)$/.exec(r);
  if (!m) return 0; // "?", "—" etc.
  return BASE[m[1]!]! + m[2]!.length * 0.5 - (m[3] ? 0.25 : 0);
}
