import { Zap } from 'lucide-react';

export function TogetherToggle({ on, onChange, otherTwo }: { on: boolean; onChange: (v: boolean) => void; otherTwo: string }) {
  return (
    <button
      onClick={() => onChange(!on)}
      className="mb-5 flex w-full items-center gap-3 rounded-xl2 border border-signal-500/30 bg-signal-500/[0.06] p-3.5 text-left"
    >
      <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-signal-500/15 text-signal-300">
        <Zap size={16} />
      </span>
      <span className="flex-1">
        <span className="block text-[13px] font-semibold text-ink">Do it all together</span>
        <span className="block text-[11px] text-ink-muted">Also generate {otherTwo}</span>
      </span>
      <span className={`relative h-[22px] w-10 flex-shrink-0 rounded-full transition-colors ${on ? 'bg-signal-gradient shadow-glow' : 'bg-white/10'}`}>
        <span className={`absolute top-[3px] h-4 w-4 rounded-full bg-white transition-all ${on ? 'left-[20px]' : 'left-[3px]'}`} />
      </span>
    </button>
  );
}
