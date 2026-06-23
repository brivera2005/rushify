"use client";

import { MediaCard } from "@/components/media/MediaCard";
import type { JellyfinMediaItem } from "@/types/jellyfin";
import { cn } from "@/lib/utils/cn";

type MediaGridProps = {
  items: JellyfinMediaItem[];
  emptyMessage?: string;
  section?: "movies" | "shows";
  compact?: boolean;
};

export function MediaGrid({
  items,
  emptyMessage = "Your library is empty",
  section,
  compact = false,
}: MediaGridProps) {
  const from = section ? `/${section}` : undefined;

  if (items.length === 0) {
    return (
      <div className="rounded-2xl border border-rush-border bg-rush-surface/50 px-6 py-16 text-center">
        <p className="text-rush-muted">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "grid gap-3",
        compact
          ? "grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-7 xl:grid-cols-8"
          : "grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-7 xl:grid-cols-8",
      )}
    >
      {items.map((item) => (
        <MediaCard
          key={item.id}
          item={item}
          from={from}
          compact={compact}
        />
      ))}
    </div>
  );
}
