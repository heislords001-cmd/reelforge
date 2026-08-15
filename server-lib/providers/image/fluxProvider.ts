import { env } from '../../config/env';
import { ApiError } from '../../utils/ApiError';
import { withRetry } from '../../utils/retry';
import { ImageGenerationInput, ImageGenerationResult, ImageProvider } from '../types';

// NVIDIA NIM inference endpoint. FLUX.1 Schnell returns a base64-encoded image.
const NVIDIA_FLUX_ENDPOINT = 'https://ai.api.nvidia.com/v1/genai/black-forest-labs/flux.1-schnell';

const STYLE_PRESETS: Record<string, string> = {
  cinematic: 'cinematic lighting, shallow depth of field, film grain, dramatic composition',
  documentary: 'photorealistic, natural lighting, editorial photography style',
  animated: 'high quality 3D animated illustration, vibrant colors',
  historical: 'painterly historical illustration, muted period-accurate palette',
};

export class NvidiaFluxProvider implements ImageProvider {
  readonly name = 'nvidia-flux-schnell';
  readonly model = env.nvidia.fluxModel;

  async generateImage(input: ImageGenerationInput): Promise<ImageGenerationResult> {
    if (!env.nvidia.apiKey) {
      throw ApiError.internal('NVIDIA_API_KEY is not configured on the server');
    }

    const styleSuffix = input.style ? STYLE_PRESETS[input.style] ?? input.style : STYLE_PRESETS.documentary;
    const fullPrompt = `${input.prompt}, ${styleSuffix}`;

    const base64 = await withRetry(
      async () => {
        const response = await fetch(NVIDIA_FLUX_ENDPOINT, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${env.nvidia.apiKey}`,
            Accept: 'application/json',
          },
          body: JSON.stringify({
            prompt: fullPrompt,
            mode: 'base',
            aspect_ratio: input.aspectRatio ?? '16:9',
            steps: 4,
            seed: Math.floor(Math.random() * 1_000_000),
          }),
        });

        if (!response.ok) {
          const body = await response.text();
          throw ApiError.upstream(`NVIDIA FLUX request failed (${response.status})`, body);
        }
        const data = (await response.json()) as { image: string };
        if (!data.image) {
          throw ApiError.upstream('NVIDIA FLUX response did not include image data');
        }
        return data.image;
      },
      { retries: 3, onRetry: (attempt, err) => console.warn(`FLUX retry ${attempt}`, err) }
    );

    return {
      buffer: Buffer.from(base64, 'base64'),
      contentType: 'image/png',
    };
  }
}
