/**
 * Runs `fn` over `items` with at most `concurrency` in flight at once. Generating scenes
 * strictly one-by-one (await in a for-loop) is the single biggest avoidable source of
 * request duration in the image/voice pipelines. For an 8-scene video, sequential FLUX
 * calls at ~2-3s each is 20+ seconds before Chatterbox even starts. Batches of 3 keep us
 * comfortably under typical provider rate limits while cutting that time roughly 3x, which
 * matters a lot on a host with a hard function-duration ceiling (Vercel).
 */
export async function mapWithConcurrency<T, R>(
  items: T[],
  concurrency: number,
  fn: (item: T, index: number) => Promise<R>
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let cursor = 0;

  async function worker() {
    while (cursor < items.length) {
      const index = cursor++;
      results[index] = await fn(items[index], index);
    }
  }

  const workers = Array.from({ length: Math.min(concurrency, items.length) }, () => worker());
  await Promise.all(workers);
  return results;
}
