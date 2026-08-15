import { Link, Navigate } from 'react-router-dom';
import { Clapperboard, Film, ImageIcon, Mic2, Wand2, ArrowRight, Check, Zap, RefreshCw, Lock } from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { HeroPreview } from '../components/landing/HeroPreview';

const TRUST_POINTS = [
  { icon: Zap, label: 'Generates in minutes' },
  { icon: RefreshCw, label: 'Every AI model swappable' },
  { icon: Lock, label: 'Secure checkout with Paystack' },
];

const PIPELINE = [
  {
    icon: Film,
    title: 'Script',
    description:
      'A hook, introduction, chapters, conclusion, and call to action, written from one prompt and ready to edit.',
  },
  {
    icon: ImageIcon,
    title: 'Images',
    description: 'Every chapter becomes a scene with a matching AI generated visual. Regenerate any one individually.',
  },
  {
    icon: Mic2,
    title: 'Voice',
    description: 'Human like narration in a category you pick, not a model name, with speed, pitch, and tone control.',
  },
];

const FEATURES = [
  'One prompt drafts the full video package',
  'Edit script, regenerate any image, retune any voice line',
  'Every generation saved as a project you can revisit',
  'Download images and narration for your own edit',
];

const FREE_TIER = [
  'Script, image, and voice generation',
  'One image per scene',
  'Three narration styles',
  'Unlimited projects',
];

const PREMIUM_TIER = [
  'A stronger model for every script',
  'Multiple image variants per scene to choose from',
  'All seven narration styles, including expressive ones',
  'Cancel anytime',
];

