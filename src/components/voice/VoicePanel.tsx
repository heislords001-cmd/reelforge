import { useState } from 'react';
import { Play, Wand2 } from 'lucide-react';
import { DEFAULT_VOICE_CONTROLS, Scene, VOICE_CATEGORIES, VoiceCategory, VoiceControls, VoiceTrack } from '../../lib/types';
import { api } from '../../lib/api';
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

  const tracksByScene = new Map(voiceTracks.map((t) => [t.scene_id, t]));

  async function generate() {
    setGenerating(true);
    try {
      await api.generate.voice(projectId, category, controls);
      onChanged();
    } finally {
      setGenerating(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="glass-card p-5">
        <p className="label-eyebrow mb-3">Voice</p>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {VOICE_CATEGORIES.map((v) => (
            <button
              key={v.id}
              onClick={() => setCategory(v.id)}
              className={`rounded-xl border p-3 text-left transition-colors ${
                category === v.id
                  ? 'border-signal-500/50 bg-signal-500/10'
                  : 'border-white/[0.07] bg-white/[0.02] hover:border-white/[0.15]'
              }`}
            >
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
