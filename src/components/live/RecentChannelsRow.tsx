"use client";

import { ChannelLogo } from "@/components/live/ChannelLogo";
import { cn } from "@/lib/utils/cn";
import type { IptvChannel } from "@/types/iptv";

type RecentChannelsRowProps = {
  channels: IptvChannel[];
  recentIds: string[];
  selectedChannelId: string | null;
  onSelectChannel: (channel: IptvChannel) => void;
  className?: string;
};

export function RecentChannelsRow({
  channels,
  recentIds,
  selectedChannelId,
  onSelectChannel,
  className,
}: RecentChannelsRowProps) {
  const recentChannels = recentIds
    .map((id) => channels.find((channel) => channel.id === id))
    .filter((channel): channel is IptvChannel => Boolean(channel))
    .slice(0, 10);

  if (recentChannels.length === 0) return null;

  return (
    <div className={className}>
      <p className="mb-2 text-xs uppercase tracking-[0.25em] text-rush-muted">Recent</p>
      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-thin">
        {recentChannels.map((channel) => (
          <button
            key={channel.id}
            type="button"
            onClick={() => onSelectChannel(channel)}
            className={cn(
              "flex min-w-[140px] shrink-0 items-center gap-2 rounded-xl border border-rush-border bg-rush-surface/70 px-3 py-2 text-left transition-colors hover:border-rush-accent/40",
              selectedChannelId === channel.id && "border-rush-accent/60 bg-rush-accent/10",
            )}
          >
            <ChannelLogo name={channel.name} logoUrl={channel.logoUrl} size="sm" />
            <div className="min-w-0">
              <p className="truncate text-xs font-medium">{channel.name}</p>
              {channel.channelNumber != null && (
                <p className="text-[10px] text-rush-muted">Ch. {channel.channelNumber}</p>
              )}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
