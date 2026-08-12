import { env } from '../../config/env';
import { GeneratedScript } from '../../types';
import { ApiError } from '../../utils/ApiError';
import { withRetry } from '../../utils/retry';
import { ScriptGenerationInput, ScriptProvider } from '../types';

// NVIDIA's catalog is OpenAI-compatible. Same request/response shape as Groq/OpenAI,
// just a different base URL and model string.
const NVIDIA_CHAT_ENDPOINT = 'https://integrate.api.nvidia.com/v1/chat/completions';

const SYSTEM_PROMPT = `You are an award-winning YouTube scriptwriter. Given a video idea, you write a
complete, structured script optimized for retention. You ALWAYS respond with valid JSON matching
this exact shape, and nothing else. No markdown fences, no commentary:

{
  "hook": "string: first 10-15 seconds, a bold claim, question, or scene that stops the scroll",
  "introduction": "string: sets up what the video will cover and why it matters",
  "chapters": [
    { "title": "string", "narration": "string: the full narration for this chapter", "imagePrompt": "string: a vivid, concrete visual description for an AI image generator, no text-on-image" }
  ],
  "conclusion": "string: wraps up the narrative",
  "callToAction": "string: subscribe / next video / comment prompt, in the creator's voice"
}

Write 4-8 chapters depending on target length. Narration should sound spoken aloud, not written.
Every imagePrompt must be a self-contained visual description (subject, setting, lighting, mood),
never reference "the video" or "as mentioned". Never use em dashes or en dashes anywhere in the
script text. Use periods, commas, or separate sentences instead.`;

export class NvidiaReasoningScriptProvider implements ScriptProvider {
  readonly name: string;
  readonly model: string;

  constructor(name: string, model: string) {
    this.name = name;
    this.model = model;
  }

  async generateScript(input: ScriptGenerationInput): Promise<GeneratedScript> {
    if (!env.nvidia.apiKey) {
      throw ApiError.internal('NVIDIA_API_KEY is not configured on the server');
    }

    const userPrompt = [
      `Video idea: "${input.prompt}"`,
      input.targetLengthMinutes ? `Target length: ~${input.targetLengthMinutes} minutes` : null,
      input.tone ? `Tone: ${input.tone}` : null,
    ]
      .filter(Boolean)
      .join('\n');

    const raw = await withRetry(
      async () => {
        const response = await fetch(NVIDIA_CHAT_ENDPOINT, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${env.nvidia.apiKey}`,
          },
          body: JSON.stringify({
            model: this.model,
            temperature: 0.8,
            top_p: 0.95,
            max_tokens: 8192,
            messages: [
              { role: 'system', content: SYSTEM_PROMPT },
              { role: 'user', content: userPrompt },
            ],
            // Nemotron's reasoning ("thinking") mode. The chain-of-thought comes back on a
            // separate `reasoning_content` field, not mixed into the JSON we actually parse.
            extra_body: {
              chat_template_kwargs: { enable_thinking: true },
              reasoning_budget: 4096,
            },
          }),
        });

        if (!response.ok) {
          const body = await response.text();
          throw ApiError.upstream(`NVIDIA request failed (${response.status})`, body);
        }
        const data = (await response.json()) as {
          choices: { message: { content: string } }[];
        };
        return data.choices[0]?.message?.content ?? '';
      },
      { retries: 3, onRetry: (attempt, err) => console.warn(`NVIDIA script retry ${attempt}`, err) }
    );

    // Defensive: some open models still wrap output in <think>...</think> even with a
    // separate reasoning_content field available. Strip it before parsing, just in case.
    const cleaned = raw.replace(/<think>[\s\S]*?<\/think>/g, '').trim();

    let parsed: {
      hook: string;
      introduction: string;
      chapters: { title: string; narration: string; imagePrompt: string }[];
      conclusion: string;
      callToAction: string;
    };
    try {
      parsed = JSON.parse(cleaned);
    } catch {
      throw ApiError.upstream('NVIDIA model returned malformed JSON for the script', cleaned.slice(0, 500));
    }

    return {
      hook: parsed.hook ?? '',
      introduction: parsed.introduction ?? '',
      chapters: parsed.chapters ?? [],
      conclusion: parsed.conclusion ?? '',
      callToAction: parsed.callToAction ?? '',
      rawMarkdown: renderMarkdown(parsed),
    };
  }
}

function renderMarkdown(script: {
  hook: string;
  introduction: string;
  chapters: { title: string; narration: string }[];
  conclusion: string;
  callToAction: string;
}): string {
  const chapterBlocks = script.chapters
    .map((c, i) => `## ${i + 1}. ${c.title}\n\n${c.narration}`)
    .join('\n\n');
  return `## Hook\n\n${script.hook}\n\n## Introduction\n\n${script.introduction}\n\n${chapterBlocks}\n\n## Conclusion\n\n${script.conclusion}\n\n## Call to Action\n\n${script.callToAction}`;
}
