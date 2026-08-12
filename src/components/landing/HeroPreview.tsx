import { useState } from 'react';
import { Film, ImageIcon, Mic2, RotateCcw, Wand2 } from 'lucide-react';
import clsx from 'clsx';

type OutputType = 'script' | 'images' | 'voice' | 'everything';

const OUTPUTS: { id: OutputType; label: string; hint: string; icon: typeof Film }[] = [
  { id: 'script', label: 'Script', hint: 'Hook to call to action', icon: Film },
  { id: 'images', label: 'Images', hint: 'One per scene', icon: ImageIcon },
  { id: 'voice', label: 'Voice', hint: '7 styles to pick from', icon: Mic2 },
  { id: 'everything', label: 'Everything', hint: 'Full package at once', icon: Wand2 },
];

const DEFAULT_OUTPUT: OutputType = 'voice';

export function HeroPreview() {
  const [selected, setSelected] = useState<OutputType>(DEFAULT_OUTPUT);

  return (
    <div className="relative mx-auto mt-14 max-w-2xl text-left">
      {/* Floating badges, matching product facts, nothing invented */}
      <span className="absolute -top-4 right-4 z-10 hidden items-center gap-1.5 rounded-full bg-base-elevated px-3.5 py-2 text-xs font-medium text-ink shadow-card sm:inline-flex">
        <Wand2 size={12} className="text-signal-400" />
        3 AI models, swappable anytime
      </span>
      <span className="absolute -bottom-4 left-4 z-10 hidden items-center gap-1.5 rounded-full bg-signal-gradient px-3.5 py-2 text-xs font-semibold text-white shadow-glow sm:inline-flex">
        One prompt. Full package.
      </span>

      <div className="glass-card overflow-hidden rounded-xl2 shadow-glow">
        <div className="flex items-center justify-between border-b border-white/[0.06] px-5 py-3.5">
          <div className="flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-success opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-success" />
            </span>
            <span className="text-xs font-medium text-ink">Live preview</span>
          </div>
          <button
            onClick={() => setSelected(DEFAULT_OUTPUT)}
            className="flex items-center gap-1 text-xs text-ink-faint transition-colors hover:text-ink"
          >
            <RotateCcw size={11} /> Reset
          </button>
        </div>

        <div className="p-5">
          <p className="label-eyebrow mb-3">Pick what to generate</p>
          <div className="grid grid-cols-2 gap-2.5">
            {OUTPUTS.map((output) => (
              <button
                key={output.id}
                onClick={() => setSelected(output.id)}
                className={clsx(
                  'rounded-xl border p-3 text-left transition-colors',
                  selected === output.id
                    ? 'border-signal-500/50 bg-signal-500/10'
                    : 'border-white/[0.07] bg-white/[0.02] hover:border-white/[0.15]'
                )}
              >
                <div className="mb-1.5 flex items-center gap-2">
                  <output.icon size={14} className={selected === output.id ? 'text-signal-300' : 'text-ink-faint'} />
                  <span className="text-xs font-semibold text-ink">{output.label}</span>
                </div>
                <p className="text-[11px] text-ink-muted">{output.hint}</p>
              </button>
            ))}
          </div>

          <div className="mt-4 min-h-[104px] rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
            <OutputPreview selected={selected} />
          </div>
        </div>
      </div>
    </div>
  );
}

function OutputPreview({ selected }: { selected: OutputType }) {
  if (selected === 'script') {
    return (
      <div className="animate-fade-up">
        <p className="label-eyebrow mb-1.5">Hook</p>
        <p className="mb-3 text-sm text-ink/90">
          "Rome did not fall in a single day. It took three centuries and one fatal mistake."
        </p>
        <p className="label-eyebrow mb-1.5">Chapter 1</p>
        <p className="text-sm text-ink-muted">The empire that stretched too far to hold itself together.</p>
      </div>
    );
  }

  if (selected === 'images') {
    return (
      <div className="animate-fade-up">
        <p className="label-eyebrow mb-2.5">Scene thumbnails</p>
        <div className="grid grid-cols-3 gap-2">
          {['from-signal-600/40 to-signal-400/20', 'from-ember-600/40 to-ember-400/20', 'from-signal-500/30 to-ember-500/20'].map(
            (gradient, i) => (
              <div
                key={i}
                className={clsx('flex aspect-video items-center justify-center rounded-lg bg-gradient-to-br', gradient)}
              >
                <ImageIcon size={16} className="text-white/50" />
              </div>
            )
          )}
        </div>
      </div>
    );
  }

  if (selected === 'voice') {
    return (
      <div className="animate-fade-up">
        <p className="label-eyebrow mb-2.5">Documentary Male</p>
        <div className="flex h-10 items-end gap-1">
          {[6, 14, 9, 20, 12, 24, 10, 18, 8, 22, 13, 16, 7, 19, 11].map((h, i) => (
            <span
              key={i}
              className="w-1.5 flex-1 rounded-full bg-signal-400/70"
              style={{ height: `${h * 4}px` }}
            />
          ))}
        </div>
        <p className="mt-2.5 text-[11px] text-ink-faint">Speed 1.0x, stability 0.6</p>
      </div>
    );
  }

  return (
    <div className="animate-fade-up flex items-center gap-4">
      <div className="flex flex-1 items-center gap-3 text-ink-muted">
        <Film size={16} className="text-signal-300" />
        <Mic2 size={16} className="text-signal-300" />
        <ImageIcon size={16} className="text-signal-300" />
      </div>
      <p className="text-[11px] text-ink-faint">Script, scenes, and narration generated together.</p>
    </div>
  );
}
