import { Link, Navigate } from 'react-router-dom';
import { Clapperboard, Film, ImageIcon, Mic2, Wand2, ArrowRight, Check, Zap, RefreshCw, Lock } from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { HeroPreview } from '../components/landing/HeroPreview';

const TRUST_POINTS = [
  { icon: Zap, label: 'Generates in minutes' },
  { icon: RefreshCw, label: 'Every AI model swappable' },
  { icon: Lock, label: 'Secure checkout' },
];

const PIPELINE = [
  { icon: Film, title: 'Script', description: 'A hook, introduction, chapters, conclusion, and call to action, written from one prompt and ready to edit.' },
  { icon: ImageIcon, title: 'Images', description: 'Every chapter becomes a scene with a matching AI generated visual. Regenerate any one individually.' },
  { icon: Mic2, title: 'Voice', description: 'Natural narration in a style you pick, with speed, pitch, and tone control.' },
];

const FEATURES = [
  'One prompt drafts the full video package',
  'Edit the script, regenerate any image, retune any voice line',
  'Every generation saved as a project you can revisit',
  'Download images and narration for your own edit',
];

const FREE_TIER = ['Script, image, and voice generation', 'One image per scene', 'Three narration styles', 'Unlimited projects'];
const PREMIUM_TIER = ['A stronger model for every script', 'Multiple image variants per scene', 'All seven narration styles', 'Cancel anytime'];

