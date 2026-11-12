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
 * terms do not clearly cover use inside a paid product. This is the default voice provider
 * for now. Keep it behind this interface so it can be swapped for Azure Speech (the official,
 * paid version of the same voices) later.
 */
const STYLE_VOICES: Record<VoiceCategory, string> = {
  documentary_male: 'en-US-GuyNeural',
  documentary_female: 'en-US-AriaNeural',
  storytelling_male: 'en-GB-RyanNeural',
  storytelling_female: 'en-GB-SoniaNeural',
  news_anchor: 'en-US-DavisNeural',
  calm: 'en-US-JennyNeural',
  emotional: 'en-US-AriaNeural',
};

const SYNTHESIS_TIMEOUT_MS = 60_000;
const VOICE_LIST_TTL_MS = 60 * 60 * 1000;

export interface EdgeVoice {
  ShortName: string;
  Gender: string;
  Locale: string;
}

let voiceCache: { at: number; voices: EdgeVoice[] } | null = null;

/** Every voice Microsoft's service offers, cached for an hour so we do not hit it per request. */
export async function listEdgeVoices(): Promise<EdgeVoice[]> {
  if (voiceCache && Date.now() - voiceCache.at < VOICE_LIST_TTL_MS) return voiceCache.voices;
  const tts = new MsEdgeTTS();
  const raw = await tts.getVoices();
  const voices = raw
    .map((v) => ({ ShortName: v.ShortName, Gender: v.Gender, Locale: v.Locale }))
    .sort((a, b) => a.Locale.localeCompare(b.Locale) || a.ShortName.localeCompare(b.ShortName));
  voiceCache = { at: Date.now(), voices };
  return voices;
}

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
  readonly model = 'msedge-tts-neural';

  async synthesize(input: VoiceSynthesisInput): Promise<VoiceSynthesisResult> {
    // A specific voice name wins over the style. Both are checked by the service layer.
    const voice = input.voiceName ?? STYLE_VOICES[input.voiceCategory];
    if (!voice) throw ApiError.badRequest(`Unknown voice: ${input.voiceName ?? input.voiceCategory}`);
    if (!input.text.trim()) throw ApiError.badRequest('Nothing to narrate for this scene');

    const buffer = await withRetry(
      async () => {
        // A fresh client per attempt, a failed websocket cannot be reused.
        const tts = new MsEdgeTTS();
        await tts.setMetadata(voice, OUTPUT_FORMAT.AUDIO_24KHZ_96KBITRATE_MONO_MP3);
        const { audioStream } = tts.toStream(input.text, {
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
