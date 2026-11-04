import { useEffect, useState } from 'react';
import { Search } from 'lucide-react';
import { AppShell } from '../components/layout/AppShell';
import { BottomNav } from '../components/layout/BottomNav';
import { TrialBanner } from '../components/billing/TrialBanner';
import { CreateStudio } from '../components/home/CreateStudio';
import { ProjectList } from '../components/projects/ProjectList';
import { EmptyState } from '../components/ui/Primitives';
import { api } from '../lib/api';
import { Project } from '../lib/types';

export default function Dashboard() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loadingList, setLoadingList] = useState(true);
  const [search, setSearch] = useState('');

  async function loadProjects(q?: string) {
    setLoadingList(true);
    try {
      setProjects(await api.projects.list(q));
    } finally {
      setLoadingList(false);
    }
  }

  // Debounced so typing in the search box does not fire a request per keystroke. This also
  // covers the first load, since search starts empty.
  useEffect(() => {
    const t = setTimeout(() => loadProjects(search || undefined), 300);
    return () => clearTimeout(t);
  }, [search]);

  return (
    <AppShell>
      <div className="pb-24">
        <TrialBanner />
        <CreateStudio />

        <section>
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-lg font-semibold">Your projects</h2>
            <div className="relative w-full sm:w-64">
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
              description="Describe a video idea above, or paste a link, and Reelbolt will draft the script, scenes, and narration for you."
            />
          ) : (
            <ProjectList projects={projects} onChanged={() => loadProjects(search || undefined)} />
          )}
        </section>
      </div>
      <BottomNav active="home" mostRecentProjectId={projects[0]?.id ?? null} />
    </AppShell>
  );
}
