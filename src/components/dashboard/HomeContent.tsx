"use client";

import { useQuery } from "@tanstack/react-query";

import { MediaRow } from "@/components/media/MediaRow";
import type { JellyfinMediaItem, LibrarySection } from "@/types/jellyfin";

class LibrarySectionError extends Error {
  offline: boolean;

  constructor(message: string, offline: boolean) {
    super(message);
    this.offline = offline;
  }
}

async function fetchSection(section: LibrarySection): Promise<JellyfinMediaItem[]> {
  const response = await fetch(`/api/library/items?section=${section}`, {
    credentials: "include",
  });
  const data = (await response.json()) as { items?: JellyfinMediaItem[]; error?: string };

  if (!response.ok) {
    const offline = response.status === 503 || data.error === "Media server offline";
    throw new LibrarySectionError(data.error ?? "Failed to load library", offline);
  }

  return data.items ?? [];
}

export function HomeContent() {
  const resume = useQuery({
    queryKey: ["library", "resume"],
    queryFn: () => fetchSection("resume"),
    retry: 1,
    staleTime: 60_000,
  });
  const recentMovies = useQuery({
    queryKey: ["library", "recent-movies"],
    queryFn: () => fetchSection("recent-movies"),
    retry: 1,
    staleTime: 60_000,
  });
  const recentShows = useQuery({
    queryKey: ["library", "recent-shows"],
    queryFn: () => fetchSection("recent-shows"),
    retry: 1,
    staleTime: 60_000,
  });

  const loading = resume.isLoading || recentMovies.isLoading || recentShows.isLoading;
  const firstError = resume.error ?? recentMovies.error ?? recentShows.error;

  if (loading) {
    return (
      <div className="space-y-10">
        {[1, 2, 3].map((i) => (
          <div key={i} className="space-y-4">
            <div className="h-6 w-48 animate-pulse rounded-lg bg-rush-surface" />
            <div className="flex gap-4">
              {[1, 2, 3, 4, 5].map((j) => (
                <div
                  key={j}
                  className="h-56 w-36 shrink-0 animate-pulse rounded-xl bg-rush-surface"
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (firstError instanceof LibrarySectionError && firstError.offline) {
    return (
      <div className="rounded-2xl border border-amber-400/30 bg-amber-400/10 px-6 py-12 text-center text-sm text-amber-100/90">
        Movies and shows are temporarily unavailable. Check your media server settings in{" "}
        <code className="text-xs">.env.local</code> and ensure{" "}
        <code className="text-xs">JELLYFIN_SERVER_URL</code> and{" "}
        <code className="text-xs">JELLYFIN_API_KEY</code> are set.
      </div>
    );
  }

  if (firstError instanceof LibrarySectionError) {
    return (
      <div className="rounded-2xl border border-red-400/30 bg-red-400/10 px-6 py-12 text-center text-sm text-red-200">
        Could not load your library. {firstError.message}
      </div>
    );
  }

  return (
    <div className="space-y-10">
      <MediaRow
        title="Continue Watching"
        items={resume.data ?? []}
        showProgress
        href="/movies"
        emptyMessage="Start watching something. It'll show up here."
      />
      <MediaRow
        title="Recently Added Movies"
        items={recentMovies.data ?? []}
        href="/movies"
        emptyMessage="New movies will appear here as they're added."
      />
      <MediaRow
        title="Recently Added Shows"
        items={recentShows.data ?? []}
        href="/shows"
        emptyMessage="New shows will appear here as they're added."
      />
    </div>
  );
}
