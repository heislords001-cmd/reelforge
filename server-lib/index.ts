import { app } from './app';
import { env } from './config/env';
import { runMigrations } from './db/migrate';
import { logger } from './utils/logger';

// Local and container entrypoint. Not used on Vercel (see api/index.ts, which imports `app`).
// The schema is applied before the server accepts traffic. If that fails, the process exits
// with the database error in the logs, instead of starting and returning generic 500s.
(async () => {
  // Diagnostics for the database connection. Logs which DNS records the database host
  // returns from this machine, and which environment the server believes it is in.
  try {
    const dns = await import('dns/promises');
    const host = new URL(env.databaseUrl).hostname;
    const v4 = await dns.resolve4(host).catch((e: NodeJS.ErrnoException) => `error ${e.code}`);
    const v6 = await dns.resolve6(host).catch((e: NodeJS.ErrnoException) => `error ${e.code}`);
    logger.info('Database host DNS', { host, ipv4: v4, ipv6: v6, nodeEnv: env.nodeEnv });
  } catch (err) {
    logger.warn('Database DNS diagnostic failed', { error: String(err) });
  }

  if (env.autoMigrate) {
    try {
      await runMigrations();
      logger.info('Database schema is up to date');
    } catch (err) {
      logger.error('Database migration failed, server not started', {
        error: err instanceof Error ? err.message : String(err),
      });
      process.exit(1);
    }
  }

  app.listen(env.port, () => {
    logger.info(`Reelbolt API listening on port ${env.port}`, { env: env.nodeEnv });
  });
})();
