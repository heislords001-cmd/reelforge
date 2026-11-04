import { z } from 'zod';
import { env } from '../../config/env';
import { VideoBlueprint } from '../../types';
import { ApiError } from '../../utils/ApiError';
import { withRetry } from '../../utils/retry';
import { VideoAnalysisProvider } from '../types';

// Gemini accepts a public YouTube URL directly as video input, so nothing is downloaded or
// stored by this app. The video is only ever read by Google's API.
const GEMINI_BASE = 'https://generativelanguage.googleapis.com/v1beta/models';

const ANALYSIS_PROMPT = `Watch this video and describe its STORYLINE PATTERN so that a different, original video could be written in the same shape.

Describe patterns abstractly. Do not quote the video, and do not include its specific names, facts, places, or examples. If you mention a technique, describe the technique, not the content it was applied to.

Respond with valid JSON only, in exactly this shape:
{
  "niche": "the content category, e.g. historical mysteries, personal finance, true crime",
  "audience": "who this is made for",
  "estimatedLengthMinutes": 10,
  "tone": "the overall voice and mood",
  "hookStyle": "how the opening grabs attention, described abstractly",
  "narrativeArc": "how the story escalates and resolves, described abstractly",
  "structure": [ { "beat": "short name", "purpose": "what this part does for the viewer", "approxShare": 0.15 } ],
  "retentionTechniques": ["techniques used to keep people watching"],
  "emotionalBeats": ["the emotional shifts across the video, in order"],
  "titlePattern": "the formula the title follows, abstractly"
}
The approxShare values should add up to roughly 1.`;

type ScanResult =
  | { clientError: string }
  | { data: { candidates?: { content?: { parts?: { text?: string }[] } }[] } };

const blueprintSchema = z.object({
  niche: z.string().default('general'),
  audience: z.string().default('general audience'),
  estimatedLengthMinutes: z.coerce.number().default(8).transform((n) => Math.min(120, Math.max(1, n))),
  tone: z.string().default('engaging'),
  hookStyle: z.string().default(''),
  narrativeArc: z.string().default(''),
  structure: z
    .array(z.object({ beat: z.string(), purpose: z.string(), approxShare: z.coerce.number().default(0) }))
    .default([]),
  retentionTechniques: z.array(z.string()).default([]),
  emotionalBeats: z.array(z.string()).default([]),
  titlePattern: z.string().default(''),
});

export class GeminiVideoAnalysisProvider implements VideoAnalysisProvider {
  readonly name = 'gemini-video';
  readonly model = env.google.geminiAnalysisModel;

  async analyzeVideo(url: string): Promise<VideoBlueprint> {
    if (!env.google.geminiApiKey) {
      throw ApiError.internal('GOOGLE_GEMINI_API_KEY is not configured on the server');
    }

    const endpoint = `${GEMINI_BASE}/${this.model}:generateContent`;

    const result = await withRetry<ScanResult>(
      async () => {
        const response = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'x-goog-api-key': env.google.geminiApiKey },
          body: JSON.stringify({
            contents: [{ parts: [{ file_data: { file_uri: url } }, { text: ANALYSIS_PROMPT }] }],
            generationConfig: { responseMimeType: 'application/json', temperature: 0.3 },
          }),
        });

        // A 4xx means the video itself is the problem (private, removed, too long, bad URL).
        // Retrying cannot fix that, so hand it back instead of throwing into the retry loop.
        if (response.status >= 400 && response.status < 500) {
          return { clientError: await response.text() };
        }
        if (!response.ok) {
          throw ApiError.upstream(`Video scan failed (${response.status})`, await response.text());
        }
        return { data: (await response.json()) as { candidates?: { content?: { parts?: { text?: string }[] } }[] } };
      },
      { retries: 2, onRetry: (attempt, err) => console.warn(`Video scan retry ${attempt}`, err) }
    );

    if ('clientError' in result) {
      throw ApiError.badRequest(
        'Could not read that video. Make sure it is a public YouTube video and try again.',
        result.clientError.slice(0, 500)
      );
    }

    const text = (result.data.candidates?.[0]?.content?.parts ?? [])
      .map((p) => p.text ?? '')
      .join('')
      .replace(/^```(?:json)?/i, '')
      .replace(/```$/, '')
      .trim();

    let raw: unknown;
    try {
      raw = JSON.parse(text);
    } catch {
      throw ApiError.upstream('The video scan returned something unreadable. Try again.', text.slice(0, 300));
    }

    const parsed = blueprintSchema.safeParse(raw);
    if (!parsed.success) {
      throw ApiError.upstream('The video scan returned an incomplete result. Try again.');
    }
    return parsed.data;
  }
}
