import { Card, CardDescription, CardTitle } from "@/components/ui/Card";

export default function LiveTvPage() {
  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm uppercase tracking-[0.35em] text-rush-accent">Live TV</p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight">Channels & guide</h1>
        <p className="mt-2 max-w-2xl text-rush-muted">
          IPTV channel listings and EPG data will load through cached server routes.
          Parsing runs in the background to keep the UI responsive.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card glow>
          <CardTitle>Channel lineup</CardTitle>
          <CardDescription>
            M3U ingestion skeleton with stale-while-revalidate caching.
          </CardDescription>
          <div className="mt-5 space-y-3">
            {["Global News", "Premier Sports", "Cinema Plus"].map((channel) => (
              <div
                key={channel}
                className="rounded-xl border border-rush-border bg-rush-canvas/60 px-4 py-3 text-sm"
              >
                {channel}
              </div>
            ))}
          </div>
        </Card>

        <Card>
          <CardTitle>Program guide</CardTitle>
          <CardDescription>
            XMLTV EPG snapshots served from `/api/iptv/epg`.
          </CardDescription>
          <div className="mt-5 space-y-3">
            {["Now: Evening headlines", "Next: Matchday live", "Later: Late night cinema"].map(
              (slot) => (
                <div
                  key={slot}
                  className="rounded-xl border border-rush-border bg-rush-canvas/60 px-4 py-3 text-sm text-rush-muted"
                >
                  {slot}
                </div>
              ),
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
