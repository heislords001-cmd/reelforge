import { PropsWithChildren } from 'react';
import { Link } from 'react-router-dom';
import { Clapperboard } from 'lucide-react';

export function LegalLayout({ title, updated, children }: PropsWithChildren<{ title: string; updated: string }>) {
  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-30 border-b border-white/[0.06] bg-base/70 backdrop-blur-xl">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-6 py-4">
          <Link to="/" className="flex items-center gap-2.5">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-signal-gradient">
              <Clapperboard className="text-white" size={18} />
            </span>
            <span className="font-display text-[15px] font-semibold tracking-tight">Reelforge</span>
          </Link>
          <Link to="/" className="btn-ghost">
            Back home
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-6 py-16">
        <p className="label-eyebrow mb-3 text-signal-400">Legal</p>
        <h1 className="mb-2 text-3xl font-semibold tracking-tight">{title}</h1>
        <p className="mb-12 text-sm text-ink-faint">Last updated {updated}</p>

        <div className="legal-prose space-y-8">{children}</div>
      </main>

      <footer className="border-t border-white/[0.06] px-6 py-8">
        <div className="mx-auto flex max-w-3xl items-center justify-between text-xs text-ink-faint">
          <span>© {new Date().getFullYear()} Reelforge</span>
          <div className="flex gap-4">
            <Link to="/terms" className="hover:text-ink">
              Terms
            </Link>
            <Link to="/privacy" className="hover:text-ink">
              Privacy
            </Link>
            <Link to="/cookies" className="hover:text-ink">
              Cookies
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}

export function LegalSection({ title, children }: PropsWithChildren<{ title: string }>) {
  return (
    <section>
      <h2 className="mb-3 text-lg font-semibold text-ink">{title}</h2>
      <div className="space-y-3 text-sm leading-relaxed text-ink-muted">{children}</div>
    </section>
  );
}
