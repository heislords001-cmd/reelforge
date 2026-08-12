import { PropsWithChildren } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Clapperboard, LogOut, Sparkles } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';

export function AppShell({ children }: PropsWithChildren) {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-30 border-b border-white/[0.06] bg-base/70 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <Link to="/dashboard" className="flex items-center gap-2.5">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-signal-gradient">
              <Clapperboard className="h-4.5 w-4.5 text-white" size={18} />
            </span>
            <span className="font-display text-[15px] font-semibold tracking-tight">Reelforge</span>
          </Link>

          <div className="flex items-center gap-3">
            <div className="hidden items-center gap-1.5 rounded-full glass px-3 py-1.5 text-xs text-ink-muted sm:flex">
              <Sparkles size={13} className="text-signal-400" />
              {user?.name}
            </div>
            <button
              className="btn-ghost"
              onClick={() => {
                logout();
                navigate('/login');
              }}
            >
              <LogOut size={14} />
              Sign out
            </button>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-7xl px-6 py-10">{children}</main>
    </div>
  );
}
