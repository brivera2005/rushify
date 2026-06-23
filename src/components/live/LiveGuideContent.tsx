"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { CategorySidebar } from "@/components/live/CategorySidebar";
import { ChannelNumberPad } from "@/components/live/ChannelNumberPad";
import { EpgGrid } from "@/components/live/EpgGrid";
import { GuidePlayerPanel } from "@/components/live/GuidePlayerPanel";
import { liveLayoutVars } from "@/components/live/live-layout";
import { LiveTvNav } from "@/components/live/LiveTvNav";
import { MobileNowNextList } from "@/components/live/MobileNowNextList";
import { RecentChannelsRow } from "@/components/live/RecentChannelsRow";
import { ChannelLogo } from "@/components/live/ChannelLogo";
import { IptvToolbar } from "@/components/live/IptvToolbar";
import { Button } from "@/components/ui/Button";
import { Card, CardDescription, CardTitle } from "@/components/ui/Card";
import { useToast } from "@/components/ui/Toast";
import { useIptvChannels, useIptvEpg } from "@/hooks/useIptvData";
import { useIptvRefresh } from "@/hooks/useIptvRefresh";
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

const MAX_GUIDE_CHANNELS = 150;

export function LiveGuideContent() {
  const { toast } = useToast();
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  const [showHidden, setShowHidden] = useState(false);
  const [favoriteIds, setFavoriteIds] = useState<Set<string>>(() => new Set());
  const [recentIds, setRecentIds] = useState<string[]>([]);
  const [now, setNow] = useState(() => new Date());
  const [tunedChannelId, setTunedChannelId] = useState<string | null>(null);
  const [isXlUp, setIsXlUp] = useState(false);

  useEffect(() => {
    const media = window.matchMedia("(min-width: 1280px)");
    const sync = () => setIsXlUp(media.matches);
    sync();
    media.addEventListener("change", sync);
    return () => media.removeEventListener("change", sync);
  }, []);

  const { hiddenSet, hideCategory, showCategory, isSaving } = useUserPrefs();
  const { refresh: refreshIptv } = useIptvRefresh();
  const prefetchStream = useIptvStreamPrefetch();
  const channelsQuery = useIptvChannels();
  const epgQuery = useIptvEpg();

  useEffect(() => {
    setFavoriteIds(getFavoriteIds());
    setRecentIds(getRecentChannelIds());
  }, []);

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (channelsQuery.error) {
      toast(channelsQuery.error instanceof Error ? channelsQuery.error.message : "Channels failed", "error");
    }
  }, [channelsQuery.error, toast]);

  useEffect(() => {
    if (epgQuery.error) {
      toast(epgQuery.error instanceof Error ? epgQuery.error.message : "TV guide failed", "error");
    }
  }, [epgQuery.error, toast]);

  const channels = useMemo(
    () => channelsQuery.data?.data.channels ?? [],
    [channelsQuery.data?.data.channels],
  );
  const programmes = useMemo(() => epgQuery.data?.data.programmes ?? [], [epgQuery.data?.data.programmes]);
  const groups = useMemo(() => groupChannels(channels), [channels]);
  const groupNames = useMemo(() => Array.from(groups.keys()), [groups]);

  const excludeGroups = useMemo(
    () => (showHidden ? null : hiddenSet.size > 0 ? hiddenSet : null),
    [showHidden, hiddenSet],
  );

  const filteredChannels = useMemo(
    () =>
      filterChannels(channels, {
        query: search,
        group: favoritesOnly ? null : activeCategory,
        excludeGroups,
        favoriteIds,
        favoritesOnly,
      }).slice(0, MAX_GUIDE_CHANNELS),
    [channels, search, favoritesOnly, activeCategory, excludeGroups, favoriteIds],
  );

  const tunedChannel = useMemo(
    () => channels.find((channel) => channel.id === tunedChannelId) ?? null,
    [channels, tunedChannelId],
  );

  const lastWatched = useMemo(() => {
    const id = recentIds[0];
    return id ? channels.find((channel) => channel.id === id) : undefined;
  }, [channels, recentIds]);

  const refreshEpg = useCallback(() => {
    void refreshIptv("epg");
  }, [refreshIptv]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key.toLowerCase() !== "r") return;
      const target = event.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.isContentEditable)
      ) {
        return;
      }
      event.preventDefault();
      void refreshEpg();
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [refreshEpg]);

  const handleToggleFavorite = useCallback((channelId: string) => {
    toggleFavorite(channelId);
    setFavoriteIds(getFavoriteIds());
  }, []);

  const handleTuneChannel = useCallback((channel: IptvChannel) => {
    setTunedChannelId(channel.id);
    setLastWatchedChannelId(channel.id);
    setRecentIds(getRecentChannelIds());
  }, []);

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

  const isInitialLoading = channelsQuery.isLoading && !channelsQuery.data;
  const epgLoading = epgQuery.isLoading && !epgQuery.data;

  if (isInitialLoading) {
    return (
      <div className="space-y-3">
        <div className="h-10 w-48 animate-pulse rounded-xl bg-rush-surface" />
        <div className="live-guide-grid grid gap-3" style={liveLayoutVars()}>
          <div className="hidden h-64 animate-pulse rounded-xl bg-rush-surface lg:block" />
          <div className="h-64 animate-pulse rounded-xl bg-rush-surface/60" />
        </div>
      </div>
    );
  }

  if (channelsQuery.error && !channels.length) {
    const message =
      channelsQuery.error instanceof Error ? channelsQuery.error.message : "Unknown error";

    return (
      <Card>
        <CardTitle>TV Guide unavailable</CardTitle>
        <CardDescription>{message}</CardDescription>
        <Button className="mt-4" onClick={() => void refreshEpg()}>
          Retry
        </Button>
      </Card>
    );
  }

  if (channels.length === 0) {
    return (
      <Card glow>
        <CardTitle>No channels</CardTitle>
        <CardDescription>Live TV is not configured yet.</CardDescription>
      </Card>
    );
  }

  const channelsAgeSeconds = metaAgeSeconds(channelsQuery.data?.meta.lastUpdated);
  const epgAgeSeconds = metaAgeSeconds(epgQuery.data?.meta.lastUpdated);

  return (
    <div className="flex min-h-0 flex-col gap-3 lg:h-[calc(100dvh-8rem)]">
      <LiveTvNav />

      <IptvToolbar
        search={search}
        onSearchChange={setSearch}
        channelCount={channelsQuery.data?.meta.filteredChannels ?? channels.length}
        programmeCount={epgQuery.data?.meta.filteredProgrammes ?? programmes.length}
        channelsAgeSeconds={channelsAgeSeconds}
        epgAgeSeconds={epgAgeSeconds}
      />

      <ChannelNumberPad channels={channels} onTuneChannel={handleTuneChannel} />

      <RecentChannelsRow
        channels={channels}
        recentIds={recentIds}
        selectedChannelId={tunedChannelId}
        onSelectChannel={handleTuneChannel}
      />

      {lastWatched && !tunedChannel && (
        <button
          type="button"
          onClick={() => handleTuneChannel(lastWatched)}
          className="flex w-full items-center justify-between gap-3 rounded-xl border border-rush-accent/30 bg-rush-accent/10 px-3 py-2 text-left transition-colors hover:border-rush-accent/50"
        >
          <div className="flex items-center gap-3">
            <ChannelLogo name={lastWatched.name} logoUrl={lastWatched.logoUrl} />
            <div>
              <p className="text-[10px] uppercase tracking-wider text-rush-accent">Last watched</p>
              <p className="text-sm font-medium">{lastWatched.name}</p>
            </div>
          </div>
          <span className="text-xs text-rush-muted">Tune in →</span>
        </button>
      )}

      {tunedChannel && !isXlUp && (
        <div className="min-w-0">
          <GuidePlayerPanel
            channel={tunedChannel}
            programmes={programmes}
            now={now}
            onClose={() => setTunedChannelId(null)}
          />
        </div>
      )}

      <div
        className="live-guide-grid grid min-h-0 min-w-0 flex-1 gap-3 lg:items-stretch"
        style={liveLayoutVars()}
      >
        <CategorySidebar
          groupNames={groupNames}
          groupCounts={new Map(Array.from(groups.entries()).map(([name, list]) => [name, list.length]))}
          totalChannelCount={channels.length}
          favoriteCount={favoriteIds.size}
          activeCategory={activeCategory}
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

        <div className="flex min-h-0 min-w-0 flex-col overflow-hidden">
          {epgLoading && programmes.length === 0 && (
            <Card className="mb-3 shrink-0 border-rush-border bg-rush-surface/40 py-2">
              <CardDescription className="text-rush-muted">
                Loading programme data…
              </CardDescription>
            </Card>
          )}

          {epgQuery.error && programmes.length === 0 && (
            <Card className="mb-3 shrink-0 border-amber-400/30 bg-amber-400/10 py-2">
              <CardDescription className="text-amber-100/90">
                Programme data unavailable.{" "}
                <button type="button" className="underline" onClick={() => void epgQuery.refetch()}>
                  Retry
                </button>
              </CardDescription>
            </Card>
          )}

          <div className="hidden min-h-0 min-w-0 flex-1 flex-col lg:flex">
            {filteredChannels.length === 0 ? (
              <Card>
                <CardDescription>No channels match your filters.</CardDescription>
              </Card>
            ) : (
              <EpgGrid
                className="min-h-0 flex-1"
                channels={filteredChannels}
                programmes={programmes}
                now={now}
                favoriteIds={favoriteIds}
                onToggleFavorite={handleToggleFavorite}
                onTuneChannel={handleTuneChannel}
                onChannelHover={(channel) => prefetchStream(channel.streamUrl)}
              />
            )}
          </div>

          <MobileNowNextList
            channels={filteredChannels}
            programmes={programmes}
            now={now}
            onTuneChannel={handleTuneChannel}
          />
        </div>

        <div className="hidden min-w-0 xl:block">
          {tunedChannel && isXlUp ? (
            <GuidePlayerPanel
              channel={tunedChannel}
              programmes={programmes}
              now={now}
              onClose={() => setTunedChannelId(null)}
            />
          ) : (
            <div className="rounded-xl border border-dashed border-rush-border bg-rush-surface/30 p-6 text-center">
              <p className="text-xs text-rush-muted">Select a channel to preview</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
