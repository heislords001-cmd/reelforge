import { useEffect, useState } from 'react';
import { Lock, Play, Wand2 } from 'lucide-react';
import {
  DEFAULT_VOICE_CONTROLS,
  PREMIUM_VOICE_CATEGORIES,
  Scene,
  VOICE_CATEGORIES,
  VoiceCategory,
  VoiceControls,
  VoiceTrack,
} from '../../lib/types';
import { api, errorMessage } from '../../lib/api';
import { Spinner } from '../ui/Primitives';

interface Props {
  projectId: string;
  scenes: Scene[];
  voiceTracks: VoiceTrack[];
  onChanged: () => void;
}

export function VoicePanel({ projectId, scenes, voiceTracks, onChanged }: Props) {
  const [category, setCategory] = useState<VoiceCategory>(
    (voiceTracks[0]?.voice_category as VoiceCategory) ?? 'documentary_male'
  );
  const [controls, setControls] = useState<VoiceControls>(voiceTracks[0]?.settings ?? DEFAULT_VOICE_CONTROLS);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // null until billing loads. Nothing is locked while it is unknown, the server enforces
  // the real rule either way, this only decides what the UI shows up front.
  const [premium, setPremium] = useState<boolean | null>(null);

  useEffect(() => {
    api.billing.status().then((s) => setPremium(s.isPremiumActive)).catch(() => {});
  }, []);

  // Full voice list from the narration provider. Loaded once, shown grouped by locale.
  const [voices, setVoices] = useState<{ ShortName: string; Gender: string; Locale: string }[]>([]);
  const [voiceName, setVoiceName] = useState('');
  const [voicesError, setVoicesError] = useState<string | null>(null);
  useEffect(() => {
    api.generate.voices().then(setVoices).catch(() => setVoicesError('Could not load the voice list right now.'));
  }, []);
  const locales = Array.from(new Set(voices.map((v) => v.Locale))).sort();

  const isLocked = (id: VoiceCategory) => premium === false && PREMIUM_VOICE_CATEGORIES.includes(id);

  // A project voiced during the trial may use a premium style. Once the trial ends, fall
  // back to a free one rather than letting the next generate fail.
  useEffect(() => {
    if (premium === false && PREMIUM_VOICE_CATEGORIES.includes(category)) setCategory('documentary_male');
  }, [premium, category]);

  const tracksByScene = new Map(voiceTracks.map((t) => [t.scene_id, t]));

  async function generate() {
    setError(null);
    setGenerating(true);
    try {
      await api.generate.voice(projectId, category, controls, voiceName || undefined);
      onChanged();
    } catch (err) {
      setError(errorMessage(err, 'Could not generate narration. Please try again.'));
    } finally {
      setGenerating(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="glass-card p-5">
        <p className="label-eyebrow mb-3">Voice</p>
        <div className="mb-5">
          <label className="label-eyebrow mb-1.5 block">Specific voice</label>
          <select
            value={voiceName}
            onChange={(e) => {
              if (premium === false && e.target.value) {
                setError('Choosing a specific voice is a Premium feature. Use one of the styles below, or upgrade.');
                return;
              }
              setError(null);
              setVoiceName(e.target.value);
            }}
            className="input-field appearance-none [&>option]:bg-[#0D0D0D]"
          >
            <option value="">Use the style selected below</option>
            {locales.map((locale) => (
              <optgroup key={locale} label={locale}>
                {voices
                  .filter((v) => v.Locale === locale)
                  .map((v) => (
                    <option key={v.ShortName} value={v.ShortName}>
                      {v.ShortName.replace(/Neural$/, '')} ({v.Gender})
                    </option>
                  ))}
              </optgroup>
            ))}
          </select>
          {voicesError && <p className="mt-1.5 text-xs text-ember-400">{voicesError}</p>}
          {premium === false && (
            <p className="mt-1.5 text-[11px] text-ink-faint">Specific voices are part of Premium. Free accounts choose a style.</p>
          )}
        </div>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {VOICE_CATEGORIES.map((v) => (
            <button
              key={v.id}
              onClick={() => {
                if (isLocked(v.id)) {
                  setError('That voice is part of Premium. Pick one of the free styles, or upgrade to unlock it.');
                  return;
                }
                setError(null);
                setCategory(v.id);
              }}
              className={`relative rounded-xl border p-3 text-left transition-colors ${
                category === v.id
                  ? 'border-signal-500/50 bg-signal-500/10'
                  : 'border-white/[0.07] bg-white/[0.02] hover:border-white/[0.15]'
              } ${isLocked(v.id) ? 'opacity-55' : ''}`}
            >
              {isLocked(v.id) && <Lock size={12} className="absolute right-2.5 top-2.5 text-ink-faint" />}
              <p className="text-xs font-semibold text-ink">{v.label}</p>
              <p className="mt-0.5 text-[11px] text-ink-muted">{v.description}</p>
            </button>
          ))}
        </div>

        <div className="mt-5 grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-4">
          <Slider label="Speed" value={controls.speed} min={0.5} max={2} step={0.05} onChange={(v) => setControls((c) => ({ ...c, speed: v }))} format={(v) => `${v.toFixed(2)}x`} />
          <Slider label="Pitch" value={controls.pitch} min={-12} max={12} step={1} onChange={(v) => setControls((c) => ({ ...c, pitch: v }))} format={(v) => `${v > 0 ? '+' : ''}${v}`} />
          <Slider label="Volume" value={controls.volume} min={0} max={100} step={1} onChange={(v) => setControls((c) => ({ ...c, volume: v }))} format={(v) => `${v}%`} />
          <Slider label="Stability" value={controls.stability} min={0} max={1} step={0.05} onChange={(v) => setControls((c) => ({ ...c, stability: v }))} format={(v) => v.toFixed(2)} />
        </div>

        <button onClick={generate} disabled={generating} className="btn-primary mt-5 w-full sm:w-auto">
          {generating ? <Spinner /> : <Wand2 size={15} />}
          Generate narration
        </button>
        {error && <p className="mt-3 text-xs text-ember-400">{error}</p>}
      </div>

      {voiceTracks.length > 0 && (
        <div className="glass-card divide-y divide-white/[0.06]">
          {scenes.map((scene, i) => {
            const track = tracksByScene.get(scene.id);
            return (
              <div key={scene.id} className="flex items-center justify-between gap-4 p-4">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-ink">
                    {i + 1}. {scene.chapter_title}
                  </p>
                  {track?.duration_seconds && (
                    <p className="text-[11px] text-ink-faint">{Math.round(track.duration_seconds)}s</p>
                  )}
                </div>
                {track ? (
                  <audio controls src={track.url} className="h-8 w-52 max-w-full" />
                ) : (
                  <span className="flex items-center gap-1 text-[11px] text-ink-faint">
                    <Play size={12} /> Not generated
                  </span>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function Slider({
  label,
  value,
  min,
  max,
  step,
  onChange,
  format,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (v: number) => void;
  format: (v: number) => string;
}) {
  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between">
        <span className="text-[11px] font-medium text-ink-muted">{label}</span>
        <span className="font-mono text-[11px] text-ink">{format(value)}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-white/[0.08] accent-signal-500"
      />
    </div>
  );
}
