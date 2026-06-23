"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import {
  enterPictureInPicture,
  RushifyPlayer,
  toggleFullscreen,
} from "@/components/player/RushifyPlayer";
import { CastButton } from "@/components/cast/CastButton";
import { CastIndicator } from "@/components/cast/CastIndicator";
import { ChannelNumberPad } from "@/components/live/ChannelNumberPad";
import { MiniGuideOverlay } from "@/components/live/MiniGuideOverlay";
import { ChannelLogo } from "@/components/live/ChannelLogo";
import { LiveTvNav } from "@/components/live/LiveTvNav";
import { Button } from "@/components/ui/Button";
import { Card, CardDescription, CardTitle } from "@/components/ui/Card";
import { useIptvChannels, useIptvEpg } from "@/hooks/useIptvData";
import { setLastWatchedChannelId } from "@/lib/iptv/client-storage";
import { findNowNext } from "@/lib/iptv/epg-utils";
import { cn } from "@/lib/utils/cn";

import type { IptvChannel } from "@/types/iptv";

function buildStreamUrls(channelId: string) {
  const encoded = encodeURIComponent(channelId);
  const streamUrl = `/api/stream/iptv/${encoded}`;
  return { streamUrl, fallbackStreamUrl: `${streamUrl}?format=ts` };
}

type WatchPageProps = {
  channelId: string;
};

