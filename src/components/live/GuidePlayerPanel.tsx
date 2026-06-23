"use client";

import Link from "next/link";
import { useMemo } from "react";

import { CastButton } from "@/components/cast/CastButton";
import { CastIndicator } from "@/components/cast/CastIndicator";
import { ChannelLogo } from "@/components/live/ChannelLogo";
import { RushifyPlayer } from "@/components/player/RushifyPlayer";
import { Button } from "@/components/ui/Button";
import { findNowNext } from "@/lib/iptv/epg-utils";
import { setLastWatchedChannelId } from "@/lib/iptv/client-storage";
import type { IptvChannel, IptvProgramme } from "@/types/iptv";

type GuidePlayerPanelProps = {
  channel: IptvChannel;
  programmes: IptvProgramme[];
  now: Date;
  onClose: () => void;
};

export function GuidePlayerPanel({ channel, programmes, now, onClose }: GuidePlayerPanelProps) {
  const { now: onNowProgramme } = useMemo(
    () => findNowNext(programmes, channel, now),
    [channel, programmes, now],
  );

  const castMedia = useMemo(
    () => ({
      kind: "iptv" as const,
      id: channel.id,
      title: channel.name,
      subtitle: onNowProgramme?.title,
      posterUrl: channel.logoUrl,
    }),
    [channel, onNowProgramme?.title],
  );

  return (
    <div className="min-w-0 max-w-full space-y-3 rounded-2xl border border-rush-accent/30 bg-rush-surface/40 p-4 shadow-glow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <ChannelLogo name={channel.name} logoUrl={channel.logoUrl} size="lg" />
          <div>
            <p className="text-lg font-semibold">{channel.name}</p>
            {onNowProgramme ? (
              <p className="text-sm text-rush-accent">{onNowProgramme.title}</p>
            ) : (
              channel.group && <p className="text-sm text-rush-muted">{channel.group}</p>
            )}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <CastIndicator variant="default" />
          <CastButton media={castMedia} variant="default" label="Cast" />
          <Link
            href={`/live/watch/${encodeURIComponent(channel.id)}`}
            onClick={() => setLastWatchedChannelId(channel.id)}
          >
            <Button variant="secondary">Full screen</Button>
          </Link>
          <Button variant="ghost" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
      <RushifyPlayer
        playerId={`guide-${channel.id}`}
        src={channel.streamUrl}
        fallbackSrc={channel.fallbackStreamUrl}
        title={channel.name}
        live
        lanOptimized
        connectingLabel={`Connecting to ${channel.name}…`}
        connectTimeoutMs={6000}
        errorTitle="This channel isn't responding. Try another."
        onStateChange={() => setLastWatchedChannelId(channel.id)}
      />
    </div>
  );
}
