import { PrismaClient, Prisma } from '@prisma/client';

export const prisma = new PrismaClient({
  log: process.env.LOG_LEVEL === 'debug' ? ['query', 'warn', 'error'] : ['warn', 'error'],
});

/** Cliente dentro de uma transação interativa */
export type Tx = Prisma.TransactionClient;
/** Aceita tanto o client global quanto uma transação */
export type Db = PrismaClient | Tx;
