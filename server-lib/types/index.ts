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

export interface Subscription {
  id: string;
  user_id: string;
  provider: string;
  customer_code: string | null;
  subscription_code: string | null;
  plan_code: string | null;
  status: 'pending' | 'active' | 'past_due' | 'cancelled';
  current_period_end: string | null;
}

export type ProjectStatus =
  | 'draft'
  | 'script_ready'
  | 'images_ready'
  | 'voice_ready'
  | 'complete'
  | 'failed';

export interface Project {
  id: string;
  user_id: string;
  title: string;
  prompt: string;
  status: ProjectStatus;
  settings: ProjectSettings;
  modules: Record<string, unknown>;
  is_archived: boolean;
  created_at: string;
  updated_at: string;
}

export interface ProjectSettings {
  targetLengthMinutes?: number;
  tone?: string;
  voiceCategory?: VoiceCategory;
  imageStyle?: string;
  voiceControls?: VoiceControls;
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
  storage_key: string;
  provider: string;
  model: string;
  is_selected: boolean;
  created_at: string;
}

export interface VoiceTrack {
  id: string;
  project_id: string;
  scene_id: string | null;
  voice_category: string;
  url: string;
  storage_key: string;
  duration_seconds: number | null;
  settings: VoiceControls;
  provider: string;
  model: string;
}

export const VOICE_CATEGORIES = [
  'documentary_male',
  'documentary_female',
  'storytelling_male',
  'storytelling_female',
  'news_anchor',
  'calm',
  'emotional',
] as const;

export type VoiceCategory = (typeof VOICE_CATEGORIES)[number];

// Everyone gets a solid documentary narrator on the free tier. The more specialized/
// expressive styles are the premium upsell. Same Chatterbox model underneath either way,
// this is a feature gate, not a quality difference (unlike the script tiers).
export const PREMIUM_VOICE_CATEGORIES: VoiceCategory[] = [
  'storytelling_male',
  'storytelling_female',
  'news_anchor',
  'emotional',
];

export interface VoiceControls {
  speed: number; // 0.5 - 2.0, default 1.0
  pitch: number; // -12 - 12 semitones, default 0
  volume: number; // 0 - 100, default 100
  stability: number; // 0 - 1, default 0.6
}

export const DEFAULT_VOICE_CONTROLS: VoiceControls = {
  speed: 1.0,
  pitch: 0,
  volume: 100,
  stability: 0.6,
};

export interface GeneratedScript {
  hook: string;
  introduction: string;
  chapters: { title: string; narration: string; imagePrompt: string }[];
  conclusion: string;
  callToAction: string;
  rawMarkdown: string;
}
