"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { FixedSizeList, type ListChildComponentProps } from "react-window";

import { ChannelLogo } from "@/components/live/ChannelLogo";
import { cn } from "@/lib/utils/cn";
import type { IptvChannel } from "@/types/iptv";

const ROW_HEIGHT = 68;

type VirtualChannelListProps = {
  channels: IptvChannel[];
  selectedChannelId: string | null;
  favoriteIds: Set<string>;
  onSelectChannel: (channel: IptvChannel) => void;
  onToggleFavorite: (channelId: string, event: React.MouseEvent) => void;
  onChannelHover?: (channel: IptvChannel) => void;
  className?: string;
  height?: number;
};

type RowData = {
  channels: IptvChannel[];
  selectedChannelId: string | null;
  favoriteIds: Set<string>;
  onSelectChannel: (channel: IptvChannel) => void;
  onToggleFavorite: (channelId: string, event: React.MouseEvent) => void;
  onChannelHover?: (channel: IptvChannel) => void;
};

function ChannelRow({ index, style, data }: ListChildComponentProps<RowData>) {
  const channel = data.channels[index];
  if (!channel) return null;

  const isFav = data.favoriteIds.has(channel.id);
  const isSelected = data.selectedChannelId === channel.id;

  return (
    <div style={style} className="px-1">
      <div className="group relative h-[60px]">
        <button
          type="button"
          onClick={() => data.onSelectChannel(channel)}
          onMouseEnter={() => data.onChannelHover?.(channel)}
          onFocus={() => data.onChannelHover?.(channel)}
          className={cn(
            "flex h-full w-full items-center gap-3 rounded-2xl border border-rush-border bg-rush-surface/70 px-3 text-left transition-all hover:border-rush-accent/40 hover:shadow-glow-sm",
            isSelected && "border-rush-accent/60 shadow-glow-sm",
          )}
        >
          <ChannelLogo name={channel.name} logoUrl={channel.logoUrl} size="lg" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">{channel.name}</p>
            <p className="truncate text-xs text-rush-muted">
              {channel.channelNumber != null
                ? `Ch. ${channel.channelNumber}`
                : (channel.group ?? "Live")}
            </p>
          </div>
        </button>
        <button
          type="button"
          aria-label={isFav ? "Remove from favorites" : "Add to favorites"}
          onClick={(event) => data.onToggleFavorite(channel.id, event)}
          className={cn(
            "absolute right-3 top-1/2 -translate-y-1/2 rounded-lg px-1.5 py-0.5 text-sm transition-opacity",
            isFav
              ? "text-rush-accent opacity-100"
              : "text-rush-muted opacity-0 group-hover:opacity-100",
          )}
        >
          {isFav ? "★" : "☆"}
        </button>
      </div>
    </div>
  );
}

export function VirtualChannelList({
  channels,
  selectedChannelId,
  favoriteIds,
  onSelectChannel,
  onToggleFavorite,
  onChannelHover,
  className,
  height,
}: VirtualChannelListProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [listHeight, setListHeight] = useState(height ?? 520);

  useEffect(() => {
    if (height != null) {
      setListHeight(height);
      return;
    }

    const element = containerRef.current;
    if (!element) return;

    const observer = new ResizeObserver((entries) => {
      const next = entries[0]?.contentRect.height;
      if (next && next > 200) setListHeight(next);
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, [height]);

  const itemData = useMemo<RowData>(
    () => ({
      channels,
      selectedChannelId,
      favoriteIds,
      onSelectChannel,
      onToggleFavorite,
      onChannelHover,
    }),
    [channels, selectedChannelId, favoriteIds, onSelectChannel, onToggleFavorite, onChannelHover],
  );

  const scrollToChannel = useCallback(
    (channelId: string) => {
      const index = channels.findIndex((channel) => channel.id === channelId);
      if (index < 0) return index;
      return index;
    },
    [channels],
  );

  const listRef = useRef<FixedSizeList>(null);

  useEffect(() => {
    if (!selectedChannelId) return;
    const index = scrollToChannel(selectedChannelId);
    if (index != null && index >= 0) {
      listRef.current?.scrollToItem(index, "smart");
    }
  }, [selectedChannelId, scrollToChannel]);

  if (channels.length === 0) {
    return <p className="text-sm text-rush-muted">No channels match your search.</p>;
  }

  return (
    <div ref={containerRef} className={cn("min-h-[320px] min-w-0 flex-1", className)}>
      <FixedSizeList
        ref={listRef}
        height={listHeight}
        width="100%"
        itemCount={channels.length}
        itemSize={ROW_HEIGHT}
        itemData={itemData}
        overscanCount={8}
      >
        {ChannelRow}
      </FixedSizeList>
    </div>
  );
}

export function findChannelByNumber(
  channels: IptvChannel[],
  digits: string,
): IptvChannel | undefined {
  const num = Number.parseInt(digits, 10);
  if (!Number.isFinite(num)) return undefined;
  return channels.find((channel) => channel.channelNumber === num);
}
