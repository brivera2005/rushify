"use client";

import Link from "next/link";
import { useMemo } from "react";

import { ChannelLogo } from "@/components/live/ChannelLogo";
import { findNowNext, formatProgrammeTime } from "@/lib/iptv/epg-utils";
import type { IptvChannel, IptvProgramme } from "@/types/iptv";
import { cn } from "@/lib/utils/cn";

type MiniGuideOverlayProps = {
  channels: IptvChannel[];
  programmes: IptvProgramme[];
  currentChannelId: string;
  now: Date;
  onClose: () => void;
  onSelectChannel: (channel: IptvChannel) => void;
};

export function MiniGuideOverlay({
  channels,
  programmes,
  currentChannelId,
  now,
  onClose,
  onSelectChannel,
}: MiniGuideOverlayProps) {
  const rows = useMemo(() => {
    const currentIndex = channels.findIndex((c) => c.id === currentChannelId);
    const start = Math.max(0, currentIndex - 5);
    const end = Math.min(channels.length, start + 12);
    return channels.slice(start, end);
  }, [channels, currentChannelId]);

  return (
    <div
      className="absolute inset-0 z-30 flex flex-col justify-end bg-gradient-to-t from-black via-black/80 to-transparent p-4"
      role="dialog"
      aria-label="Mini TV guide"
    >
      <div className="mb-3 flex items-center justify-between">
        <p className="text-xs uppercase tracking-[0.25em] text-rush-accent">Guide</p>
        <button
          type="button"
          onClick={onClose}
          className="rounded-lg px-2 py-1 text-xs text-rush-muted hover:bg-white/10 hover:text-rush-foreground"
        >
          Close (G)
        </button>
      </div>

      <div className="max-h-[50vh] overflow-y-auto rounded-2xl border border-rush-border/60 bg-rush-elevated/95 backdrop-blur-md">
        {rows.map((channel) => {
          const { now: onNow, next } = findNowNext(programmes, channel, now);
          const active = channel.id === currentChannelId;

          return (
            <button
              key={channel.id}
              type="button"
              onClick={() => onSelectChannel(channel)}
              className={cn(
                "flex w-full items-center gap-3 border-b border-rush-border/50 px-3 py-2.5 text-left transition-colors last:border-0 hover:bg-rush-accent/10",
                active && "bg-rush-accent/15",
              )}
            >
              <ChannelLogo name={channel.name} logoUrl={channel.logoUrl} size="sm" />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="truncate text-sm font-medium">{channel.name}</p>
                  {channel.channelNumber != null && (
                    <span className="text-[10px] text-rush-muted">{channel.channelNumber}</span>
                  )}
                </div>
                {onNow ? (
                  <p className="truncate text-xs text-rush-accent">{onNow.title}</p>
                ) : next ? (
                  <p className="truncate text-xs text-rush-muted">Next: {next.title}</p>
                ) : null}
              </div>
              {onNow && (
                <span className="shrink-0 text-[10px] text-rush-muted">
                  {formatProgrammeTime(onNow).split(" – ")[1]}
                </span>
              )}
            </button>
          );
        })}
      </div>

      <Link
        href="/live/guide"
        className="mt-3 self-center text-xs text-rush-muted underline-offset-2 hover:text-rush-accent hover:underline"
      >
        Open full TV Guide
      </Link>
    </div>
  );
}
