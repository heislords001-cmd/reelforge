import { app } from './app';
import { env } from './config/env';
import { logger } from './utils/logger';

// Local/traditional-host entrypoint only. Not used on Vercel. See api/index.ts, which
// imports `app` directly and never calls listen().
app.listen(env.port, () => {
  logger.info(`Reelforge API listening on port ${env.port}`, { env: env.nodeEnv });
});
