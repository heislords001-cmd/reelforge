import { NextFunction, Request, Response } from 'express';
import { ApiError } from '../utils/ApiError';
import { logger } from '../utils/logger';

export function errorHandler(err: unknown, req: Request, res: Response, _next: NextFunction) {
  if (err instanceof ApiError) {
    if (err.statusCode >= 500) {
      logger.error(err.message, { path: req.path, details: err.details });
    }
    return res.status(err.statusCode).json({
      error: { message: err.message, details: err.details ?? null },
    });
  }

  const message = err instanceof Error ? err.message : 'Unknown error';
  logger.error('Unhandled error', { path: req.path, message });
  return res.status(500).json({ error: { message: 'Internal server error' } });
}

export function notFoundHandler(req: Request, res: Response) {
  res.status(404).json({ error: { message: `No route for ${req.method} ${req.path}` } });
}
