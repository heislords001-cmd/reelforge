type LogMeta = Record<string, unknown> | undefined;

function line(level: string, msg: string, meta?: LogMeta) {
  const entry = { level, msg, time: new Date().toISOString(), ...meta };
  return JSON.stringify(entry);
}

export const logger = {
  info: (msg: string, meta?: LogMeta) => console.log(line('info', msg, meta)),
  warn: (msg: string, meta?: LogMeta) => console.warn(line('warn', msg, meta)),
  error: (msg: string, meta?: LogMeta) => console.error(line('error', msg, meta)),
};