export default function Landing() {
  const token = useAuthStore((s) => s.token);
  if (token) return <Navigate to="/dashboard" replace />;

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-30 border-b border-white/[0.06] bg-base/70 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-2.5">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-signal-gradient">
              <Clapperboard className="text-white" size={18} />
            </span>
            <span className="font-display text-[15px] font-semibold tracking-tight">Reelforge</span>
          </div>
          <nav className="hidden items-center gap-6 text-sm text-ink-muted md:flex">
            <a href="#pipeline" className="hover:text-ink">
              How it works
            </a>
            <a href="#pricing" className="hover:text-ink">
              Pricing
            </a>
          </nav>
          <div className="flex items-center gap-2">
            <Link to="/login" className="btn-ghost">
              Sign in
            </Link>
            <Link to="/register" className="btn-primary !px-4 !py-2 text-xs">
              Get started
            </Link>
          </div>
        </div>
      </header>

      <main>
        {/* Hero */}
        <section className="mx-auto max-w-4xl px-6 pb-24 pt-24 text-center animate-fade-up">
          <p className="label-eyebrow mb-4 inline-flex items-center gap-1.5 rounded-full glass px-3 py-1.5 text-signal-400">
            <Wand2 size={12} /> AI YouTube content studio
          </p>
          <h1 className="mx-auto max-w-3xl text-4xl font-semibold leading-[1.1] tracking-tight sm:text-6xl">
            One idea becomes a <span className="bg-signal-gradient bg-clip-text text-transparent">finished video package.</span>
          </h1>
          <p className="mx-auto mt-6 max-w-xl text-base text-ink-muted sm:text-lg">
            Type what your video is about. Reelforge drafts the script, generates scene by scene
            images, and narrates it in a human like voice, ready for you to edit and publish.
          </p>

          <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link to="/register" className="btn-primary !px-6 !py-3 text-sm">
              Start creating <ArrowRight size={15} />
            </Link>
            <Link to="/login" className="btn-secondary !px-6 !py-3 text-sm">
              Sign in
            </Link>
          </div>

          <div className="mt-8 flex flex-wrap items-center justify-center gap-x-6 gap-y-2">
            {TRUST_POINTS.map((point) => (
              <div key={point.label} className="flex items-center gap-1.5 text-xs text-ink-muted">
                <point.icon size={13} className="text-signal-400" />
                {point.label}
              </div>
            ))}
          </div>

          <HeroPreview />
        </section>

        {/* Pipeline */}
        <section id="pipeline" className="mx-auto max-w-6xl scroll-mt-24 px-6 pb-24">
          <div className="mb-10 text-center">
            <p className="label-eyebrow mb-2 text-signal-400">How it works</p>
            <h2 className="text-2xl font-semibold sm:text-3xl">Three steps, one prompt.</h2>
          </div>
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
            {PIPELINE.map((step, i) => (
              <div
                key={step.title}
                className="glass-card relative animate-fade-up overflow-hidden p-6"
                style={{ animationDelay: `${i * 80}ms` }}
              >
                <span className="pointer-events-none absolute -right-2 -top-4 font-display text-7xl font-semibold text-white/[0.04]">
                  0{i + 1}
                </span>
                <span className="relative mb-4 flex h-9 w-9 items-center justify-center rounded-lg bg-signal-500/15 text-signal-300">
                  <step.icon size={17} />
                </span>
                <h3 className="relative mb-1.5 text-base font-semibold">{step.title}</h3>
                <p className="relative text-sm leading-relaxed text-ink-muted">{step.description}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Feature list */}
        <section className="mx-auto max-w-4xl px-6 pb-24">
          <div className="glass-card grid grid-cols-1 gap-4 p-8 sm:grid-cols-2">
            {FEATURES.map((feature) => (
              <div key={feature} className="flex items-start gap-2.5">
                <span className="mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-success/15 text-success">
                  <Check size={12} />
                </span>
                <span className="text-sm text-ink/90">{feature}</span>
              </div>
            ))}
          </div>
        </section>

        {/* Pricing */}
        <section id="pricing" className="mx-auto max-w-4xl scroll-mt-24 px-6 pb-28">
          <div className="mb-4 text-center">
            <p className="label-eyebrow mb-2 text-signal-400">Pricing</p>
            <h2 className="text-2xl font-semibold sm:text-3xl">Start free, upgrade if you need more.</h2>
          </div>
          <p className="mx-auto mb-10 max-w-md text-center text-sm text-ink-muted">
            Every new account gets a 30 day trial of premium quality generation, no card required.
          </p>

          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <div className="glass-card p-7">
              <h3 className="mb-1 text-base font-semibold">Free</h3>
              <p className="mb-5 text-2xl font-semibold">$0</p>
              <div className="space-y-2.5">
                {FREE_TIER.map((item) => (
                  <div key={item} className="flex items-start gap-2.5 text-sm text-ink-muted">
                    <Check size={14} className="mt-0.5 flex-shrink-0 text-ink-faint" />
                    {item}
                  </div>
                ))}
              </div>
            </div>

            <div className="glass-card relative overflow-hidden border-signal-500/30 p-7">
              <span className="absolute right-5 top-5 rounded-full bg-signal-gradient px-2.5 py-1 text-[10px] font-semibold text-white">
                Recommended
              </span>
              <h3 className="mb-1 text-base font-semibold">Premium</h3>
              <p className="mb-5 text-2xl font-semibold">
                $10 <span className="text-sm font-normal text-ink-muted">per month</span>
              </p>
              <div className="space-y-2.5">
                {PREMIUM_TIER.map((item) => (
                  <div key={item} className="flex items-start gap-2.5 text-sm text-ink/90">
                    <Check size={14} className="mt-0.5 flex-shrink-0 text-signal-400" />
                    {item}
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="mt-10 text-center">
            <Link to="/register" className="btn-primary !px-6 !py-3 text-sm">
              Create your first project <ArrowRight size={15} />
            </Link>
          </div>
        </section>
      </main>

      <footer className="border-t border-white/[0.06] px-6 py-8">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 text-xs text-ink-faint sm:flex-row">
          <span>© {new Date().getFullYear()} Reelforge</span>
          <div className="flex items-center gap-5">
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
          <div className="flex items-center gap-2.5">
            <span className="flex h-5 w-5 items-center justify-center rounded bg-signal-gradient">
              <Clapperboard className="text-white" size={11} />
            </span>
            <span>Reelforge</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
