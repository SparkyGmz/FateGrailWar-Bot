import 'dotenv/config';
import { z } from 'zod';

const schema = z.object({
  DISCORD_TOKEN: z.string().min(1, 'DISCORD_TOKEN é obrigatório'),
  DISCORD_CLIENT_ID: z.string().min(1, 'DISCORD_CLIENT_ID é obrigatório'),
  DEV_GUILD_ID: z.string().optional().transform((v) => v || undefined),
  BANNER_ANNOUNCE_CHANNEL_ID: z.string().optional().transform((v) => v || undefined),
  DATABASE_URL: z.string().min(1, 'DATABASE_URL é obrigatório'),
  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
});

export type Env = z.infer<typeof schema>;

let cached: Env | undefined;

export function env(): Env {
  if (!cached) {
    const parsed = schema.safeParse(process.env);
    if (!parsed.success) {
      const issues = parsed.error.issues.map((i) => `  - ${i.path.join('.')}: ${i.message}`).join('\n');
      throw new Error(`Variáveis de ambiente inválidas:\n${issues}`);
    }
    cached = parsed.data;
  }
  return cached;
}
