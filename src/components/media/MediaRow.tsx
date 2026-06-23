"use client";

import Link from "next/link";

import { MediaCard } from "@/components/media/MediaCard";
import type { JellyfinMediaItem } from "@/types/jellyfin";

type MediaRowProps = {
  title: string;
  items: JellyfinMediaItem[];
  showProgress?: boolean;
  href?: string;
  emptyMessage?: string;
};

export function MediaRow({
  title,
  items,
  showProgress = false,
  href,
  emptyMessage = "Nothing here yet",
}: MediaRowProps) {
  return (
    <section className="space-y-4">
      <div className="flex items-end justify-between gap-4">
        <h2 className="text-xl font-semibold tracking-tight text-rush-foreground">{title}</h2>
        {href && items.length > 0 && (
          <Link href={href} className="text-sm font-medium text-rush-accent hover:text-rush-accent/80">
            See all
          </Link>
        )}
      </div>
      {items.length === 0 ? (
        <p className="text-sm text-rush-muted">{emptyMessage}</p>
      ) : (
        <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-thin">
          {items.map((item) => (
            <MediaCard
              key={item.id}
              item={item}
              showProgress={showProgress}
              className="w-28 sm:w-32"
              from="/"
            />
          ))}
        </div>
      )}
    </section>
  );
}
