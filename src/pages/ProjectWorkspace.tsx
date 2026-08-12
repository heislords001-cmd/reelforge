import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Check, Film, ImageIcon, Mic2, Wand2 } from 'lucide-react';
import clsx from 'clsx';
import { AppShell } from '../components/layout/AppShell';
import { ScriptEditor } from '../components/script/ScriptEditor';
import { ImageGrid } from '../components/images/ImageGrid';
import { VoicePanel } from '../components/voice/VoicePanel';
import { EmptyState, Spinner, StatusPill } from '../components/ui/Primitives';
import { api, errorMessage } from '../lib/api';
import { FullProject } from '../lib/types';

type Tab = 'script' | 'images' | 'voice';
type Stage = 'script' | 'images' | 'voice' | null;

export default function ProjectWorkspace() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [data, setData] = useState<FullProject | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>('script');
  const [runningStage, setRunningStage] = useState<Stage>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!id) return;
    const full = await api.projects.get(id);
    setData(full);
  }, [id]);

  useEffect(() => {
    setLoading(true);
    load().finally(() => setLoading(false));
  }, [load]);

  async function run(stage: Exclude<Stage, null>) {
    if (!id) return;
    setError(null);
    setRunningStage(stage);
    try {
      if (stage === 'script') await api.generate.script(id);
      if (stage === 'images') await api.generate.images(id);
      if (stage === 'voice') await api.generate.voice(id, 'documentary_male', { speed: 1, pitch: 0, volume: 100, stability: 0.6 });
      await load();
      setTab(stage);
    } catch (err) {
      setError(errorMessage(err, `Couldn't generate ${stage}. Please try again.`));
    } finally {
      setRunningStage(null);
    }
  }

  async function runEverything() {
    if (!id) return;
    setError(null);
    const controls = { speed: 1, pitch: 0, volume: 100, stability: 0.6 };

    // Deliberately three separate requests rather than one combined backend call: on a
    // serverless host (Vercel) a single request chaining script + N images + N voice tracks
    // can run long enough to hit the function's max duration. Splitting it means each
    // request only needs to survive one stage, and the UI can show real progress between
    // them. If a stage fails, whatever completed before it is already saved.
    try {
      setRunningStage('script');
      await api.generate.script(id);
      await load();

      setRunningStage('images');
      await api.generate.images(id);
      await load();

      setRunningStage('voice');
      await api.generate.voice(id, 'documentary_male', controls);
      await load();

      setTab('voice');
    } catch (err) {
      setError(errorMessage(err, "Generation didn't finish. Whatever completed so far has been saved."));
      await load();
    } finally {
      setRunningStage(null);
    }
  }

  if (loading || !data) {
    return (
      <AppShell>
        <div className="flex h-64 items-center justify-center">
          <Spinner className="text-signal-400" />
        </div>
      </AppShell>
    );
  }

  const { project, script, scenes, images, voiceTracks } = data;
  const hasScript = Boolean(script && scenes.length > 0);
  const hasImages = images.some((i) => i.is_selected);
  const hasVoice = voiceTracks.length > 0;

  return (
    <AppShell>
      <button onClick={() => navigate('/dashboard')} className="btn-ghost mb-4 -ml-3">
        <ArrowLeft size={14} /> All projects
      </button>

      <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="mb-2 flex items-center gap-3">
            <StatusPill status={project.status} />
          </div>
          <h1 className="max-w-2xl text-2xl font-semibold leading-snug">{project.title}</h1>
          <p className="mt-1.5 max-w-xl text-sm text-ink-muted">{project.prompt}</p>
        </div>
        <button onClick={runEverything} disabled={runningStage !== null} className="btn-primary">
          {runningStage ? <Spinner /> : <Wand2 size={15} />}
          Generate everything
        </button>
      </div>

      {error && <p className="mb-6 rounded-lg bg-ember-500/10 px-4 py-2.5 text-xs text-ember-400">{error}</p>}

      <PipelineStepper hasScript={hasScript} hasImages={hasImages} hasVoice={hasVoice} runningStage={runningStage} />

      <div className="mb-6 mt-8 flex items-center gap-1 border-b border-white/[0.06]">
        <TabButton icon={Film} label="Script" active={tab === 'script'} onClick={() => setTab('script')} />
        <TabButton icon={ImageIcon} label="Images" active={tab === 'images'} onClick={() => setTab('images')} />
        <TabButton icon={Mic2} label="Voice" active={tab === 'voice'} onClick={() => setTab('voice')} />
      </div>

      {tab === 'script' &&
        (hasScript ? (
          <ScriptEditor projectId={project.id} script={script!} scenes={scenes} onSceneUpdated={load} />
        ) : (
          <EmptyState
            title="No script yet"
            description="Generate a script from your prompt: hook, chapters, conclusion, and a call to action."
            action={
              <button onClick={() => run('script')} disabled={runningStage !== null} className="btn-primary mt-2">
                {runningStage === 'script' ? <Spinner /> : <Wand2 size={15} />}
                Generate script
              </button>
            }
          />
        ))}

      {tab === 'images' &&
        (hasScript ? (
          <ImageGrid projectId={project.id} scenes={scenes} images={images} onChanged={load} />
        ) : (
          <EmptyState title="Write a script first" description="Images are generated from your script's scenes." />
        ))}
      {tab === 'images' && hasScript && !hasImages && (
        <div className="mt-4 text-center">
          <button onClick={() => run('images')} disabled={runningStage !== null} className="btn-primary">
            {runningStage === 'images' ? <Spinner /> : <Wand2 size={15} />}
            Generate images
          </button>
        </div>
      )}

      {tab === 'voice' &&
        (hasScript ? (
          <VoicePanel projectId={project.id} scenes={scenes} voiceTracks={voiceTracks} onChanged={load} />
        ) : (
          <EmptyState title="Write a script first" description="Narration is generated from your script's chapters." />
        ))}
    </AppShell>
  );
}

