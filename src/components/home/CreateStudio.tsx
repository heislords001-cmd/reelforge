import { FormEvent, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronDown, Lightbulb, Link2, Wand2 } from 'lucide-react';
import clsx from 'clsx';
import { api, errorMessage } from '../../lib/api';
import { AspectRatio, BillingStatus } from '../../lib/types';
import { Spinner } from '../ui/Primitives';
import { StudioPreview } from './StudioPreview';

type Mode = 'idea' | 'video';

const ASPECTS: { id: AspectRatio; w: number; h: number }[] = [
  { id: '9:16', w: 13, h: 23 },
  { id: '16:9', w: 26, h: 15 },
  { id: '1:1', w: 19, h: 19 },
];
const LENGTHS = [3, 5, 8, 10, 15];
const STYLES = [
  { id: 'documentary', label: 'Documentary' },
  { id: 'cinematic', label: 'Cinematic' },
  { id: 'historical', label: 'Historical' },
  { id: 'animated', label: 'Animated' },
];
const SUGGESTIONS = [
  { label: 'Fall of Rome', prompt: 'Create a documentary about the fall of the Roman Empire.' },
  { label: 'Black holes', prompt: 'Create a video explaining how black holes form.' },
  { label: 'Rise of Bitcoin', prompt: 'Create a story driven video about the rise of Bitcoin.' },
  { label: 'Unsolved mystery', prompt: 'Create a gripping video about an unsolved historical mystery.' },
];

