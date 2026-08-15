import { GeneratedScript, VoiceCategory, VoiceControls } from '../types';

/**
 * Every AI capability in the platform is defined here as a small, stable interface.
 * Routes and services depend ONLY on these interfaces. Never on a concrete vendor SDK.
 * Adding a provider (or a whole new capability, like video) means adding a class that
 * implements one of these and registering it in `registry.ts`. Nothing else changes.
 */

export interface ScriptGenerationInput {
  prompt: string;
  targetLengthMinutes?: number;
  tone?: string;
}

export interface ScriptProvider {
  readonly name: string;
  readonly model: string;
  generateScript(input: ScriptGenerationInput): Promise<GeneratedScript>;
}

export interface ImageGenerationInput {
  prompt: string;
  style?: string;
  aspectRatio?: '16:9' | '9:16' | '1:1';
}

export interface ImageGenerationResult {
  /** Raw image bytes. The caller (imageService) is responsible for uploading to storage. */
  buffer: Buffer;
  contentType: string;
}

export interface ImageProvider {
  readonly name: string;
  readonly model: string;
  generateImage(input: ImageGenerationInput): Promise<ImageGenerationResult>;
}

export interface VoiceSynthesisInput {
  text: string;
  voiceCategory: VoiceCategory;
  controls: VoiceControls;
}

export interface VoiceSynthesisResult {
  buffer: Buffer;
  contentType: string;
  durationSeconds?: number;
}

export interface VoiceProvider {
  readonly name: string;
  synthesize(input: VoiceSynthesisInput): Promise<VoiceSynthesisResult>;
}