export function LiveWatchClient({ channelId }: WatchPageProps) {
  const router = useRouter();
  const decodedId = decodeURIComponent(channelId);
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [showGuide, setShowGuide] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [now, setNow] = useState(() => new Date());

  const channelsQuery = useIptvChannels();
  const epgQuery = useIptvEpg();

  const channels = useMemo(
    () => channelsQuery.data?.data.channels ?? [],
    [channelsQuery.data?.data.channels],
  );
  const programmes = useMemo(() => epgQuery.data?.data.programmes ?? [], [epgQuery.data?.data.programmes]);

  const channelIndex = channels.findIndex((item) => item.id === decodedId);
  const listedChannel = channelIndex >= 0 ? channels[channelIndex] : undefined;
  const streamUrls = useMemo(() => buildStreamUrls(decodedId), [decodedId]);
  const channel = useMemo((): IptvChannel | undefined => {
    if (listedChannel) return listedChannel;
    if (channelsQuery.isLoading) {
      return {
        id: decodedId,
        name: "Live channel",
        streamUrl: streamUrls.streamUrl,
        fallbackStreamUrl: streamUrls.fallbackStreamUrl,
      };
    }
    return undefined;
  }, [listedChannel, channelsQuery.isLoading, decodedId, streamUrls]);

  const categoryChannels = useMemo(() => {
    if (!channel?.group) return channels;
    return channels.filter(
      (item) => (item.group?.trim() || "All channels") === channel.group?.trim(),
    );
  }, [channels, channel]);

  const zapList = categoryChannels.length > 1 ? categoryChannels : channels;

  const { now: onNowProgramme } = useMemo(
    () => (channel ? findNowNext(programmes, channel, now) : { now: undefined }),
    [channel, programmes, now],
  );

  const castMedia = useMemo(
    () =>
      channel
        ? {
            kind: "iptv" as const,
            id: channel.id,
            title: channel.name,
            subtitle: onNowProgramme?.title,
            posterUrl: channel.logoUrl,
          }
        : null,
    [channel, onNowProgramme?.title],
  );

  const tuneChannel = useCallback(
    (next: (typeof channels)[number]) => {
      setLastWatchedChannelId(next.id);
      router.push(`/live/watch/${encodeURIComponent(next.id)}`);
    },
    [router],
  );

  const channelUp = useCallback(() => {
    if (zapList.length === 0) return;
    const idx = zapList.findIndex((c) => c.id === decodedId);
    const next = zapList[(idx - 1 + zapList.length) % zapList.length];
    if (next) tuneChannel(next);
  }, [zapList, decodedId, tuneChannel]);

  const channelDown = useCallback(() => {
    if (zapList.length === 0) return;
    const idx = zapList.findIndex((c) => c.id === decodedId);
    const next = zapList[(idx + 1) % zapList.length];
    if (next) tuneChannel(next);
  }, [zapList, decodedId, tuneChannel]);

  useEffect(() => {
    if (channel) setLastWatchedChannelId(channel.id);
  }, [channel]);

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "ArrowUp") {
        event.preventDefault();
        channelUp();
      } else if (event.key === "ArrowDown") {
        event.preventDefault();
        channelDown();
      } else if (event.key === "g" || event.key === "G") {
        event.preventDefault();
        setShowGuide((open) => !open);
      } else if (event.key === "f" || event.key === "F") {
        event.preventDefault();
        if (containerRef.current) void toggleFullscreen(containerRef.current);
      } else if (event.key === "p" || event.key === "P") {
        event.preventDefault();
        if (videoRef.current) void enterPictureInPicture(videoRef.current);
      } else if (event.key === "Escape") {
        setShowGuide(false);
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [channelUp, channelDown]);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    if (showControls) {
      timer = setTimeout(() => setShowControls(false), 4000);
    }
    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [showControls, decodedId]);

  if (!channel && !channelsQuery.isLoading) {
    return (
      <div className="space-y-6">
        <LiveTvNav />
        <Card>
          <CardTitle>Channel not found</CardTitle>
          <CardDescription>
            {channelsQuery.error instanceof Error
              ? channelsQuery.error.message
              : "This channel is not in the current lineup."}
          </CardDescription>
          <Link href="/live/guide" className="mt-4 inline-block">
            <Button>Back to TV Guide</Button>
          </Link>
        </Card>
      </div>
    );
  }

  if (!channel) {
    return null;
  }

  const nextChannel = zapList[(zapList.findIndex((c) => c.id === decodedId) + 1) % zapList.length];

  return (
    <div className="space-y-6">
      <ChannelNumberPad channels={channels} onTuneChannel={tuneChannel} />

      <div>
        <p className="text-sm uppercase tracking-[0.35em] text-rush-accent">Live TV</p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight">{channel.name}</h1>
        {onNowProgramme && (
          <p className="mt-1 text-sm text-rush-muted">{onNowProgramme.title}</p>
        )}
      </div>

      <LiveTvNav />

      <div
        ref={containerRef}
        className="relative overflow-hidden rounded-2xl bg-black shadow-glow"
        onMouseMove={() => setShowControls(true)}
        onTouchStart={() => setShowControls(true)}
      >
        <RushifyPlayer
          playerId={`watch-${channel.id}`}
          src={channel.streamUrl}
          fallbackSrc={channel.fallbackStreamUrl}
          title={channel.name}
          live
          lanOptimized
          videoRef={videoRef}
          className="rounded-none border-0 shadow-none"
          connectingLabel={`Connecting to ${channel.name}…`}
          connectTimeoutMs={6000}
          errorTitle="This channel isn't responding. Try another."
          errorActions={
            nextChannel ? (
              <Button variant="secondary" onClick={() => tuneChannel(nextChannel)}>
                Next channel ▼
              </Button>
            ) : undefined
          }
        />

        <div
          className={cn(
            "pointer-events-none absolute inset-x-0 top-0 bg-gradient-to-b from-black/70 to-transparent p-4 transition-opacity duration-300",
            showControls ? "opacity-100" : "opacity-0",
          )}
        >
          <div className="pointer-events-auto flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <ChannelLogo name={channel.name} logoUrl={channel.logoUrl} size="md" />
              <div>
                <p className="font-semibold">{channel.name}</p>
                {channel.channelNumber != null && (
                  <p className="text-xs text-rush-muted">Channel {channel.channelNumber}</p>
                )}
                {onNowProgramme && (
                  <p className="text-xs text-rush-accent">{onNowProgramme.title}</p>
                )}
              </div>
            </div>
            <Link href="/live/channels">
              <Button variant="secondary" size="sm">
                All channels
              </Button>
            </Link>
            <CastIndicator variant="overlay" className="pointer-events-auto hidden sm:flex" />
          </div>
        </div>

        <div
          className={cn(
            "pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-4 transition-opacity duration-300",
            showControls ? "opacity-100" : "opacity-0",
          )}
        >
          <div className="pointer-events-auto flex flex-wrap items-center justify-center gap-2 sm:justify-between">
            <div className="flex gap-2">
              <button
                type="button"
                onClick={channelUp}
                className="rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-sm backdrop-blur-sm transition-colors hover:bg-rush-accent/20"
                aria-label="Channel up"
              >
                ▲ Ch
              </button>
              <button
                type="button"
                onClick={channelDown}
                className="rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-sm backdrop-blur-sm transition-colors hover:bg-rush-accent/20"
                aria-label="Channel down"
              >
                ▼ Ch
              </button>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setShowGuide(true)}
                className="rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-sm backdrop-blur-sm transition-colors hover:bg-rush-accent/20"
              >
                Guide (G)
              </button>
              <button
                type="button"
                onClick={() => {
                  if (containerRef.current) void toggleFullscreen(containerRef.current);
                }}
                className="rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-sm backdrop-blur-sm transition-colors hover:bg-rush-accent/20"
              >
                Fullscreen (F)
              </button>
              <button
                type="button"
                onClick={() => {
                  if (videoRef.current) void enterPictureInPicture(videoRef.current);
                }}
                className="rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-sm backdrop-blur-sm transition-colors hover:bg-rush-accent/20"
              >
                PiP (P)
              </button>
              <CastButton media={castMedia} variant="overlay" label="Cast" />
            </div>
          </div>
          <p className="mt-2 hidden text-center text-[10px] text-white/50 sm:block">
            ↑↓ change channel · 0-9 channel number · G guide · F fullscreen · P picture-in-picture
          </p>
        </div>

        {showGuide && (
          <MiniGuideOverlay
            channels={zapList}
            programmes={programmes}
            currentChannelId={channel.id}
            now={now}
            onClose={() => setShowGuide(false)}
            onSelectChannel={(next) => {
              setShowGuide(false);
              tuneChannel(next);
            }}
          />
        )}
      </div>
    </div>
  );
}
