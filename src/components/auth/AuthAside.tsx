/** Artwork panel for the sign in and sign up pages. Desktop only. The images are placeholders in /public/art. */
export function AuthAside({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <aside className="relative hidden overflow-hidden border-r border-white/[0.06] lg:block">
      <img src="/art/studio-hero.svg" alt="" className="absolute inset-0 h-full w-full object-cover" />
      <div className="absolute inset-0 bg-gradient-to-t from-base via-base/50 to-base/10" />
      <div className="absolute inset-x-0 bottom-0 p-14">
        <p className="label-eyebrow mb-4 text-signal-300">Reelbolt</p>
        <h2 className="max-w-xl text-4xl font-semibold leading-tight xl:text-5xl">{title}</h2>
        <p className="mt-5 max-w-md text-base leading-relaxed text-ink-muted">{subtitle}</p>
      </div>
    </aside>
  );
}
