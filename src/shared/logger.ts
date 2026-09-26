type Level = 'debug' | 'info' | 'warn' | 'error';
const order: Record<Level, number> = { debug: 10, info: 20, warn: 30, error: 40 };

function current(): Level {
  const l = process.env.LOG_LEVEL as Level | undefined;
  return l && l in order ? l : 'info';
}

function write(level: Level, msg: string, meta?: unknown) {
  if (order[level] < order[current()]) return;
  const line = `[${new Date().toISOString()}] ${level.toUpperCase().padEnd(5)} ${msg}`;
  const out = level === 'error' || level === 'warn' ? console.error : console.log;
  meta === undefined ? out(line) : out(line, meta);
}

export const logger = {
  debug: (m: string, meta?: unknown) => write('debug', m, meta),
  info: (m: string, meta?: unknown) => write('info', m, meta),
  warn: (m: string, meta?: unknown) => write('warn', m, meta),
  error: (m: string, meta?: unknown) => write('error', m, meta),
};
