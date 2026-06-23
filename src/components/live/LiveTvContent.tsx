"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";

import { CategorySidebar } from "@/components/live/CategorySidebar";
import { ChannelNumberPad } from "@/components/live/ChannelNumberPad";
import { ChannelLogo } from "@/components/live/ChannelLogo";
import { LiveTvNav } from "@/components/live/LiveTvNav";
import { RecentChannelsRow } from "@/components/live/RecentChannelsRow";
import { IptvToolbar } from "@/components/live/IptvToolbar";
import { liveLayoutVars } from "@/components/live/live-layout";
import { VirtualChannelList } from "@/components/live/VirtualChannelList";
import { RushifyPlayer } from "@/components/player/RushifyPlayer";
import { CastButton } from "@/components/cast/CastButton";
import { CastIndicator } from "@/components/cast/CastIndicator";
import { Button } from "@/components/ui/Button";
import { Card, CardDescription, CardTitle } from "@/components/ui/Card";
import { useToast } from "@/components/ui/Toast";
import { useIptvChannels } from "@/hooks/useIptvData";
import { useIptvStreamPrefetch } from "@/hooks/useIptvStreamPrefetch";
import { useUserPrefs } from "@/hooks/useUserPrefs";
import {
  getFavoriteIds,
  getRecentChannelIds,
  setLastWatchedChannelId,
  toggleFavorite,
} from "@/lib/iptv/client-storage";
import { filterChannels, groupChannels } from "@/lib/iptv/epg-utils";
import type { IptvChannel } from "@/types/iptv";

function metaAgeSeconds(lastUpdated: string | undefined): number | undefined {
  if (!lastUpdated) return undefined;
  return Math.max(0, Math.floor((Date.now() - new Date(lastUpdated).getTime()) / 1000));
}

