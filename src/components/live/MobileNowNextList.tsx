"use client";

import { useMemo } from "react";

import { ChannelLogo } from "@/components/live/ChannelLogo";
import { findNowNext, formatProgrammeTime } from "@/lib/iptv/epg-utils";
import type { IptvChannel, IptvProgramme } from "@/types/iptv";

type MobileNowNextListProps = {
  channels: IptvChannel[];
  programmes: IptvProgramme[];
  now: Date;
  onTuneChannel?: (channel: IptvChannel) => void;
};

export function MobileNowNextList({
  channels,
  programmes,
  now,
  onTuneChannel,
}: MobileNowNextListProps) {
  const rows = useMemo(
    () =>
      channels.slice(0, 80).map((channel) => ({
        channel,
        ...findNowNext(programmes, channel, now),
      })),
    [channels, programmes, now],
  );

  return (
    <div className="space-y-2 lg:hidden">
      <p className="text-xs uppercase tracking-[0.25em] text-rush-muted">Now &amp; Next</p>
      <div className="divide-y divide-rush-border overflow-hidden rounded-2xl border border-rush-border bg-rush-surface/40">
        {rows.map(({ channel, now: onNow, next }) => (
          <button
            key={channel.id}
            type="button"
            tabIndex={0}
            onClick={() => onTuneChannel?.(channel)}
            className="flex w-full items-center gap-3 px-3 py-3 text-left transition-colors active:bg-rush-accent/10 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-rush-accent/40"
          >
            <ChannelLogo name={channel.name} logoUrl={channel.logoUrl} size="md" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{channel.name}</p>
              {onNow ? (
                <>
                  <p className="truncate text-xs text-rush-accent">{onNow.title}</p>
                  <p className="text-[11px] text-rush-muted">{formatProgrammeTime(onNow)}</p>
                </>
              ) : next ? (
                <p className="truncate text-xs text-rush-muted">Next: {next.title}</p>
              ) : (
                <p className="text-xs text-rush-muted">No guide data</p>
              )}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