export function CreateStudio() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<Mode>('idea');
  const [prompt, setPrompt] = useState('');
  const [videoUrl, setVideoUrl] = useState('');
  const [topicHint, setTopicHint] = useState('');
  const [showTopic, setShowTopic] = useState(false);
  const [aspect, setAspect] = useState<AspectRatio>('16:9');
  const [length, setLength] = useState(8);
  const [style, setStyle] = useState('documentary');
  const [creating, setCreating] = useState(false);
  const [scanStage, setScanStage] = useState<'scanning' | 'writing' | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [billing, setBilling] = useState<BillingStatus | null>(null);

  useEffect(() => {
    api.billing.status().then(setBilling).catch(() => {});
  }, []);

  const busy = creating || scanStage !== null;
  const canSubmit = mode === 'idea' ? Boolean(prompt.trim()) : Boolean(videoUrl.trim());
  const options = { targetLengthMinutes: length, imageStyle: style, aspectRatio: aspect };

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!canSubmit || busy) return;
    setError(null);

    if (mode === 'idea') {
      setCreating(true);
      try {
        const project = await api.projects.create(prompt.trim(), options);
        navigate(`/projects/${project.id}`);
      } catch (err) {
        setError(errorMessage(err, 'Could not start that project. Try again.'));
        setCreating(false);
      }
      return;
    }

    setScanStage('scanning');
    let projectId: string | null = null;
    try {
      const project = await api.generate.fromVideo(videoUrl.trim(), { ...options, topicHint: topicHint.trim() || undefined });
      projectId = project.id;
      // Two requests on purpose: scanning and writing are each slow, and splitting them
      // keeps each one inside serverless function time limits.
      setScanStage('writing');
      await api.generate.script(project.id);
    } catch (err) {
      if (!projectId) {
        setError(errorMessage(err, 'Could not scan that video. Try again.'));
        setScanStage(null);
        return;
      }
      // The project exists but the script failed. Open it anyway so the scan is not lost
      // and the script can be retried from the Script tab.
    }
    navigate(`/projects/${projectId}`);
  }

  const premium = billing?.isPremiumActive ?? false;

  return (
    <section className="mb-12 animate-fade-up">
      <div className="glass-card mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl2 p-2.5">
        <div className="flex rounded-xl bg-white/[0.03] p-1">
          <ModeButton active={mode === 'idea'} onClick={() => setMode('idea')} icon={Lightbulb} label="From an idea" />
          <ModeButton active={mode === 'video'} onClick={() => setMode('video')} icon={Link2} label="From a video link" />
        </div>
        <p className="hidden pr-3 text-xs text-ink-muted sm:block">
          {mode === 'idea'
            ? 'Start with a prompt and we handle the rest.'
            : 'Paste a public link. We borrow the storyline shape, never the story.'}
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.35fr_1fr]">
        <div className="glass-card rounded-xl2 p-3">
          <StudioPreview aspect={aspect} />
        </div>

        <form onSubmit={onSubmit} className="glass-card space-y-5 rounded-xl2 p-5 text-left">
          <div>
            <div className="mb-2 flex items-center gap-2">
              <span className="text-sm font-semibold text-ink">{mode === 'idea' ? 'Basic prompt' : 'Video link'}</span>
              {mode === 'video' && (
                <span className="rounded-full bg-white/[0.06] px-2 py-0.5 text-[10px] text-ink-muted">Public videos only</span>
              )}
            </div>

            {mode === 'idea' ? (
              <>
                <textarea
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder="Describe the video you want to create..."
                  rows={4}
                  disabled={busy}
                  className="input-field resize-none"
                />
                <div className="mt-2.5 flex gap-2 overflow-x-auto pb-1">
                  {SUGGESTIONS.map((s) => (
                    <button
                      key={s.label}
                      type="button"
                      onClick={() => setPrompt(s.prompt)}
                      className="flex-shrink-0 rounded-full border border-white/[0.08] px-3 py-1.5 text-[11px] text-ink-muted transition-colors hover:border-signal-500/40 hover:text-ink"
                    >
                      {s.label}
                    </button>
                  ))}
                </div>
              </>
            ) : (
              <>
                <input
                  value={videoUrl}
                  onChange={(e) => setVideoUrl(e.target.value)}
                  placeholder="Paste a public YouTube link"
                  inputMode="url"
                  disabled={busy}
                  className="input-field"
                />
                <button
                  type="button"
                  onClick={() => setShowTopic((v) => !v)}
                  className="mt-3 flex w-full items-center justify-between rounded-xl border border-white/[0.08] bg-white/[0.02] px-4 py-3 text-left"
                >
                  <span>
                    <span className="block text-[13px] font-semibold text-ink">Choose the new subject</span>
                    <span className="block text-[11px] text-ink-muted">Optional. Leave it empty and we pick a fresh one.</span>
                  </span>
                  <ChevronDown size={16} className={clsx('text-ink-faint transition-transform', showTopic && 'rotate-180')} />
                </button>
                {showTopic && (
                  <textarea
                    value={topicHint}
                    onChange={(e) => setTopicHint(e.target.value)}
                    placeholder="What should the new story be about?"
                    rows={2}
                    disabled={busy}
                    className="input-field mt-2 resize-none"
                  />
                )}
              </>
            )}
          </div>

          <div className="flex gap-2.5">
            {ASPECTS.map((a) => (
              <button
                key={a.id}
                type="button"
                onClick={() => setAspect(a.id)}
                className={clsx(
                  'flex w-[74px] flex-col items-center gap-2 rounded-xl border px-2 py-3 transition-colors',
                  aspect === a.id ? 'border-signal-500/70 bg-signal-500/10 shadow-glow' : 'border-white/[0.08] bg-white/[0.02] hover:border-white/20'
                )}
              >
                <span className="flex h-7 items-center justify-center">
                  <span className="rounded-[3px] bg-signal-gradient" style={{ width: a.w, height: a.h }} />
                </span>
                <span className="text-[11px] font-medium text-ink">{a.id}</span>
              </button>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className="label-eyebrow mb-1.5 block">Length</span>
              <select value={length} onChange={(e) => setLength(Number(e.target.value))} disabled={busy} className="input-field appearance-none [&>option]:bg-[#0D0D0D]">
                {LENGTHS.map((m) => (
                  <option key={m} value={m}>{m} min</option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="label-eyebrow mb-1.5 block">Image style</span>
              <select value={style} onChange={(e) => setStyle(e.target.value)} disabled={busy} className="input-field appearance-none [&>option]:bg-[#0D0D0D]">
                {STYLES.map((s) => (
                  <option key={s.id} value={s.id}>{s.label}</option>
                ))}
              </select>
            </label>
          </div>

          <div className="rounded-xl border border-white/[0.08] bg-white/[0.02] p-3.5">
            <div className="mb-1.5 flex items-center justify-between">
              <span className="label-eyebrow">Your AI models</span>
              <span className={clsx('rounded-full px-2 py-0.5 text-[10px] font-semibold', premium ? 'bg-success/15 text-success' : 'bg-white/[0.06] text-ink-muted')}>
                {premium ? 'Premium' : 'Standard'}
              </span>
            </div>
            <p className="text-[12px] leading-relaxed text-ink-muted">
              {premium
                ? 'Stronger script model, higher quality images with options per scene, and all seven narration styles.'
                : 'Standard script model, one image per scene, and three narration styles. Upgrade for the full set.'}
            </p>
          </div>

          <div>
            <button type="submit" disabled={!canSubmit || busy} className="btn-primary w-full !py-3">
              {busy ? <Spinner /> : mode === 'idea' ? <Wand2 size={15} /> : <Link2 size={15} />}
              {mode === 'idea' ? 'Start project' : 'Scan and write'}
            </button>
            <p className="mt-2.5 text-center text-[11px] text-ink-faint">
              {scanStage === 'scanning'
                ? 'Scanning the storyline...'
                : scanStage === 'writing'
                  ? 'Writing your original script...'
                  : mode === 'idea'
                    ? 'Script, video, and audio, ready to generate together.'
                    : 'Same storyline shape, a completely different story.'}
            </p>
            {error && <p className="mt-2 text-center text-xs text-ember-400">{error}</p>}
          </div>
        </form>
      </div>
    </section>
  );
}

function ModeButton({ active, onClick, icon: Icon, label }: { active: boolean; onClick: () => void; icon: typeof Lightbulb; label: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={clsx(
        'flex items-center gap-1.5 rounded-lg px-4 py-2.5 text-xs font-semibold transition-colors',
        active ? 'bg-signal-gradient text-white shadow-glow' : 'text-ink-muted hover:text-ink'
      )}
    >
      <Icon size={13} /> {label}
    </button>
  );
}
