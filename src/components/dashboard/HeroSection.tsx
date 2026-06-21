import { Button } from "@/components/ui/Button";

export function HeroSection() {
  return (
    <section className="relative overflow-hidden rounded-2xl border border-border bg-gradient-to-br from-surface via-background to-surface-elevated p-6 sm:p-10">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(245,158,11,0.12),transparent_55%)]" />
      <div className="relative max-w-2xl space-y-4">
        <p className="text-xs uppercase tracking-[0.25em] text-accent">
          Your unified media hub
        </p>
        <h2 className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
          Stream everything in one cinematic dashboard
        </h2>
        <p className="text-sm leading-relaxed text-muted sm:text-base">
          Rushify brings live channels and your personal library together with a
          premium, white-label experience — fast, focused, and built for your
          home server.
        </p>
        <div className="flex flex-wrap gap-3 pt-2">
          <Button>Explore Live TV</Button>
          <Button variant="secondary">Browse Library</Button>
        </div>
      </div>
    </section>
  );
}
