import { env } from '../../config/env';
import { ApiError } from '../../utils/ApiError';
import { ImageToVideoInput, ImageToVideoProvider } from '../types';

/**
 * Magic Hour image to video. Two calls: create a render, then poll it until it finishes and
 * download the result. https://docs.magichour.ai/api-reference/video-projects/image-to-video
 *
 * Cost matters here. Every create call spends credits, so the create request is never
 * retried automatically (a retry after a timeout could silently start a second, paid
 * render). Polling is retried, it spends nothing.
 */
const MAX_POLL_FAILURES = 5;

interface CreateResponse {
  id?: string;
  credits_charged?: number;
}
interface StatusResponse {
  status?: string;
  downloads?: { url: string }[];
  error?: { code?: string; message?: string } | null;
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export class MagicHourProvider implements ImageToVideoProvider {
  readonly name = 'magic-hour';
  readonly model = env.magicHour.model;

  private headers() {
    return { Authorization: `Bearer ${env.magicHour.apiKey}`, 'Content-Type': 'application/json' };
  }

  async generateClip(input: ImageToVideoInput): Promise<{ buffer: Buffer; contentType: 'video/mp4' }> {
    if (!env.magicHour.apiKey) throw ApiError.internal('MAGIC_HOUR_API_KEY is not configured on the server');
    const base = env.magicHour.baseUrl;

    const createRes = await fetch(`${base}/image-to-video`, {
      method: 'POST',
      headers: this.headers(),
      body: JSON.stringify({
        name: 'Reelbolt scene',
        end_seconds: input.seconds,
        model: this.model,
        resolution: env.magicHour.resolution,
        audio: false,
        style: { prompt: input.prompt },
        // Magic Hour accepts a public URL here, no separate upload step needed.
        assets: { image_file_path: input.imageUrl },
      }),
    });
    if (!createRes.ok) {
      const body = await createRes.text();
      if (createRes.status === 402) throw ApiError.upstream('Magic Hour account is out of credits', body.slice(0, 300));
      throw ApiError.upstream(`Magic Hour create failed (${createRes.status})`, body.slice(0, 300));
    }
    const created = (await createRes.json()) as CreateResponse;
    if (!created.id) throw ApiError.upstream('Magic Hour did not return a render id');

    const deadline = Date.now() + env.magicHour.timeoutMs;
    let failures = 0;
    let wait = env.magicHour.pollMs;

    while (Date.now() < deadline) {
      await sleep(wait);
      wait = Math.min(wait * 1.3, 15_000);

      let status: StatusResponse;
      try {
        const res = await fetch(`${base}/video-projects/${created.id}`, { headers: this.headers() });
        if (!res.ok) throw new Error(`status ${res.status}`);
        status = (await res.json()) as StatusResponse;
        failures = 0;
      } catch (err) {
        if (++failures >= MAX_POLL_FAILURES) {
          throw ApiError.upstream('Lost contact with Magic Hour while waiting for a clip', String(err));
        }
        continue;
      }

      if (status.status === 'complete') {
        const url = status.downloads?.[0]?.url;
        if (!url) throw ApiError.upstream('Magic Hour finished but returned no download');
        const file = await fetch(url);
        if (!file.ok) throw ApiError.upstream(`Could not download the Magic Hour clip (${file.status})`);
        return { buffer: Buffer.from(await file.arrayBuffer()), contentType: 'video/mp4' };
      }
      if (status.status === 'error' || status.status === 'canceled') {
        throw ApiError.upstream(`Magic Hour render ${status.status}`, status.error?.message);
      }
      // queued or rendering: keep waiting
    }

    throw ApiError.upstream('Magic Hour took too long to render a clip');
  }
}
