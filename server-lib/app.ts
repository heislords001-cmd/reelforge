import cookieParser from 'cookie-parser';
import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import { env } from './config/env';
import { apiRouter } from './routes';
import { errorHandler, notFoundHandler } from './middleware/errorHandler';

/**
 * Builds the Express app but never calls listen() on it.
 *   - Local/traditional hosting (Railway, Render, a VPS): `src/index.ts` imports this and
 *     calls `app.listen()`.
 *   - Vercel: `api/index.ts` imports this and exports it directly. Vercel's Node runtime
 *     invokes it per-request like any other (req, res) handler, no listen() involved.
 * This is the standard pattern for running an existing Express app as a Vercel serverless
 * function without rewriting routes/middleware.
 */
export function createApp() {
  const app = express();

  app.use(helmet());
  app.use(cors({ origin: env.clientOrigin, credentials: true }));
  app.use(cookieParser());
  app.use(
    express.json({
      limit: '2mb',
      // Paystack signs webhook payloads over the raw bytes. Re-serializing req.body would
      // produce a different signature and silently reject legitimate events. Stashing the
      // raw buffer here (once, globally) is simpler than a second body-parser mounted only
      // on the webhook route, and has no cost for every other route that ignores it.
      verify: (req, _res, buf) => {
        // body-parser's verify() types req as plain http.IncomingMessage, not Express's
        // Request. The Express.Request.rawBody augmentation in middleware/auth.ts doesn't
        // reach this callback's parameter type, so a cast is genuinely needed here (unlike
        // in billing.routes.ts, where req IS already typed as Express.Request).
        (req as { rawBody?: Buffer }).rawBody = buf;
      },
    })
  );
  app.use(morgan(env.isProduction ? 'combined' : 'dev'));

  // Generation endpoints call slow, costly upstream AI APIs. A tighter limiter protects
  // both our provider bill and the providers' own rate limits. Note: on Vercel each
  // serverless instance has its own memory, so this in-memory limiter is best-effort per
  // instance, not a global limit. Fine for launch, swap for a Redis-backed limiter
  // (e.g. Upstash) if you need a hard global cap.
  const generationLimiter = rateLimit({
    windowMs: 60_000,
    limit: 20,
    standardHeaders: true,
    legacyHeaders: false,
  });
  app.use('/api/generate', generationLimiter);

  const generalLimiter = rateLimit({ windowMs: 60_000, limit: 300 });
  app.use('/api', generalLimiter);

  app.use('/api', apiRouter);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}

export const app = createApp();