export function LiveTvContent() {
  const router = useRouter();
  const { toast } = useToast();
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  const [showHidden, setShowHidden] = useState(false);
  const [favoriteIds, setFavoriteIdsState] = useState<Set<string>>(() => new Set());
  const [recentIds, setRecentIds] = useState<string[]>([]);
  const [selectedChannelId, setSelectedChannelId] = useState<string | null>(null);

  const { hiddenSet, hideCategory, showCategory, isSaving } = useUserPrefs();
  const { data, isLoading, error, refetch } = useIptvChannels();
  const prefetchStream = useIptvStreamPrefetch();

  useEffect(() => {
    setFavoriteIdsState(getFavoriteIds());
    setRecentIds(getRecentChannelIds());
  }, []);

  const channels = useMemo(() => data?.data.channels ?? [], [data?.data.channels]);
  const groups = useMemo(() => groupChannels(channels), [channels]);
  const groupNames = useMemo(() => Array.from(groups.keys()), [groups]);

  const currentCategory = useMemo(() => {
    if (favoritesOnly) return null;
    if (activeCategory && groups.has(activeCategory)) return activeCategory;
    return null;
  }, [activeCategory, favoritesOnly, groups]);

  const excludeGroups = useMemo(
    () => (showHidden ? null : hiddenSet.size > 0 ? hiddenSet : null),
    [showHidden, hiddenSet],
  );

  const visibleChannels = useMemo(
    () =>
      filterChannels(channels, {
        query: search,
        group: favoritesOnly ? null : currentCategory,
        excludeGroups,
        favoriteIds,
        favoritesOnly,
      }),
    [channels, search, currentCategory, excludeGroups, favoriteIds, favoritesOnly],
  );

  const selectedChannel = useMemo(
    () => channels.find((c) => c.id === selectedChannelId) ?? null,
    [channels, selectedChannelId],
  );

  const handleToggleFavorite = useCallback((channelId: string, event: React.MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();
    toggleFavorite(channelId);
    setFavoriteIdsState(getFavoriteIds());
  }, []);

  const tuneChannel = useCallback((channel: IptvChannel) => {
    setSelectedChannelId(channel.id);
    setLastWatchedChannelId(channel.id);
    setRecentIds(getRecentChannelIds());
  }, []);

  const openFullScreen = useCallback(
    (channel: IptvChannel) => {
      setLastWatchedChannelId(channel.id);
      router.push(`/live/watch/${encodeURIComponent(channel.id)}`);
    },
    [router],
  );

  const handleHideCategory = useCallback(
    async (category: string) => {
      try {
        await hideCategory(category);
        if (activeCategory === category) {
          setActiveCategory(null);
        }
      } catch {
        toast("Could not save category preferences", "error");
      }
    },
    [hideCategory, activeCategory, toast],
  );

  if (isLoading) {
    return (
      <div className="space-y-3">
        <div className="h-10 w-48 animate-pulse rounded-xl bg-rush-surface" />
        <div className="h-64 animate-pulse rounded-xl bg-rush-surface/60" />
      </div>
    );
  }

  if (error) {
    return (
      <Card>
        <CardTitle>Live TV unavailable</CardTitle>
        <CardDescription>{error instanceof Error ? error.message : "Unknown error"}</CardDescription>
        <Button className="mt-4" onClick={() => void refetch()}>
          Retry
        </Button>
      </Card>
    );
  }

  if (channels.length === 0) {
    return (
      <Card glow>
        <CardTitle>No channels yet</CardTitle>
        <CardDescription>Live TV is not configured yet.</CardDescription>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      <LiveTvNav />

      <IptvToolbar
        search={search}
        onSearchChange={setSearch}
        channelCount={data?.meta.filteredChannels ?? channels.length}
        channelsAgeSeconds={metaAgeSeconds(data?.meta.lastUpdated)}
        showEpg={false}
      />

      <ChannelNumberPad channels={channels} onTuneChannel={tuneChannel} />

      <RecentChannelsRow
        channels={channels}
        recentIds={recentIds}
        selectedChannelId={selectedChannelId}
        onSelectChannel={tuneChannel}
      />

      {selectedChannel && (
        <div className="min-w-0 space-y-2 rounded-xl border border-rush-accent/30 bg-rush-surface/95 p-3 shadow-glow-sm backdrop-blur-md">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <ChannelLogo name={selectedChannel.name} logoUrl={selectedChannel.logoUrl} size="lg" />
              <div>
                <p className="font-semibold">{selectedChannel.name}</p>
                {selectedChannel.group && (
                  <p className="text-xs text-rush-muted">{selectedChannel.group}</p>
                )}
              </div>
            </div>
            <div className="flex gap-2">
              <CastIndicator variant="default" />
              <CastButton
                media={{
                  kind: "iptv",
                  id: selectedChannel.id,
                  title: selectedChannel.name,
                  posterUrl: selectedChannel.logoUrl,
                }}
                variant="default"
                label="Cast"
              />
              <Button variant="secondary" size="sm" onClick={() => openFullScreen(selectedChannel)}>
                Full screen
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setSelectedChannelId(null)}>
                Close
              </Button>
            </div>
          </div>
          <RushifyPlayer
            playerId={`channels-${selectedChannel.id}`}
            src={selectedChannel.streamUrl}
            fallbackSrc={selectedChannel.fallbackStreamUrl}
            title={selectedChannel.name}
            live
            lanOptimized
            connectTimeoutMs={8000}
            connectingLabel="Buffering…"
            errorTitle="Channel unavailable. Try again"
          />
        </div>
      )}

      <div
        className="live-channels-grid grid min-w-0 gap-3 lg:items-start"
        style={liveLayoutVars()}
      >
        <CategorySidebar
          groupNames={groupNames}
          groupCounts={new Map(Array.from(groups.entries()).map(([name, list]) => [name, list.length]))}
          totalChannelCount={channels.length}
          favoriteCount={favoriteIds.size}
          activeCategory={currentCategory}
          favoritesOnly={favoritesOnly}
          hiddenCategories={hiddenSet}
          showHidden={showHidden}
          onSelectAll={() => {
            setFavoritesOnly(false);
            setActiveCategory(null);
          }}
          onSelectFavorites={() => {
            setFavoritesOnly(true);
            setActiveCategory(null);
          }}
          onSelectCategory={(category) => {
            setFavoritesOnly(false);
            setActiveCategory(category);
          }}
          onHideCategory={handleHideCategory}
          onShowCategory={showCategory}
          onToggleShowHidden={() => setShowHidden((value) => !value)}
          isSaving={isSaving}
        />

        <div className="min-w-0 overflow-hidden">
          <VirtualChannelList
            channels={visibleChannels}
            selectedChannelId={selectedChannelId}
            favoriteIds={favoriteIds}
            onSelectChannel={tuneChannel}
            onToggleFavorite={handleToggleFavorite}
            onChannelHover={(channel) => prefetchStream(channel.streamUrl)}
            className="max-h-[min(calc(100vh-18rem),780px)]"
          />
        </div>
      </div>
    </div>
  );
}
