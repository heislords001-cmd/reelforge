import { useCallback, useEffect, useRef, useState } from 'react';
import { CheckCircle2, Download, Film, Loader2, XCircle } from 'lucide-react';
import clsx from 'clsx';
import { api, errorMessage } from '../../lib/api';
import { RenderJob, RenderStatus } from '../../lib/types';

const POLL_MS = 4000;

const STATUS_META: Record<RenderStatus, { label: string; color: string }> = {
  queued:    { label: 'Queued',     color: 'text-ink-muted' },
  running:   { label: 'Rendering',  color: 'text-signal-200' },
  succeeded: { label: 'Done',       color: 'text-success' },
  failed:    { label: 'Failed',     color: 'text-ember-400' },
};

interface Props {
  projectId: string;
  hasScript: boolean;
  hasImages: boolean;
  hasVoice: boolean;
  isPremium: boolean;
}

export function RenderPanel({ projectId, hasScript, hasImages, hasVoice, isPremium }: Props) {
  const [jobs, setJobs] = useState<RenderJob[]>([]);
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const pollerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const ready = hasScript && hasImages && hasVoice;

  const loadJobs = useCallback(async () => {
    try { setJobs(await api.render.list(projectId)); } catch { /* silent */ }
  }, [projectId]);

  useEffect(() => { loadJobs(); }, [loadJobs]);

  // Poll while any job is active so progress updates appear in real time.
  useEffect(() => {
    const active = jobs.some((j) => j.status === 'queued' || j.status === 'running');
    if (active && !pollerRef.current) {
      pollerRef.current = setInterval(loadJobs, POLL_MS);
    } else if (!active && pollerRef.current) {
      clearInterval(pollerRef.current);
      pollerRef.current = null;
    }
    return () => { if (pollerRef.current) { clearInterval(pollerRef.current); pollerRef.current = null; } };
  }, [jobs, loadJobs]);

  async function startRender() {
    setError(null);
    setStarting(true);
    try {
      const job = await api.render.start(projectId);
      setJobs((prev) => [job, ...prev]);
    } catch (err) {
      setError(errorMessage(err, 'Could not start the render. Try again.'));
    } finally {
      setStarting(false);
    }
  }

  const activeJob = jobs.find((j) => j.status === 'queued' || j.status === 'running');
  const latestDone = jobs.find((j) => j.status === 'succeeded');

  return (
    <div className="space-y-5">
      <div className="glass-card p-5">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-ink">Render final video</h3>
            <p className="mt-0.5 text-[12px] text-ink-muted">
              {isPremium
                ? 'AI animated clips, then assembled into an MP4 with narration.'
                : 'Ken Burns pan and zoom on your scenes, assembled with narration. Watermark included. Upgrade to remove it and get AI animated clips.'}
            </p>
          </div>
          <span className={clsx('rounded-full px-2.5 py-1 text-[10px] font-semibold', isPremium ? 'bg-success/15 text-success' : 'bg-white/[0.06] text-ink-muted')}>
            {isPremium ? 'Premium' : 'Free'}
          </span>
        </div>

        {!ready && (
          <p className="mb-4 rounded-lg bg-white/[0.04] px-3 py-2.5 text-xs text-ink-muted">
            {!hasScript ? 'Generate a script first.' : !hasImages ? 'Generate images first.' : 'Generate audio first.'}
          </p>
        )}

        <button
          onClick={startRender}
          disabled={!ready || starting || Boolean(activeJob)}
          className="btn-primary w-full sm:w-auto"
        >
          {starting ? <Loader2 size={15} className="animate-spin" /> : <Film size={15} />}
          {activeJob ? 'Rendering...' : 'Start render'}
        </button>

        {error && <p className="mt-3 text-xs text-ember-400">{error}</p>}
      </div>

      {latestDone?.output_url && (
        <div className="glass-card flex items-center justify-between gap-4 p-4">
          <div className="flex items-center gap-3">
            <CheckCircle2 size={20} className="flex-shrink-0 text-success" />
            <div>
              <p className="text-sm font-semibold text-ink">Video ready</p>
              <p className="text-[11px] text-ink-faint">
                {new Date(latestDone.finished_at!).toLocaleString()}
              </p>
            </div>
          </div>
          <a
            href={latestDone.output_url}
            download
            target="_blank"
            rel="noopener"
            className="btn-secondary !py-2 text-xs"
          >
            <Download size={13} /> Download MP4
          </a>
        </div>
      )}

      {activeJob && (
        <div className="glass-card p-4">
          <div className="mb-2 flex items-center gap-2">
            <Loader2 size={14} className="animate-spin text-signal-400" />
            <span className="text-xs font-semibold text-signal-200">
              {activeJob.progress || 'Starting...'}
            </span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-white/[0.08]">
            <div className="h-full animate-pulse rounded-full bg-signal-gradient" style={{ width: '60%' }} />
          </div>
        </div>
      )}

      {jobs.length > 0 && (
        <div className="glass-card divide-y divide-white/[0.06]">
          <p className="label-eyebrow px-4 py-3">Render history</p>
          {jobs.map((job) => {
            const meta = STATUS_META[job.status];
            return (
              <div key={job.id} className="flex items-center justify-between gap-4 px-4 py-3">
                <div className="min-w-0">
                  <p className={clsx('text-xs font-semibold', meta.color)}>{meta.label}</p>
                  <p className="truncate text-[11px] text-ink-faint">
                    {job.progress || (job.mode === 'clips' ? 'AI clips' : 'Ken Burns')}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {job.status === 'failed' && <XCircle size={15} className="text-ember-400" />}
                  {job.output_url && (
                    <a href={job.output_url} download target="_blank" rel="noopener" className="btn-ghost">
                      <Download size={13} /> MP4
                    </a>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
