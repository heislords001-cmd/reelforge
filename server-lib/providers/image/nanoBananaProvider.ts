import { env } from '../../config/env';
import { ApiError } from '../../utils/ApiError';
import { withRetry } from '../../utils/retry';
import { ImageGenerationInput, ImageGenerationResult, ImageProvider } from '../types';

// Google's Gemini Developer API (the one an API key from Google AI Studio talks to), not
// Vertex AI. See the model card for gemini-3.1-flash-image-preview, aka Nano Banana 2.
const GEMINI_ENDPOINT_BASE = 'https://generativelanguage.googleapis.com/v1beta/models';

const STYLE_PRESETS: Record<string, string> = {
  cinematic: 'cinematic lighting, shallow depth of field, film grain, dramatic composition',
  documentary: 'photorealistic, natural lighting, editorial photography style',
  animated: 'high quality 3D animated illustration, vibrant colors',
  historical: 'painterly historical illustration, muted period accurate palette',
};

export class NanoBananaProvider implements ImageProvider {
  readonly name = 'nano-banana';
  readonly model = env.google.geminiImageModel;

  async generateImage(input: ImageGenerationInput): Promise<ImageGenerationResult> {
    if (!env.google.geminiApiKey) {
      throw ApiError.internal('GOOGLE_GEMINI_API_KEY is not configured on the server');
    }

    const styleSuffix = input.style ? STYLE_PRESETS[input.style] ?? input.style : STYLE_PRESETS.documentary;
    const aspectHint = input.aspectRatio === '9:16' ? 'vertical 9:16 portrait frame' : 'widescreen 16:9 frame';
    // Aspect ratio is conveyed through the prompt itself rather than a dedicated config
    // field. Nano Banana 2 does support native aspect ratios through its own image config,
    // but the exact field name varies across SDK versions, and a text hint works reliably
    // regardless, so that's what this uses.
    const fullPrompt = `${input.prompt}, ${styleSuffix}, ${aspectHint}`;

    const url = `${GEMINI_ENDPOINT_BASE}/${env.google.geminiImageModel}:generateContent`;

    const data = await withRetry(
      async () => {
        const response = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-goog-api-key': env.google.geminiApiKey,
          },
          body: JSON.stringify({
            contents: [{ parts: [{ text: fullPrompt }] }],
            generationConfig: { responseModalities: ['IMAGE'] },
          }),
        });

        if (!response.ok) {
          const body = await response.text();
          throw ApiError.upstream(`Nano Banana request failed (${response.status})`, body);
        }
        return (await response.json()) as {
          candidates?: { content?: { parts?: { inlineData?: { mimeType: string; data: string } }[] } }[];
        };
      },
      { retries: 3, onRetry: (attempt, err) => console.warn(`Nano Banana retry ${attempt}`, err) }
    );

    const parts = data.candidates?.[0]?.content?.parts ?? [];
    const imagePart = parts.find((p) => p.inlineData?.data);
    if (!imagePart?.inlineData) {
      throw ApiError.upstream('Nano Banana response did not include image data');
    }

    return {
      buffer: Buffer.from(imagePart.inlineData.data, 'base64'),
      contentType: imagePart.inlineData.mimeType || 'image/png',
    };
  }
}
