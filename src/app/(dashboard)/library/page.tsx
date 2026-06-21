import { Card, CardDescription, CardTitle } from "@/components/ui/Card";

export default function LibraryPage() {
  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm uppercase tracking-[0.35em] text-rush-accent">Library</p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight">Movies, series, and more</h1>
        <p className="mt-2 max-w-2xl text-rush-muted">
          Your personal media library will appear here via the server-side BFF proxy.
          Playback routes will stream through Rushify without exposing upstream credentials.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {[
          "Neon Horizon",
          "Midnight Circuit",
          "Atlas Falls",
          "Silver Archive",
          "Northern Lights",
          "Echo Station",
        ].map((title) => (
          <Card key={title}>
            <div className="mb-4 aspect-[16/10] rounded-xl bg-gradient-to-br from-rush-accent/30 via-rush-surface to-rush-canvas" />
            <CardTitle>{title}</CardTitle>
            <CardDescription>Library item placeholder</CardDescription>
          </Card>
        ))}
      </div>
    </div>
  );
}
