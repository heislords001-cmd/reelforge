import { app } from './app';
import { env } from './config/env';
import { runMigrations } from './db/migrate';
import { logger } from './utils/logger';

// Local and container entrypoint. Not used on Vercel (see api/index.ts, which imports `app`).
// The schema is applied before the server accepts traffic. If that fails, the process exits
// with the database error in the logs, instead of starting and returning generic 500s.
(async () => {
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
