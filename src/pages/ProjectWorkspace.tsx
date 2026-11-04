import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Check, Wand2 } from 'lucide-react';
import clsx from 'clsx';
import { AppShell } from '../components/layout/AppShell';
import { BottomNav, NavTab } from '../components/layout/BottomNav';
import { TogetherToggle } from '../components/workspace/TogetherToggle';
import { ScriptEditor } from '../components/script/ScriptEditor';
import { ImageGrid } from '../components/images/ImageGrid';
import { VoicePanel } from '../components/voice/VoicePanel';
import { EmptyState, Spinner, StatusPill } from '../components/ui/Primitives';
import { api, errorMessage } from '../lib/api';
import { FullProject } from '../lib/types';

type Stage = 'script' | 'images' | 'voice' | null;
// "video" is the user facing tab name. It maps to the existing per scene image generation,
// no separate video rendering exists yet, this is a navigation label only.
type WorkTab = Exclude<NavTab, 'home'>;

export default function ProjectWorkspace() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [data, setData] = useState<FullProject | null>(null);
  const [loading, setLoading] = useState(true);
  const requested = searchParams.get('tab');
  const [tab, setTab] = useState<WorkTab>(requested === 'video' || requested === 'audio' ? requested : 'script');
  const [together, setTogether] = useState(false);
  const [runningStage, setRunningStage] = useState<Stage>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!id) return;
    setData(await api.projects.get(id));
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
    } catch (err) {
      setError(errorMessage(err, `Could not generate ${stage}. Please try again.`));
    } finally {
      setRunningStage(null);
    }
  }

  async function runEverything(landOn: WorkTab) {
    if (!id) return;
    setError(null);
    const controls = { speed: 1, pitch: 0, volume: 100, stability: 0.6 };
    // Three separate requests, not one combined call, so each stays under serverless
    // function time limits and the stepper shows real progress between stages.
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
      setTab(landOn);
    } catch (err) {
      setError(errorMessage(err, 'Generation did not finish. Whatever completed so far has been saved.'));
      await load();
    } finally {
      setRunningStage(null);
    }
  }

  function generateFor(t: WorkTab) {
    if (together) return runEverything(t);
    if (t === 'script') return run('script');
    if (t === 'video') return run('images');
    return run('voice');
  }

  if (loading || !data) {
    return (
      <AppShell>
        <div className="flex h-64 items-center justify-center"><Spinner className="text-signal-400" /></div>
      </AppShell>
    );
  }

  const { project, script, scenes, images, voiceTracks } = data;
  const hasScript = Boolean(script && scenes.length > 0);
  const hasImages = images.some((i) => i.is_selected);
  const hasVoice = voiceTracks.length > 0;
  const otherTwo: Record<WorkTab, string> = { script: 'video and audio', video: 'script and audio', audio: 'script and video' };

  return (
    <AppShell>
      <div className="pb-24">
        <button onClick={() => navigate('/dashboard')} className="btn-ghost mb-4 -ml-3">
          <ArrowLeft size={14} /> All projects
        </button>

        <div className="mb-6">
          <div className="mb-2"><StatusPill status={project.status} /></div>
          <h1 className="max-w-2xl text-2xl font-semibold leading-snug">{project.title}</h1>
          <p className="mt-1.5 max-w-xl text-sm text-ink-muted">{project.prompt}</p>
        </div>

        {error && <p className="mb-6 rounded-lg bg-ember-500/10 px-4 py-2.5 text-xs text-ember-400">{error}</p>}

        <PipelineStepper hasScript={hasScript} hasImages={hasImages} hasVoice={hasVoice} runningStage={runningStage} />

        <div className="mt-8">
          <TogetherToggle on={together} onChange={setTogether} otherTwo={otherTwo[tab]} />

          {tab === 'script' &&
            (hasScript ? (
              <ScriptEditor projectId={project.id} script={script!} scenes={scenes} onSceneUpdated={load} />
            ) : (
              <EmptyState
                title="No script yet"
                description="Generate a script from your prompt: hook, chapters, conclusion, and a call to action."
                action={
                  <button onClick={() => generateFor('script')} disabled={runningStage !== null} className="btn-primary mt-2">
                    {runningStage === 'script' ? <Spinner /> : <Wand2 size={15} />} Generate script
                  </button>
                }
              />
            ))}

          {tab === 'video' &&
            (hasScript ? (
              <>
                <ImageGrid projectId={project.id} scenes={scenes} images={images} onChanged={load} />
                {!hasImages && (
                  <div className="mt-4 text-center">
                    <button onClick={() => generateFor('video')} disabled={runningStage !== null} className="btn-primary">
                      {runningStage === 'images' ? <Spinner /> : <Wand2 size={15} />} Generate video
                    </button>
                  </div>
                )}
              </>
            ) : (
              <EmptyState title="Write a script first" description="Video is generated from your script's scenes." />
            ))}

          {tab === 'audio' &&
            (hasScript ? (
              <VoicePanel projectId={project.id} scenes={scenes} voiceTracks={voiceTracks} onChanged={load} />
            ) : (
              <EmptyState title="Write a script first" description="Narration is generated from your script's chapters." />
            ))}
        </div>
      </div>

      <BottomNav active={tab} onTabChange={setTab} />
    </AppShell>
  );
}

function PipelineStepper({ hasScript, hasImages, hasVoice, runningStage }: { hasScript: boolean; hasImages: boolean; hasVoice: boolean; runningStage: Stage }) {
  const steps = [
    { key: 'script', label: 'Script', done: hasScript },
    { key: 'images', label: 'Video', done: hasImages },
    { key: 'voice', label: 'Audio', done: hasVoice },
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
