/**
 * Generic retry-with-backoff wrapper. Every AI provider call goes through this so that
 * transient upstream failures (rate limits, timeouts) don't bubble up as user-facing errors.
 */
export interface RetryOptions {
  retries?: number;
  baseDelayMs?: number;
  onRetry?: (attempt: number, error: unknown) => void;
}

export async function withRetry<T>(fn: () => Promise<T>, opts: RetryOptions = {}): Promise<T> {
  const { retries = 3, baseDelayMs = 500, onRetry } = opts;
  let lastError: unknown;

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;
      if (attempt === retries) break;
      onRetry?.(attempt, err);
      const delay = baseDelayMs * 2 ** (attempt - 1) + Math.random() * 100;
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }
  throw lastError;
}
