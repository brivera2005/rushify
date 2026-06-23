"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { CastButton } from "@/components/cast/CastButton";
import { CastIndicator } from "@/components/cast/CastIndicator";
import { useCastOptional } from "@/components/cast/CastProvider";
import { RushifyLogo } from "@/components/layout/RushifyLogo";
import { QualitySelector } from "@/components/player/QualitySelector";
import { RushifyPlayer, type PlaybackInfo } from "@/components/player/RushifyPlayer";
import { detectClientCapabilities } from "@/lib/jellyfin/client-capabilities";
import {
  buildBackdropUrl,
  buildPosterUrl,
  formatPlaybackStatus,
  resolvePlaybackUrls,
} from "@/lib/jellyfin/images";
import type { StreamQuality } from "@/lib/jellyfin/stream";
import type { JellyfinMediaItem } from "@/types/jellyfin";

type WatchPlayerProps = {
  item: JellyfinMediaItem;
};

function resolveBackHref(from: string | null): string {
  if (!from) return "/";
  if (from.startsWith("/")) return from;
  return "/";
}

export function WatchPlayer({ item }: WatchPlayerProps) {
  const searchParams = useSearchParams();
  const from = searchParams.get("from");
  const backHref = resolveBackHref(from);
  const [quality, setQuality] = useState<StreamQuality>("auto");
  const [playbackInfo, setPlaybackInfo] = useState<PlaybackInfo | null>(null);
  const cast = useCastOptional();
  const lastCastQuality = useRef<StreamQuality | null>(null);

  const caps = useMemo(() => detectClientCapabilities(), []);
  const playback = useMemo(
    () => resolvePlaybackUrls(item.id, quality, caps),
    [item.id, quality, caps],
  );
  const posterUrl = buildPosterUrl(item, 1280);
  const backdropUrl = buildBackdropUrl(item, 2560);

  const castMedia = useMemo(
    () => ({
      kind: "vod" as const,
      id: item.id,
      title: item.name,
      subtitle: item.year ? String(item.year) : undefined,
      posterUrl: posterUrl ?? undefined,
      quality,
    }),
    [item.id, item.name, item.year, posterUrl, quality],
  );

  useEffect(() => {
    if (!cast?.isCasting || lastCastQuality.current === quality) return;
    lastCastQuality.current = quality;
    void cast.startCast(castMedia).catch(() => undefined);
  }, [cast, castMedia, quality]);

  useEffect(() => {
    if (!cast?.isCasting) {
      lastCastQuality.current = null;
    }
  }, [cast?.isCasting]);

  const playbackStatus = formatPlaybackStatus(
    quality,
    playbackInfo?.usingFallback ?? false,
    playback.mode,
    playbackInfo?.resolution,
  );

  const handlePlaybackInfo = useCallback((info: PlaybackInfo) => {
    setPlaybackInfo(info);
  }, []);

  return (
    <div className="relative min-h-screen bg-rush-canvas">
      {backdropUrl ? (
        <>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={backdropUrl}
            alt=""
            aria-hidden
            className="pointer-events-none fixed inset-0 h-full w-full object-cover opacity-25 blur-3xl"
          />
          <div className="pointer-events-none fixed inset-0 bg-rush-canvas/75 backdrop-blur-3xl" />
        </>
      ) : (
        <div className="pointer-events-none fixed inset-0 bg-hero-glow opacity-60" />
      )}

      <header className="relative z-10 flex items-center justify-between px-4 py-4 lg:px-8">
        <Link href="/">
          <RushifyLogo compact />
        </Link>
        <div className="flex items-center gap-2">
          <CastIndicator />
          <CastButton media={castMedia} label="Cast" />
          <Link
            href={backHref}
            className="rounded-full border border-rush-border bg-rush-surface/80 px-4 py-2 text-sm text-rush-muted backdrop-blur-sm hover:text-rush-foreground"
          >
            ← Back
          </Link>
        </div>
      </header>

      <main className="relative mx-auto max-w-6xl px-4 pb-12 pt-4 lg:px-8">
        <div className="space-y-3">
          <RushifyPlayer
            key={`${item.id}-${quality}`}
            src={playback.src}
            fallbackSrc={playback.fallbackSrc}
            poster={posterUrl ?? undefined}
            title={item.name}
            autoPlay
            lanOptimized
            playbackStatus={playbackStatus}
            onPlaybackInfo={handlePlaybackInfo}
          />
          <QualitySelector value={quality} onChange={setQuality} />
        </div>

        <div className="mt-8">
          <h1 className="text-3xl font-semibold tracking-tight">{item.name}</h1>
          <div className="mt-2 flex flex-wrap items-center gap-3 text-sm text-rush-muted">
            {item.year && <span>{item.year}</span>}
            {item.kind !== "Unknown" && (
              <span className="rounded-full border border-rush-border px-3 py-0.5">{item.kind}</span>
            )}
            <span className="rounded-full border border-rush-border/60 px-3 py-0.5 text-xs">
              {playbackStatus}
            </span>
          </div>
          {item.overview && (
            <p className="mt-4 max-w-3xl leading-7 text-rush-muted">{item.overview}</p>
          )}
        </div>
      </main>
    </div>
  );
}
