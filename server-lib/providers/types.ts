import { GeneratedScript, VideoBlueprint, VoiceCategory, VoiceControls } from '../types';

/**
 * Every AI capability in the platform is defined here as a small, stable interface.
 * Routes and services depend ONLY on these interfaces. Never on a concrete vendor SDK.
 * Adding a provider (or a whole new capability, like video) means adding a class that
 * implements one of these and registering it in `registry.ts`. Nothing else changes.
 */

export interface ScriptGenerationInput {
  /** The subject. May be empty when a blueprint is given and the model should pick a fresh one. */
  prompt: string;
  /** When present, write an original story that follows this storyline pattern. */
  blueprint?: VideoBlueprint;
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

export interface VideoAnalysisProvider {
  readonly name: string;
  readonly model: string;
  /** Watches a public video and returns its storyline pattern, never its wording. */
  analyzeVideo(url: string): Promise<VideoBlueprint>;
}

export interface ImageToVideoInput {
  /** Publicly reachable URL of the still to animate. */
  imageUrl: string;
  /** Describes the motion, not the content. */
  prompt: string;
  seconds: number;
}

export interface ImageToVideoProvider {
  readonly name: string;
  readonly model: string;
  /** Resolves with the finished clip as MP4 bytes. Can take minutes. */
  generateClip(input: ImageToVideoInput): Promise<{ buffer: Buffer; contentType: 'video/mp4' }>;
}
