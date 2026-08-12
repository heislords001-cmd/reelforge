import { FormEvent, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Sparkles, Wand2 } from 'lucide-react';
import { AppShell } from '../components/layout/AppShell';
import { TrialBanner } from '../components/billing/TrialBanner';
import { ProjectList } from '../components/projects/ProjectList';
import { EmptyState, Spinner } from '../components/ui/Primitives';
import { api, errorMessage } from '../lib/api';
import { Project } from '../lib/types';

const EXAMPLE_PROMPTS = [
  'Create a documentary about the fall of the Roman Empire.',
  'Create a 10-minute video explaining how black holes form.',
  'Create a story-driven video about the rise of Bitcoin.',
];

export default function Dashboard() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loadingList, setLoadingList] = useState(true);
  const [search, setSearch] = useState('');
  const [prompt, setPrompt] = useState('');
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  async function loadProjects(q?: string) {
    setLoadingList(true);
    try {
      const data = await api.projects.list(q);
      setProjects(data);
    } finally {
      setLoadingList(false);
    }
  }

  useEffect(() => {
    loadProjects();
  }, []);

  useEffect(() => {
    const t = setTimeout(() => loadProjects(search || undefined), 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  async function handleCreate(e: FormEvent) {
    e.preventDefault();
    if (!prompt.trim()) return;
    setError(null);
    setCreating(true);
    try {
      const project = await api.projects.create(prompt.trim());
      navigate(`/projects/${project.id}`);
    } catch (err) {
      setError(errorMessage(err, 'Could not start that project. Try again.'));
    } finally {
      setCreating(false);
    }
  }

  return (
    <AppShell>
      <TrialBanner />
      <section className="mb-14 text-center animate-fade-up">
        <p className="label-eyebrow mb-3 flex items-center justify-center gap-1.5 text-signal-400">
          <Sparkles size={12} /> One idea. A full video package.
        </p>
        <h1 className="mx-auto mb-8 max-w-2xl text-3xl font-semibold leading-tight sm:text-4xl">
          What are we creating today?
        </h1>

        <form onSubmit={handleCreate} className="mx-auto max-w-2xl">
          <div className="glass-card relative rounded-xl2 p-2 shadow-glow">
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder='e.g. "Create a documentary about the fall of the Roman Empire."'
              rows={3}
              className="w-full resize-none rounded-xl bg-transparent px-4 py-3 text-[15px] text-ink placeholder:text-ink-faint outline-none"
            />
            <div className="flex items-center justify-between px-3 pb-1.5 pt-1">
              <span className="text-[11px] text-ink-faint">Script, images, and narration, generated together.</span>
              <button type="submit" disabled={creating || !prompt.trim()} className="btn-primary">
                {creating ? <Spinner /> : <Wand2 size={15} />}
                Start project
              </button>
            </div>
          </div>
          {error && <p className="mt-3 text-xs text-ember-400">{error}</p>}
        </form>

        <div className="mx-auto mt-4 flex max-w-2xl flex-wrap items-center justify-center gap-2">
          {EXAMPLE_PROMPTS.map((example) => (
            <button
              key={example}
              onClick={() => setPrompt(example)}
              className="rounded-full border border-white/[0.07] px-3 py-1.5 text-[11px] text-ink-muted transition-colors hover:border-signal-500/40 hover:text-ink"
            >
              {example}
            </button>
          ))}
        </div>
      </section>

      <section>
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Your projects</h2>
          <div className="relative w-64">
            <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-faint" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search projects"
              className="input-field !py-2 pl-8 text-xs"
            />
          </div>
        </div>

        {loadingList ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="shimmer-skeleton h-36 rounded-xl2" />
            ))}
          </div>
        ) : projects.length === 0 ? (
          <EmptyState
            title="No projects yet"
            description="Describe a video idea above and Reelforge will draft the script, scenes, and narration for you."
          />
        ) : (
          <ProjectList projects={projects} onChanged={() => loadProjects(search || undefined)} />
        )}
      </section>
    </AppShell>
  );
}