export default function Landing() {
  const token = useAuthStore((s) => s.token);
  if (token) return <Navigate to="/dashboard" replace />;

  return (
    <div className="min-h-screen w-full">
      <header className="sticky top-0 z-30 w-full border-b border-white/[0.06] bg-base/70 backdrop-blur-xl">
        <div className="flex w-full items-center justify-between px-6 py-4 lg:px-12">
          <div className="flex items-center gap-2.5">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-signal-gradient">
              <Clapperboard className="text-white" size={18} />
            </span>
            <span className="font-display text-[15px] font-semibold tracking-tight">Reelbolt</span>
          </div>
          <nav className="hidden items-center gap-8 text-sm text-ink-muted md:flex">
            <a href="#pipeline" className="hover:text-ink">How it works</a>
            <a href="#pricing" className="hover:text-ink">Pricing</a>
          </nav>
          <div className="flex items-center gap-2">
            <Link to="/login" className="btn-ghost">Sign in</Link>
            <Link to="/register" className="btn-primary !px-4 !py-2 text-xs">Get started</Link>
          </div>
        </div>
      </header>

      <main>
        {/* Hero: full viewport height, text left, live preview right on desktop */}
        <section className="mx-auto grid min-h-[calc(100vh-73px)] w-full max-w-[1600px] items-center gap-14 px-6 py-16 lg:grid-cols-2 lg:gap-20 lg:px-12">
          <div className="animate-fade-up">
            <p className="label-eyebrow mb-5 inline-flex items-center gap-1.5 rounded-full glass px-3 py-1.5 text-signal-400">
              <Wand2 size={12} /> AI YouTube content studio
            </p>
            <h1 className="text-4xl font-semibold leading-[1.08] tracking-tight sm:text-5xl xl:text-7xl">
              One idea becomes a <span className="bg-signal-gradient bg-clip-text text-transparent">finished video package.</span>
            </h1>
            <p className="mt-7 max-w-xl text-base text-ink-muted lg:text-lg">
              Type what your video is about. Reelbolt drafts the script, generates scene by scene images, and narrates it in a natural voice, ready for you to edit and publish.
            </p>
            <div className="mt-10 flex flex-col gap-3 sm:flex-row">
              <Link to="/register" className="btn-primary !px-7 !py-3.5 text-sm">
                Start creating <ArrowRight size={15} />
              </Link>
              <Link to="/login" className="btn-secondary !px-7 !py-3.5 text-sm">Sign in</Link>
            </div>
            <div className="mt-9 flex flex-wrap gap-x-7 gap-y-2">
              {TRUST_POINTS.map((point) => (
                <div key={point.label} className="flex items-center gap-1.5 text-xs text-ink-muted">
                  <point.icon size={13} className="text-signal-400" />
                  {point.label}
                </div>
              ))}
            </div>
          </div>

          <div className="w-full">
            <div className="relative">
              <img src="/art/scene-orbit.svg" alt="" className="pointer-events-none absolute -inset-10 h-[calc(100%+5rem)] w-[calc(100%+5rem)] rounded-3xl object-cover opacity-30" />
              <div className="relative">
                <HeroPreview />
              </div>
            </div>
          </div>
        </section>

        {/* Pipeline */}
        <section id="pipeline" className="mx-auto w-full max-w-[1600px] scroll-mt-24 px-6 py-24 lg:px-12">
          <div className="mb-12 text-center">
            <p className="label-eyebrow mb-3 text-signal-400">How it works</p>
            <h2 className="text-3xl font-semibold lg:text-4xl">One prompt in. A finished package out.</h2>
          </div>
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            {PIPELINE.map((step, i) => (
              <div key={step.title} className="glass-card relative overflow-hidden p-8">
                <span className="pointer-events-none absolute -right-2 -top-6 font-display text-8xl font-semibold text-white/[0.04]">0{i + 1}</span>
                <span className="relative mb-5 flex h-10 w-10 items-center justify-center rounded-lg bg-signal-500/15 text-signal-300">
                  <step.icon size={18} />
                </span>
                <h3 className="relative mb-2 text-lg font-semibold">{step.title}</h3>
                <p className="relative text-sm leading-relaxed text-ink-muted">{step.description}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Features */}
        <section className="mx-auto w-full max-w-[1600px] px-6 pb-24 lg:px-12">
          <div className="glass-card grid grid-cols-1 gap-6 p-10 md:grid-cols-2 lg:p-14">
            {FEATURES.map((feature) => (
              <div key={feature} className="flex items-start gap-3">
                <span className="mt-0.5 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-success/15 text-success">
                  <Check size={13} />
                </span>
                <span className="text-base text-ink/90">{feature}</span>
              </div>
            ))}
          </div>
        </section>

        {/* Pricing */}
        <section id="pricing" className="mx-auto w-full max-w-[1600px] scroll-mt-24 px-6 pb-32 lg:px-12">
          <div className="mb-12 text-center">
            <p className="label-eyebrow mb-3 text-signal-400">Pricing</p>
            <h2 className="text-3xl font-semibold lg:text-4xl">Start free, upgrade if you need more.</h2>
            <p className="mx-auto mt-4 max-w-md text-sm text-ink-muted">Every new account gets a 30 day trial of premium quality generation, no card required.</p>
          </div>
          <div className="mx-auto grid max-w-5xl grid-cols-1 gap-6 md:grid-cols-2">
            <div className="glass-card p-9">
              <h3 className="mb-1 text-lg font-semibold">Free</h3>
              <p className="mb-7 text-4xl font-semibold">$0</p>
              <div className="space-y-3.5">
                {FREE_TIER.map((item) => (
                  <div key={item} className="flex items-start gap-3 text-sm text-ink-muted">
                    <Check size={15} className="mt-0.5 flex-shrink-0 text-ink-faint" />
                    {item}
                  </div>
                ))}
              </div>
            </div>
            <div className="glass-card relative overflow-hidden border-signal-500/30 p-9">
              <span className="absolute right-6 top-6 rounded-full bg-signal-gradient px-3 py-1 text-[11px] font-semibold text-white">Recommended</span>
              <h3 className="mb-1 text-lg font-semibold">Premium</h3>
              <p className="mb-7 text-4xl font-semibold">
                $10 <span className="text-base font-normal text-ink-muted">per month</span>
              </p>
              <div className="space-y-3.5">
                {PREMIUM_TIER.map((item) => (
                  <div key={item} className="flex items-start gap-3 text-sm text-ink/90">
                    <Check size={15} className="mt-0.5 flex-shrink-0 text-signal-400" />
                    {item}
                  </div>
                ))}
              </div>
            </div>
          </div>
          <div className="mt-12 text-center">
            <Link to="/register" className="btn-primary !px-7 !py-3.5 text-sm">
              Create your first project <ArrowRight size={15} />
            </Link>
          </div>
        </section>
      </main>

      <footer className="w-full border-t border-white/[0.06] px-6 py-8 lg:px-12">
        <div className="flex w-full flex-col items-center justify-between gap-4 text-xs text-ink-faint sm:flex-row">
          <span>© {new Date().getFullYear()} Reelbolt</span>
          <div className="flex items-center gap-6">
            <Link to="/terms" className="hover:text-ink">Terms</Link>
            <Link to="/privacy" className="hover:text-ink">Privacy</Link>
            <Link to="/cookies" className="hover:text-ink">Cookies</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
