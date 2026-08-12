import { Loader2 } from 'lucide-react';
import { ProjectStatus } from '../../lib/types';
import clsx from 'clsx';

const STATUS_META: Record<ProjectStatus, { label: string; className: string }> = {
  draft: { label: 'Draft', className: 'bg-white/[0.06] text-ink-muted' },
  script_ready: { label: 'Script ready', className: 'bg-signal-500/15 text-signal-200' },
  images_ready: { label: 'Images ready', className: 'bg-signal-500/15 text-signal-200' },
  voice_ready: { label: 'Narration ready', className: 'bg-success/15 text-success' },
  complete: { label: 'Complete', className: 'bg-success/15 text-success' },
  failed: { label: 'Needs attention', className: 'bg-ember-500/15 text-ember-400' },
};

export function StatusPill({ status }: { status: ProjectStatus }) {
  const meta = STATUS_META[status];
  return (
    <span className={clsx('rounded-full px-2.5 py-1 text-[11px] font-medium', meta.className)}>{meta.label}</span>
  );
}

export function Spinner({ className }: { className?: string }) {
  return <Loader2 className={clsx('animate-spin', className)} size={16} />;
}

export function EmptyState({ title, description, action }: { title: string; description: string; action?: React.ReactNode }) {
  return (
    <div className="glass-card flex flex-col items-center gap-3 px-8 py-16 text-center">
      <h3 className="text-base font-semibold text-ink">{title}</h3>
      <p className="max-w-sm text-sm text-ink-muted">{description}</p>
      {action}
    </div>
  );
}
