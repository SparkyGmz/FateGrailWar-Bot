import type { Tx } from './prisma';

/**
 * Trava a linha do jogador até o fim da transação (SELECT … FOR UPDATE).
 * Serializa operações do mesmo jogador (compras, missões, uso de itens):
 * a segunda transação espera a primeira terminar e já enxerga o resultado dela.
 */
export async function lockUser(tx: Tx, userId: string): Promise<void> {
  await tx.$queryRaw`SELECT id FROM "users" WHERE id = ${userId} FOR UPDATE`;
}

export async function lockWar(tx: Tx, warId: number): Promise<void> {
  await tx.$queryRaw`SELECT id FROM "grail_wars" WHERE id = ${warId} FOR UPDATE`;
}

/** Trava o participante de um jogador numa Guerra e retorna o id (ou null) */
export async function lockParticipant(tx: Tx, warId: number, userId: string): Promise<number | null> {
  const rows = await tx.$queryRaw<{ id: number }[]>`
    SELECT id FROM "war_participants" WHERE war_id = ${warId} AND user_id = ${userId} FOR UPDATE`;
  return rows[0]?.id ?? null;
}
