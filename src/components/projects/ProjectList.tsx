import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Copy, MoreHorizontal, Pencil, Trash2 } from 'lucide-react';
import { Project } from '../../lib/types';
import { StatusPill } from '../ui/Primitives';
import { api } from '../../lib/api';

interface Props {
  projects: Project[];
  onChanged: () => void;
}

export function ProjectList({ projects, onChanged }: Props) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {projects.map((project, i) => (
        <ProjectCard key={project.id} project={project} onChanged={onChanged} delayMs={i * 40} />
      ))}
    </div>
  );
}

function ProjectCard({ project, onChanged, delayMs }: { project: Project; onChanged: () => void; delayMs: number }) {
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  async function handleDuplicate() {
    setBusy(true);
    try {
      await api.projects.duplicate(project.id);
      onChanged();
    } finally {
      setBusy(false);
      setMenuOpen(false);
    }
  }

  async function handleRename() {
    const title = window.prompt('Rename project', project.title);
    if (!title) return;
    setBusy(true);
    try {
      await api.projects.rename(project.id, title);
      onChanged();
    } finally {
      setBusy(false);
      setMenuOpen(false);
    }
  }

  async function handleDelete() {
    if (!window.confirm(`Delete "${project.title}"? This can't be undone.`)) return;
    setBusy(true);
    try {
      await api.projects.remove(project.id);
      onChanged();
    } finally {
      setBusy(false);
      setMenuOpen(false);
    }
  }

  return (
    <div
      className="group relative animate-fade-up cursor-pointer glass-card p-5 transition-transform hover:-translate-y-0.5"
      style={{ animationDelay: `${delayMs}ms` }}
      onClick={() => navigate(`/projects/${project.id}`)}
    >
      <div className="mb-3 flex items-start justify-between gap-2">
        <StatusPill status={project.status} />
        <div className="relative">
          <button
            className="rounded-full p-1.5 text-ink-faint opacity-0 transition-opacity hover:bg-white/[0.06] hover:text-ink group-hover:opacity-100"
            onClick={(e) => {
              e.stopPropagation();
              setMenuOpen((v) => !v);
            }}
            disabled={busy}
          >
            <MoreHorizontal size={16} />
          </button>
          {menuOpen && (
            <div
              className="absolute right-0 top-8 z-10 w-40 overflow-hidden rounded-xl border border-white/[0.08] bg-base-elevated py-1 shadow-card"
              onClick={(e) => e.stopPropagation()}
            >
              <button onClick={handleRename} className="flex w-full items-center gap-2 px-3 py-2 text-xs text-ink hover:bg-white/[0.06]">
                <Pencil size={13} /> Rename
              </button>
              <button onClick={handleDuplicate} className="flex w-full items-center gap-2 px-3 py-2 text-xs text-ink hover:bg-white/[0.06]">
                <Copy size={13} /> Duplicate
              </button>
              <button onClick={handleDelete} className="flex w-full items-center gap-2 px-3 py-2 text-xs text-ember-400 hover:bg-white/[0.06]">
                <Trash2 size={13} /> Delete
              </button>
            </div>
          )}
        </div>
      </div>

      <h3 className="mb-1.5 line-clamp-2 text-[15px] font-semibold leading-snug text-ink">{project.title}</h3>
      <p className="line-clamp-2 text-xs text-ink-muted">{project.prompt}</p>

      <p className="mt-4 text-[11px] text-ink-faint">
        Updated {new Date(project.updated_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
      </p>
    </div>
  );
}
