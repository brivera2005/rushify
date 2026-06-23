"use client";

import Link from "next/link";
import { useState } from "react";

import { useStreamPrefetch } from "@/hooks/useStreamPrefetch";
import { buildPosterThumbUrl, buildPosterUrl } from "@/lib/jellyfin/images";
import { cn } from "@/lib/utils/cn";
import type { JellyfinMediaItem } from "@/types/jellyfin";

type MediaCardProps = {
  item: JellyfinMediaItem;
  showProgress?: boolean;
  className?: string;
  from?: string;
  compact?: boolean;
};

function buildMediaHref(item: JellyfinMediaItem, from?: string): string {
  const id = encodeURIComponent(item.id);
  const fromParam = from ? `?from=${encodeURIComponent(from)}` : "";

  if (item.kind === "Series") return `/shows/${id}${fromParam}`;
  return `/watch/${id}${fromParam}`;
}

export function MediaCard({ item, showProgress = false, className, from, compact = false }: MediaCardProps) {
  const posterUrl = buildPosterUrl(item, compact ? 180 : 200);
  const thumbUrl = buildPosterThumbUrl(item);
  const href = buildMediaHref(item, from ?? (showProgress ? "/" : undefined));
  const prefetchStream = useStreamPrefetch(item.id);
  const prefetch = item.kind === "Series" ? undefined : prefetchStream;
  const [imageLoaded, setImageLoaded] = useState(false);
  const progress =
    item.progressPercent != null ? Math.min(Math.max(item.progressPercent, 0), 100) : null;

  return (
    <Link
      href={href}
      tabIndex={0}
      onMouseEnter={prefetch}
      onFocus={prefetch}
      className={cn(
        "group block shrink-0 transition-transform duration-300 hover:scale-[1.03] focus:outline-none focus:ring-2 focus:ring-rush-accent/50 focus:ring-offset-2 focus:ring-offset-rush-canvas",
        className,
      )}
    >
      <div className="relative aspect-[2/3] overflow-hidden rounded-xl border border-rush-border/60 bg-rush-surface shadow-glow-sm">
        {thumbUrl && !imageLoaded && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={thumbUrl}
            alt=""
            aria-hidden
            className="absolute inset-0 h-full w-full scale-110 object-cover blur-xl brightness-75"
          />
        )}
        {posterUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={posterUrl}
            alt={item.name}
            loading="lazy"
            decoding="async"
            onLoad={() => setImageLoaded(true)}
            className={cn(
              "relative h-full w-full object-cover transition-all duration-300 group-hover:scale-105 group-hover:opacity-95",
              imageLoaded ? "opacity-100" : "opacity-0",
            )}
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-rush-accent/25 via-rush-surface to-rush-canvas p-4 text-center text-sm text-rush-muted">
            {item.name}
          </div>
        )}

        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 translate-y-2 p-3 opacity-0 transition-all duration-300 group-hover:translate-y-0 group-hover:opacity-100">
          <p className="line-clamp-2 text-xs font-medium text-white">{item.name}</p>
          {showProgress && progress != null && progress > 0 && (
            <p className="mt-1 text-[10px] text-white/70">{Math.round(progress)}% watched</p>
          )}
        </div>

        {showProgress && progress != null && progress > 0 && (
          <div className="absolute inset-x-0 bottom-0 h-1 bg-rush-canvas/80">
            <div className="h-full bg-rush-accent transition-all" style={{ width: `${progress}%` }} />
          </div>
        )}
      </div>
      <div className="mt-1.5 px-0.5">
        <p className={cn("truncate font-medium text-rush-foreground", compact ? "text-xs" : "text-sm")}>
          {item.name}
        </p>
        {item.year && (
          <p className={cn("text-rush-muted", compact ? "text-[10px]" : "text-xs")}>{item.year}</p>
        )}
      </div>
    </Link>
  );
}
