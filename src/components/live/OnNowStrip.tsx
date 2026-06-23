"use client";

import Link from "next/link";
import { useMemo } from "react";

import { ChannelLogo } from "@/components/live/ChannelLogo";
import { findNowNext, formatProgrammeTime } from "@/lib/iptv/epg-utils";
import type { IptvChannel, IptvProgramme } from "@/types/iptv";
import { cn } from "@/lib/utils/cn";

type OnNowStripProps = {
  channels: IptvChannel[];
  programmes: IptvProgramme[];
  now: Date;
  maxItems?: number;
  className?: string;
};

export function OnNowStrip({
  channels,
  programmes,
  now,
  maxItems = 12,
  className,
}: OnNowStripProps) {
  const onNowItems = useMemo(() => {
    const items: Array<{ channel: IptvChannel; programme: IptvProgramme }> = [];

    for (const channel of channels) {
      const { now: current } = findNowNext(programmes, channel, now);
      if (current) items.push({ channel, programme: current });
      if (items.length >= maxItems * 3) break;
    }

    return items.slice(0, maxItems);
  }, [channels, programmes, now, maxItems]);

  if (onNowItems.length === 0) return null;

  return (
    <div className={cn("space-y-3", className)}>
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs uppercase tracking-[0.25em] text-rush-accent">On Now</p>
        <span className="text-xs text-rush-muted">{onNowItems.length} airing</span>
      </div>
      <div className="flex gap-3 overflow-x-auto pb-1 snap-x snap-mandatory">
        {onNowItems.map(({ channel, programme }) => (
          <Link
            key={channel.id}
            href={`/live/watch/${encodeURIComponent(channel.id)}`}
            className="group flex min-w-[220px] max-w-[260px] snap-start flex-col gap-2 rounded-2xl border border-rush-border bg-rush-surface/60 p-3 transition-all hover:border-rush-accent/40 hover:shadow-glow-sm"
          >
            <div className="flex items-center gap-2">
              <ChannelLogo name={channel.name} logoUrl={channel.logoUrl} size="sm" />
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{channel.name}</p>
                {channel.channelNumber != null && (
                  <p className="text-[10px] text-rush-muted">Ch. {channel.channelNumber}</p>
                )}
              </div>
            </div>
            <div>
              <p className="line-clamp-2 text-sm text-rush-foreground group-hover:text-rush-accent">
                {programme.title}
              </p>
              <p className="mt-1 text-xs text-rush-muted">{formatProgrammeTime(programme)}</p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
