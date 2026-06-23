import { Button } from "@/components/ui/Button";

export function HeroSection() {
  return (
    <section className="relative overflow-hidden rounded-2xl border border-rush-border bg-hero-glow p-6 sm:p-10 shadow-glow">
      <div className="relative max-w-2xl space-y-4">
        <p className="text-xs uppercase tracking-[0.25em] text-brand-gradient font-display font-semibold">
          Your unified media hub
        </p>
        <h2 className="font-display text-3xl font-semibold tracking-tight text-rush-foreground sm:text-4xl">
          Watch everything in one cinematic dashboard
        </h2>
        <p className="text-sm leading-relaxed text-rush-muted sm:text-base">
          Rushify brings live channels and your personal library together in one polished media
          service. Fast, focused, and designed for authorized subscribers.
        </p>
        <div className="flex flex-wrap gap-3 pt-2">
          <Button>Explore Live TV</Button>
          <Button variant="secondary">Browse Library</Button>
        </div>
      </div>
    </section>
  );
}
