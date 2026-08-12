import { env } from '../../config/env';
import { VoiceCategory } from '../../types';
import { ApiError } from '../../utils/ApiError';
import { withRetry } from '../../utils/retry';
import { VoiceProvider, VoiceSynthesisInput, VoiceSynthesisResult } from '../types';

// NVIDIA NIM inference endpoint for Chatterbox TTS.
const NVIDIA_CHATTERBOX_ENDPOINT = 'https://ai.api.nvidia.com/v1/genai/nvidia/chatterbox-tts';

/**
 * The dashboard only ever shows creator-friendly voice categories (documentary_male, calm,
 * etc). This map is the single place that translates those into the underlying Chatterbox
 * voice IDs. If the vendor renames or adds voices, only this map changes.
 */
const VOICE_CATEGORY_MAP: Record<VoiceCategory, string> = {
  documentary_male: 'chatterbox-en-male-documentary',
  documentary_female: 'chatterbox-en-female-documentary',
  storytelling_male: 'chatterbox-en-male-narrative',
  storytelling_female: 'chatterbox-en-female-narrative',
  news_anchor: 'chatterbox-en-male-broadcast',
  calm: 'chatterbox-en-neutral-calm',
  emotional: 'chatterbox-en-female-expressive',
};

export class NvidiaChatterboxProvider implements VoiceProvider {
  readonly name = 'nvidia-chatterbox';

  async synthesize(input: VoiceSynthesisInput): Promise<VoiceSynthesisResult> {
    if (!env.nvidia.apiKey) {
      throw ApiError.internal('NVIDIA_API_KEY is not configured on the server');
    }

    const voiceId = VOICE_CATEGORY_MAP[input.voiceCategory];
    if (!voiceId) {
      throw ApiError.badRequest(`Unknown voice category: ${input.voiceCategory}`);
    }

    const result = await withRetry(
      async () => {
        const response = await fetch(NVIDIA_CHATTERBOX_ENDPOINT, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${env.nvidia.apiKey}`,
            Accept: 'application/json',
          },
          body: JSON.stringify({
            text: input.text,
            voice: voiceId,
            speed: input.controls.speed,
            pitch: input.controls.pitch,
            stability: input.controls.stability,
            output_format: 'mp3',
          }),
        });

        if (!response.ok) {
          const body = await response.text();
          throw ApiError.upstream(`NVIDIA Chatterbox request failed (${response.status})`, body);
        }
        const data = (await response.json()) as { audio: string; duration_seconds?: number };
        if (!data.audio) {
          throw ApiError.upstream('NVIDIA Chatterbox response did not include audio data');
        }
        return data;
      },
      { retries: 3, onRetry: (attempt, err) => console.warn(`Chatterbox retry ${attempt}`, err) }
    );

    return {
      buffer: Buffer.from(result.audio, 'base64'),
      contentType: 'audio/mpeg',
      durationSeconds: result.duration_seconds,
    };
  }
}
