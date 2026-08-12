export type Plan = 'trial' | 'premium' | 'free';

export interface User {
  id: string;
  email: string;
  name: string;
  avatar_url: string | null;
  plan: Plan;
  trial_ends_at: string;
  created_at: string;
}

export type ProjectStatus = 'draft' | 'script_ready' | 'images_ready' | 'voice_ready' | 'complete' | 'failed';

export interface VoiceControls {
  speed: number;
  pitch: number;
  volume: number;
  stability: number;
}

export const DEFAULT_VOICE_CONTROLS: VoiceControls = { speed: 1, pitch: 0, volume: 100, stability: 0.6 };

export interface ProjectSettings {
  targetLengthMinutes?: number;
  tone?: string;
  voiceCategory?: VoiceCategory;
  imageStyle?: string;
  voiceControls?: VoiceControls;
}

export interface Project {
  id: string;
  user_id: string;
  title: string;
  prompt: string;
  status: ProjectStatus;
  settings: ProjectSettings;
  is_archived: boolean;
  created_at: string;
  updated_at: string;
}

export interface Script {
  id: string;
  project_id: string;
  hook: string;
  introduction: string;
  conclusion: string;
  call_to_action: string;
  raw_markdown: string;
}

export interface Scene {
  id: string;
  script_id: string;
  project_id: string;
  order_index: number;
  chapter_title: string;
  narration_text: string;
  image_prompt: string;
}

export interface SceneImage {
  id: string;
  scene_id: string;
  url: string;
  is_selected: boolean;
  created_at: string;
}

export interface VoiceTrack {
  id: string;
  project_id: string;
  scene_id: string | null;
  voice_category: string;
  url: string;
  duration_seconds: number | null;
  settings: VoiceControls;
}

export interface FullProject {
  project: Project;
  script: Script | null;
  scenes: Scene[];
  images: SceneImage[];
  voiceTracks: VoiceTrack[];
}

export interface BillingStatus {
  plan: Plan;
  isPremiumActive: boolean;
  trialEndsAt: string;
  daysLeftInTrial: number;
  subscription: { status: string } | null;
}

export const VOICE_CATEGORIES: { id: VoiceCategory; label: string; description: string }[] = [
  { id: 'documentary_male', label: 'Documentary Male', description: 'Grounded, authoritative narration' },
  { id: 'documentary_female', label: 'Documentary Female', description: 'Warm, clear, factual delivery' },
  { id: 'storytelling_male', label: 'Storytelling Male', description: 'Expressive, cinematic pacing' },
  { id: 'storytelling_female', label: 'Storytelling Female', description: 'Rich, narrative-driven tone' },
  { id: 'news_anchor', label: 'News Anchor', description: 'Crisp, broadcast-ready delivery' },
  { id: 'calm', label: 'Calm', description: 'Slow, soothing, meditative' },
  { id: 'emotional', label: 'Emotional', description: 'Expressive range, dramatic beats' },
];

// Matches server-lib/types/index.ts PREMIUM_VOICE_CATEGORIES. Lets the UI show a lock state
// before the request even goes out, instead of only finding out from a 403 response.
export const PREMIUM_VOICE_CATEGORIES: VoiceCategory[] = [
  'storytelling_male',
  'storytelling_female',
  'news_anchor',
  'emotional',
];

export type VoiceCategory =
  | 'documentary_male'
  | 'documentary_female'
  | 'storytelling_male'
  | 'storytelling_female'
  | 'news_anchor'
  | 'calm'
  | 'emotional';
