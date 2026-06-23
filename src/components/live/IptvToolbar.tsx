"use client";

import { Button } from "@/components/ui/Button";
import {
  formatCacheAge,
  formatProgrammeCount,
  formatRefreshButtonLabel,
  useIptvRefresh,
} from "@/hooks/useIptvRefresh";
import { cn } from "@/lib/utils/cn";

type IptvToolbarProps = {
  search: string;
  onSearchChange: (value: string) => void;
  channelCount?: number;
  programmeCount?: number;
  channelsAgeSeconds?: number;
  epgAgeSeconds?: number;
  showEpg?: boolean;
  showCacheStatus?: boolean;
  className?: string;
};

export function IptvToolbar({
  search,
  onSearchChange,
  channelCount,
  programmeCount,
  channelsAgeSeconds,
  epgAgeSeconds,
  showEpg = true,
  showCacheStatus = true,
  className,
}: IptvToolbarProps) {
  const {
    refresh,
    refreshingEpg,
    refreshingChannels,
    epgCooldown,
    channelsCooldown,
  } = useIptvRefresh();

  const epgDisabled = refreshingEpg || epgCooldown > 0;
  const channelsDisabled = refreshingChannels || channelsCooldown > 0;

  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-[200px] flex-1">
          <input
            type="search"
            value={search}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder="Search channels…"
            className="w-full rounded-xl border border-rush-border bg-rush-surface/80 px-3 py-2 text-sm text-rush-foreground placeholder:text-rush-muted focus:border-rush-accent/50 focus:outline-none focus:ring-1 focus:ring-rush-accent/30"
          />
        </div>
        {showEpg ? (
          <Button
            variant="secondary"
            size="sm"
            onClick={() => void refresh("epg")}
            disabled={epgDisabled}
            title={
              epgAgeSeconds != null
                ? `EPG last updated ${formatCacheAge(epgAgeSeconds)}`
                : undefined
            }
          >
            {refreshingEpg ? (
              <span className="inline-flex items-center gap-2">
                <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-rush-accent/30 border-t-rush-accent" />
                Refreshing EPG…
              </span>
            ) : (
              formatRefreshButtonLabel({
                type: "epg",
                refreshing: refreshingEpg,
                cooldown: epgCooldown,
                ageSeconds: epgAgeSeconds,
              })
            )}
          </Button>
        ) : null}
        <Button
          variant="secondary"
          size="sm"
          onClick={() => void refresh("channels")}
          disabled={channelsDisabled}
          title={
            channelsAgeSeconds != null
              ? `Channels last updated ${formatCacheAge(channelsAgeSeconds)}`
              : undefined
          }
        >
          {formatRefreshButtonLabel({
            type: "channels",
            refreshing: refreshingChannels,
            cooldown: channelsCooldown,
            ageSeconds: channelsAgeSeconds,
          })}
        </Button>
      </div>

      {showCacheStatus ? (
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-rush-muted">
          {channelCount != null ? (
            <span>
              Channels: {channelCount.toLocaleString()} · updated{" "}
              {formatCacheAge(channelsAgeSeconds)}
            </span>
          ) : null}
          {showEpg && programmeCount != null ? (
            <span>
              EPG: {formatProgrammeCount(programmeCount)} · updated{" "}
              {formatCacheAge(epgAgeSeconds)}
            </span>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
