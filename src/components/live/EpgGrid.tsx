"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { ChannelLogo } from "@/components/live/ChannelLogo";
import {
  buildChannelProgrammeMap,
  buildTimeSlots,
  CHANNEL_COL_WIDTH_PX,
  findNowNext,
  findProgrammeAtInList,
  formatSlotDay,
  formatSlotLabel,
  getNowLineOffsetPx,
  GUIDE_HOURS_BACK,
  GUIDE_HOURS_FORWARD,
  ROW_HEIGHT_PX,
  SLOT_MINUTES,
  SLOT_WIDTH_PX,
} from "@/lib/iptv/epg-utils";
import type { IptvChannel, IptvProgramme } from "@/types/iptv";
import { cn } from "@/lib/utils/cn";

type EpgGridProps = {
  channels: IptvChannel[];
  programmes: IptvProgramme[];
  now: Date;
  favoriteIds?: Set<string>;
  onToggleFavorite?: (channelId: string) => void;
  onTuneChannel?: (channel: IptvChannel) => void;
  onChannelHover?: (channel: IptvChannel) => void;
  className?: string;
};

const VIRTUAL_OVERSCAN = 6;

export function EpgGrid({
  channels,
  programmes,
  now,
  favoriteIds,
  onToggleFavorite,
  onTuneChannel,
  onChannelHover,
  className,
}: EpgGridProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const bodyRef = useRef<HTMLDivElement>(null);
  const [scrollTop, setScrollTop] = useState(0);
  const [viewportHeight, setViewportHeight] = useState(480);
  const [didJumpToNow, setDidJumpToNow] = useState(false);

  const slots = useMemo(
    () => buildTimeSlots(now, GUIDE_HOURS_BACK, GUIDE_HOURS_FORWARD, SLOT_MINUTES),
    [now],
  );

  const channelProgrammes = useMemo(
    () => buildChannelProgrammeMap(channels, programmes),
    [channels, programmes],
  );

  const gridWidth = CHANNEL_COL_WIDTH_PX + slots.length * SLOT_WIDTH_PX;
  const nowLineOffset = getNowLineOffsetPx(slots, now, SLOT_WIDTH_PX);
  const currentTimeLabel = now.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });

  const visibleStart = Math.max(0, Math.floor(scrollTop / ROW_HEIGHT_PX) - VIRTUAL_OVERSCAN);
  const visibleCount = Math.ceil(viewportHeight / ROW_HEIGHT_PX) + VIRTUAL_OVERSCAN * 2;
  const visibleEnd = Math.min(channels.length, visibleStart + visibleCount);
  const visibleChannels = channels.slice(visibleStart, visibleEnd);
  const topSpacer = visibleStart * ROW_HEIGHT_PX;
  const bottomSpacer = Math.max(0, (channels.length - visibleEnd) * ROW_HEIGHT_PX);

  const jumpToNow = useCallback(() => {
    const container = scrollRef.current;
    if (!container || nowLineOffset == null) return;
    container.scrollLeft = Math.max(0, nowLineOffset - container.clientWidth * 0.25);
    setDidJumpToNow(true);
  }, [nowLineOffset]);

  useEffect(() => {
    if (didJumpToNow) return;
    jumpToNow();
  }, [didJumpToNow, jumpToNow]);

  useEffect(() => {
    const node = bodyRef.current;
    if (!node) return;

    const observer = new ResizeObserver(([entry]) => {
      setViewportHeight(entry?.contentRect.height ?? 480);
    });
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  const onScroll = () => {
    const node = scrollRef.current;
    if (!node) return;
    setScrollTop(node.scrollTop);
  };

  const handleTune = useCallback(
    (channel: IptvChannel) => {
      onTuneChannel?.(channel);
    },
    [onTuneChannel],
  );

  return (
    <div className={cn("flex min-h-0 min-w-0 max-w-full flex-col gap-3", className)}>
      <div className="flex shrink-0 flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="rounded-lg border border-rush-accent/30 bg-rush-accent/10 px-2.5 py-1 text-xs font-medium text-rush-accent">
            Now {currentTimeLabel}
          </span>
          <button
            type="button"
            onClick={jumpToNow}
            className="rounded-lg border border-rush-border bg-rush-surface px-2.5 py-1 text-xs font-medium text-rush-foreground transition-colors hover:border-rush-accent/40"
          >
            Jump to now
          </button>
        </div>
      </div>

      <div className="flex min-h-0 min-w-0 max-w-full flex-1 flex-col overflow-hidden rounded-2xl border border-rush-border bg-rush-surface/30 shadow-glow-sm">
        <div
          ref={scrollRef}
          onScroll={onScroll}
          className="min-h-0 flex-1 overflow-x-auto overflow-y-auto scroll-smooth scrollbar-thin"
        >
          <div className="sticky top-0 z-20 border-b border-rush-border bg-rush-elevated/95 backdrop-blur-md">
            <div
              className="grid"
              style={{
                width: gridWidth,
                gridTemplateColumns: `${CHANNEL_COL_WIDTH_PX}px repeat(${slots.length}, ${SLOT_WIDTH_PX}px)`,
              }}
            >
              <div className="sticky left-0 z-30 border-r border-rush-border bg-rush-elevated px-3 py-2.5 text-xs uppercase tracking-wider text-rush-muted">
                Channel
              </div>
              {slots.map((slot) => {
                const dayLabel = formatSlotDay(slot, now);
                const isCurrentSlot =
                  slot.getTime() <= now.getTime() &&
                  slot.getTime() + SLOT_MINUTES * 60 * 1000 > now.getTime();
                return (
                  <div
                    key={slot.toISOString()}
                    className={cn(
                      "border-r border-rush-border px-1 py-2 text-center",
                      isCurrentSlot && "bg-rush-accent/10",
                    )}
                  >
                    {dayLabel && (
                      <p className="text-[10px] uppercase tracking-wide text-rush-accent/80">
                        {dayLabel}
                      </p>
                    )}
                    <p
                      className={cn(
                        "text-xs",
                        isCurrentSlot ? "font-semibold text-rush-accent" : "text-rush-muted",
                      )}
                    >
                      {formatSlotLabel(slot)}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>

          <div ref={bodyRef} className="relative" style={{ width: gridWidth }}>
            {nowLineOffset != null && (
              <div
                className="pointer-events-none absolute bottom-0 top-0 z-10 w-0.5 bg-rush-accent shadow-[0_0_12px_rgba(139,92,246,0.8)]"
                style={{ left: CHANNEL_COL_WIDTH_PX + nowLineOffset }}
                aria-hidden
              />
            )}

            {topSpacer > 0 && <div style={{ height: topSpacer }} />}

            {visibleChannels.map((channel) => {
              const channelList = channelProgrammes.get(channel.id) ?? [];
              const { now: onNow } = findNowNext(channelList, channel, now);

              return (
                <div
                  key={channel.id}
                  className="grid border-b border-rush-border/80"
                  style={{
                    height: ROW_HEIGHT_PX,
                    gridTemplateColumns: `${CHANNEL_COL_WIDTH_PX}px repeat(${slots.length}, ${SLOT_WIDTH_PX}px)`,
                  }}
                >
                  <button
                    type="button"
                    tabIndex={0}
                    onClick={() => handleTune(channel)}
                    onMouseEnter={() => onChannelHover?.(channel)}
                    onFocus={() => onChannelHover?.(channel)}
                    className="sticky left-0 z-10 flex items-center gap-2 border-r border-rush-border bg-rush-elevated/95 px-2 py-2 text-left transition-colors hover:bg-rush-surface focus:outline-none focus:ring-2 focus:ring-inset focus:ring-rush-accent/50"
                  >
                    <ChannelLogo name={channel.name} logoUrl={channel.logoUrl} size="sm" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium leading-tight">{channel.name}</p>
                      {onNow ? (
                        <p className="truncate text-[11px] text-rush-accent">{onNow.title}</p>
                      ) : (
                        <p className="truncate text-[11px] text-rush-muted">
                          {channel.channelNumber != null ? `Ch. ${channel.channelNumber}` : "Live"}
                        </p>
                      )}
                    </div>
                    {onToggleFavorite && (
                      <span
                        role="button"
                        tabIndex={0}
                        aria-label={
                          favoriteIds?.has(channel.id)
                            ? "Remove from favorites"
                            : "Add to favorites"
                        }
                        onClick={(event) => {
                          event.preventDefault();
                          event.stopPropagation();
                          onToggleFavorite(channel.id);
                        }}
                        onKeyDown={(event) => {
                          if (event.key === "Enter" || event.key === " ") {
                            event.preventDefault();
                            event.stopPropagation();
                            onToggleFavorite(channel.id);
                          }
                        }}
                        className={cn(
                          "shrink-0 px-1 text-sm",
                          favoriteIds?.has(channel.id)
                            ? "text-rush-accent"
                            : "text-rush-muted/50 hover:text-rush-muted",
                        )}
                      >
                        {favoriteIds?.has(channel.id) ? "★" : "☆"}
                      </span>
                    )}
                  </button>

                  {slots.map((slot, index) => {
                    const slotEnd =
                      slots[index + 1] ??
                      new Date(slot.getTime() + SLOT_MINUTES * 60 * 1000);
                    const programme = findProgrammeAtInList(channelList, slot, slotEnd);
                    const slotMs = slot.getTime();
                    const isNowSlot =
                      onNow &&
                      slotMs <= new Date(onNow.start).getTime() &&
                      slotEnd.getTime() > new Date(onNow.start).getTime();

                    return (
                      <button
                        key={`${channel.id}-${slot.toISOString()}`}
                        type="button"
                        tabIndex={0}
                        title={programme?.description ?? programme?.title}
                        onClick={() => handleTune(channel)}
                        onMouseEnter={() => onChannelHover?.(channel)}
                        onFocus={() => onChannelHover?.(channel)}
                        className={cn(
                          "flex items-center border-r border-rush-border/60 px-2 py-1 text-left text-xs transition-colors hover:bg-rush-accent/10 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-rush-accent/40",
                          programme && "bg-rush-canvas/30",
                          isNowSlot && "bg-rush-accent/15 ring-1 ring-inset ring-rush-accent/30",
                        )}
                      >
                        <span className="line-clamp-2 leading-snug">
                          {programme?.title ?? "..."}
                        </span>
                      </button>
                    );
                  })}
                </div>
              );
            })}

            {bottomSpacer > 0 && <div style={{ height: bottomSpacer }} />}
          </div>
        </div>
      </div>
    </div>
  );
}
