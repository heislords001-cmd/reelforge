import { ScriptGenerationInput } from '../types';

/**
 * Builds the user message for any script provider. Kept in one place so Groq, the NVIDIA
 * models, and whatever gets added next all treat a scanned video blueprint the same way.
 */
export function buildScriptUserPrompt(input: ScriptGenerationInput): string {
  const lines: (string | null)[] = [];

  if (input.blueprint) {
    lines.push(
      'Write a completely ORIGINAL video script about a DIFFERENT story than the one that was scanned.',
      'Below is the storyline pattern of a video that performs well: how it opens, how the story escalates and resolves, its pacing, its tone, and the techniques that hold attention. Follow that shape closely so a fan of the original would recognise the same kind of video.',
      'Do NOT reuse the original video\'s subject, people, names, facts, examples, or wording. New subject, new characters, new events, new sentences. Only the storyline pattern carries over.',
      input.prompt.trim()
        ? `Subject for the new video: "${input.prompt.trim()}"`
        : 'Choose a fresh subject in the same niche. It must not be the subject of the scanned video.',
      `Storyline pattern: ${JSON.stringify(input.blueprint)}`
    );
  } else {
    lines.push(`Video idea: "${input.prompt}"`);
  }

  lines.push(
    input.targetLengthMinutes
      ? `Target length: ~${input.targetLengthMinutes} minutes`
      : input.blueprint
        ? `Target length: ~${Math.max(1, Math.round(input.blueprint.estimatedLengthMinutes))} minutes`
        : null,
    input.tone ? `Tone: ${input.tone}` : null
  );

  return lines.filter(Boolean).join('\n');
}
