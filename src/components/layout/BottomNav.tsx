import { useNavigate } from 'react-router-dom';
import { Film, Home, ImageIcon, Mic2, Video } from 'lucide-react';
import clsx from 'clsx';
import { useState } from 'react';

export type NavTab = 'home' | 'script' | 'video' | 'audio' | 'render';

interface BottomNavProps {
  active: NavTab;
  onTabChange?: (tab: Exclude<NavTab, 'home'>) => void;
  mostRecentProjectId?: string | null;
}

const ITEMS: { id: Exclude<NavTab, 'home'>; label: string; icon: typeof Film }[] = [
  { id: 'script', label: 'Script', icon: Film },
  { id: 'video', label: 'Video', icon: ImageIcon },
  { id: 'audio', label: 'Audio', icon: Mic2 },
  { id: 'render', label: 'Render', icon: Video },
];

export function BottomNav({ active, onTabChange, mostRecentProjectId }: BottomNavProps) {
  const navigate = useNavigate();
  const [notice, setNotice] = useState<string | null>(null);

  function handleTap(tab: Exclude<NavTab, 'home'>) {
    if (onTabChange) { onTabChange(tab); return; }
    if (mostRecentProjectId) { navigate(`/projects/${mostRecentProjectId}?tab=${tab}`); return; }
    setNotice('Start a project first');
    setTimeout(() => setNotice(null), 2000);
  }

  return (
    <nav className="fixed inset-x-0 bottom-0 z-30 flex justify-center border-t border-white/[0.08] bg-base/90 px-4 pb-[max(10px,env(safe-area-inset-bottom))] pt-2.5 backdrop-blur-xl">
      {notice && (
        <span className="absolute -top-9 rounded-full bg-base-elevated px-3 py-1.5 text-[11px] text-ink shadow-card">
          {notice}
        </span>
      )}
      <div className="flex w-full max-w-md justify-around">
        <button
          onClick={() => navigate('/dashboard')}
          className={clsx('flex w-16 flex-col items-center gap-1 border-none bg-transparent text-[10.5px] font-medium', active === 'home' ? 'text-signal-300' : 'text-ink-faint')}
        >
          <Home size={20} className={clsx(active === 'home' && 'drop-shadow-[0_0_6px_rgba(126,107,196,0.7)]')} />
          Home
        </button>
        {ITEMS.map((item) => (
          <button
            key={item.id}
            onClick={() => handleTap(item.id)}
            className={clsx('flex w-16 flex-col items-center gap-1 border-none bg-transparent text-[10.5px] font-medium', active === item.id ? 'text-signal-300' : 'text-ink-faint')}
          >
            <item.icon size={20} className={clsx(active === item.id && 'drop-shadow-[0_0_6px_rgba(126,107,196,0.7)]')} />
            {item.label}
          </button>
        ))}
      </div>
    </nav>
  );
}
