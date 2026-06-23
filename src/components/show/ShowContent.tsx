"use client";

import Link from "next/link";

import { useStreamPrefetch } from "@/hooks/useStreamPrefetch";
import { buildPosterUrl } from "@/lib/jellyfin/images";
import type { JellyfinMediaItem } from "@/types/jellyfin";

type ShowContentProps = {
  series: JellyfinMediaItem;
  episodes: JellyfinMediaItem[];
};

function EpisodeRow({
  episode,
  seriesId,
  label,
}: {
  episode: JellyfinMediaItem;
  seriesId: string;
  label: string;
}) {
  const prefetch = useStreamPrefetch(episode.id);

  return (
    <li>
      <Link
        href={`/watch/${encodeURIComponent(episode.id)}?from=${encodeURIComponent(`/shows/${seriesId}`)}`}
        onMouseEnter={prefetch}
        onFocus={prefetch}
        className="flex items-center gap-4 px-4 py-3 transition-colors hover:bg-rush-surface/80"
      >
        <span className="min-w-0 flex-1 truncate text-sm font-medium text-rush-foreground">
          {label}
        </span>
        <span className="shrink-0 text-xs text-rush-accent">Watch</span>
      </Link>
    </li>
  );
}

function formatEpisodeLabel(episode: JellyfinMediaItem): string {
  const season = episode.seasonNumber != null ? `S${episode.seasonNumber}` : null;
  const number = episode.episodeNumber != null ? `E${episode.episodeNumber}` : null;
  const prefix = [season, number].filter(Boolean).join("");
  return prefix ? `${prefix} · ${episode.name}` : episode.name;
}

export function ShowContent({ series, episodes }: ShowContentProps) {
  const posterUrl = buildPosterUrl(series, 640);

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-6 sm:flex-row">
        <div className="mx-auto aspect-[2/3] w-40 shrink-0 overflow-hidden rounded-xl border border-rush-border/60 bg-rush-surface sm:mx-0 sm:w-48">
          {posterUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={posterUrl} alt={series.name} className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full w-full items-center justify-center p-4 text-center text-sm text-rush-muted">
              {series.name}
            </div>
          )}
        </div>

        <div className="min-w-0 flex-1">
          <Link href="/shows" className="text-sm text-rush-muted hover:text-rush-foreground">
            ← Back to shows
          </Link>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight">{series.name}</h1>
          <div className="mt-2 flex flex-wrap items-center gap-3 text-sm text-rush-muted">
            {series.year && <span>{series.year}</span>}
            <span className="rounded-full border border-rush-border px-3 py-0.5">Series</span>
            {episodes.length > 0 && (
              <span>
                {episodes.length} episode{episodes.length === 1 ? "" : "s"}
              </span>
            )}
          </div>
          {series.overview && (
            <p className="mt-4 max-w-3xl leading-7 text-rush-muted">{series.overview}</p>
          )}
        </div>
      </div>

      {episodes.length === 0 ? (
        <div className="rounded-2xl border border-rush-border bg-rush-surface/50 px-6 py-12 text-center text-sm text-rush-muted">
          No episodes found for this show.
        </div>
      ) : (
        <section className="space-y-3">
          <h2 className="text-lg font-semibold tracking-tight">Episodes</h2>
          <ul className="divide-y divide-rush-border/60 overflow-hidden rounded-2xl border border-rush-border/60 bg-rush-surface/40">
            {episodes.map((episode) => (
              <EpisodeRow
                key={episode.id}
                episode={episode}
                seriesId={series.id}
                label={formatEpisodeLabel(episode)}
              />
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
