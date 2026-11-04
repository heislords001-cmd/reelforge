import { useEffect, useState } from 'react';
import { Film, ImageIcon, Mic2 } from 'lucide-react';
import clsx from 'clsx';
import { AspectRatio } from '../../lib/types';

const SCENES = [
  { gradient: 'from-signal-600/55 via-base-surface to-ember-500/35', icon: Film, caption: 'Rome did not fall in a single day.' },
  { gradient: 'from-ember-600/45 via-base-surface to-signal-500/40', icon: ImageIcon, caption: 'The empire stretched further than it could hold.' },
  { gradient: 'from-signal-500/45 via-base-elevated to-signal-700/40', icon: Mic2, caption: 'Then one fatal decision changed everything.' },
];

const RATIO_CSS: Record<AspectRatio, string> = { '16:9': '16 / 9', '9:16': '9 / 16', '1:1': '1 / 1' };

/**
 * An example frame, clearly labelled as one. It reshapes to whatever aspect ratio is picked
 * in the controls so the choice is visible right away, and it cycles through sample scenes
 * on its own. Nothing here is real output.
 */
export function StudioPreview({ aspect }: { aspect: AspectRatio }) {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => setIndex((i) => (i + 1) % SCENES.length), 3200);
    return () => clearInterval(timer);
  }, []);

  const scene = SCENES[index];
  const portrait = aspect === '9:16';

  return (
    <div className="relative flex min-h-[260px] flex-col items-center justify-center gap-4 rounded-xl bg-white/[0.02] p-4 sm:min-h-[440px]">
      <span className="absolute left-4 top-4 z-10 rounded-full bg-base/80 px-3 py-1.5 text-[11px] font-semibold text-ink backdrop-blur">
        Example preview
      </span>

      <div
        key={`${index}-${aspect}`}
        className={clsx(
          'relative animate-fade-up overflow-hidden rounded-xl border border-white/10 bg-gradient-to-br',
          scene.gradient,
          aspect === '16:9' && 'w-full',
          aspect === '1:1' && 'w-full max-w-[340px]'
        )}
        style={{
          aspectRatio: RATIO_CSS[aspect],
          ...(portrait ? { width: 210, height: 373, maxWidth: '100%' } : {}),
        }}
      >
        <scene.icon size={56} className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-white/15" />
        <p className="absolute inset-x-3 bottom-3 rounded-lg bg-base/80 px-3 py-2 text-xs text-ink backdrop-blur">
          {scene.caption}
        </p>
      </div>

      <div className="flex gap-1.5">
        {SCENES.map((_, i) => (
          <button
            key={i}
            onClick={() => setIndex(i)}
            aria-label={`Show example scene ${i + 1}`}
            className={clsx('h-1 rounded-full transition-all', i === index ? 'w-6 bg-signal-400' : 'w-3 bg-white/20')}
          />
        ))}
      </div>
    </div>
  );
}
