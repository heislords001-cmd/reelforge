import { MsEdgeTTS, OUTPUT_FORMAT } from 'msedge-tts';
import { Readable } from 'stream';
import { VoiceCategory } from '../../types';
import { ApiError } from '../../utils/ApiError';
import { withRetry } from '../../utils/retry';
import { VoiceProvider, VoiceSynthesisInput, VoiceSynthesisResult } from '../types';

/**
 * Free narration through the speech service built into Microsoft Edge, via the msedge-tts
 * package. IMPORTANT: this is not an official, licensed API. It works by speaking the same
 * protocol the Edge browser uses. Microsoft can change or block it without notice, and its
 * terms do not clearly cover use inside a paid product. Fine for a free tier you can lose,
 * risky as something paying customers depend on. Keep it behind this interface so it can
 * be swapped for Azure Speech (the official, paid version of the same voices) later.
 */
const VOICES: Record<VoiceCategory, string> = {
  documentary_male: 'en-US-GuyNeural',
  documentary_female: 'en-US-AriaNeural',
  storytelling_male: 'en-GB-RyanNeural',
  storytelling_female: 'en-GB-SoniaNeural',
  news_anchor: 'en-US-DavisNeural',
  calm: 'en-US-JennyNeural',
  emotional: 'en-US-AriaNeural',
};

const SYNTHESIS_TIMEOUT_MS = 60_000;

function collect(stream: Readable): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    const timer = setTimeout(() => {
      stream.destroy();
      reject(ApiError.upstream('Edge TTS timed out'));
    }, SYNTHESIS_TIMEOUT_MS);
    stream.on('data', (chunk: Buffer) => chunks.push(Buffer.from(chunk)));
    stream.on('error', (err) => {
      clearTimeout(timer);
      reject(err);
    });
    stream.on('end', () => {
      clearTimeout(timer);
      resolve(Buffer.concat(chunks));
    });
  });
}

const signed = (n: number) => `${n >= 0 ? '+' : ''}${n}`;

export class EdgeTtsProvider implements VoiceProvider {
  readonly name = 'edge-tts';

  async synthesize(input: VoiceSynthesisInput): Promise<VoiceSynthesisResult> {
    const voice = VOICES[input.voiceCategory];
    if (!voice) throw ApiError.badRequest(`Unknown voice category: ${input.voiceCategory}`);
    if (!input.text.trim()) throw ApiError.badRequest('Nothing to narrate for this scene');

    const buffer = await withRetry(
      async () => {
        // A fresh client per attempt, a failed websocket cannot be reused.
        const tts = new MsEdgeTTS();
        await tts.setMetadata(voice, OUTPUT_FORMAT.AUDIO_24KHZ_96KBITRATE_MONO_MP3);
        const { audioStream } = tts.toStream(input.text, {
          // Our controls: speed 1.0 is normal, pitch in semitones, volume 0 to 100.
          rate: `${signed(Math.round((input.controls.speed - 1) * 100))}%`,
          pitch: `${signed(Math.round(input.controls.pitch))}st`,
          volume: Math.max(0, Math.min(100, Math.round(input.controls.volume))),
        });
        const audio = await collect(audioStream);
        if (audio.length < 1000) throw ApiError.upstream('Edge TTS returned no audio');
        return audio;
      },
      { retries: 3, baseDelayMs: 800, onRetry: (attempt, err) => console.warn(`Edge TTS retry ${attempt}`, err) }
    );

    return { buffer, contentType: 'audio/mpeg' };
  }
}