function PipelineStepper({
  hasScript,
  hasImages,
  hasVoice,
  runningStage,
}: {
  hasScript: boolean;
  hasImages: boolean;
  hasVoice: boolean;
  runningStage: Stage;
}) {
  const steps = [
    { key: 'script', label: 'Script', done: hasScript },
    { key: 'images', label: 'Images', done: hasImages },
    { key: 'voice', label: 'Voice', done: hasVoice },
  ] as const;

  return (
    <div className="flex items-center">
      {steps.map((step, i) => (
        <div key={step.key} className="flex flex-1 items-center last:flex-none">
          <div className="flex items-center gap-2">
            <span
              className={clsx(
                'flex h-7 w-7 items-center justify-center rounded-full border text-[11px] font-semibold transition-colors',
                step.done
                  ? 'border-success/50 bg-success/15 text-success'
                  : runningStage === step.key
                    ? 'border-signal-500/60 bg-signal-500/15 text-signal-200'
                    : 'border-white/[0.1] bg-white/[0.03] text-ink-faint'
              )}
            >
              {step.done ? <Check size={13} /> : runningStage === step.key ? <Spinner className="h-3 w-3" /> : i + 1}
            </span>
            <span className={clsx('text-xs font-medium', step.done ? 'text-ink' : 'text-ink-muted')}>{step.label}</span>
          </div>
          {i < steps.length - 1 && <div className={clsx('mx-3 h-px flex-1', step.done ? 'bg-success/40' : 'bg-white/[0.08]')} />}
        </div>
      ))}
    </div>
  );
}

function TabButton({
  icon: Icon,
  label,
  active,
  onClick,
}: {
  icon: typeof Film;
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={clsx(
        'flex items-center gap-1.5 border-b-2 px-3 py-2.5 text-sm font-medium transition-colors',
        active ? 'border-signal-500 text-ink' : 'border-transparent text-ink-muted hover:text-ink'
      )}
    >
      <Icon size={14} />
      {label}
    </button>
  );
}
