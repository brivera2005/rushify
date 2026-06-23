"use client";

import { useQuery } from "@tanstack/react-query";

import { MediaGrid } from "@/components/media/MediaGrid";
import type { JellyfinMediaItem } from "@/types/jellyfin";

class LibraryLoadError extends Error {
  offline: boolean;

  constructor(message: string, offline: boolean) {
    super(message);
    this.offline = offline;
  }
}

async function fetchLibrary(): Promise<JellyfinMediaItem[]> {
  const response = await fetch("/api/library/items?section=all");
  const data = (await response.json()) as { items?: JellyfinMediaItem[]; error?: string };

  if (!response.ok) {
    const offline = response.status === 503 || data.error === "Media server offline";
    throw new LibraryLoadError(data.error ?? "Failed to load library", offline);
  }

  return data.items ?? [];
}

export function LibraryContent() {
  const { data, isLoading, error } = useQuery({
    queryKey: ["library", "all"],
    queryFn: fetchLibrary,
  });

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
        {Array.from({ length: 12 }).map((_, i) => (
          <div key={i} className="space-y-2">
            <div className="aspect-[2/3] animate-pulse rounded-xl bg-rush-surface" />
            <div className="h-4 animate-pulse rounded bg-rush-surface" />
          </div>
        ))}
      </div>
    );
  }

  if (error instanceof LibraryLoadError && error.offline) {
    return (
      <div className="rounded-2xl border border-amber-400/30 bg-amber-400/10 px-6 py-12 text-center text-sm text-amber-100/90">
        Movies and shows are temporarily unavailable. Live TV is still available from the sidebar.
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-2xl border border-red-400/30 bg-red-400/10 px-6 py-12 text-center text-sm text-red-200">
        Could not load your library. Try signing in again.
      </div>
    );
  }

  return <MediaGrid items={data ?? []} />;
}
