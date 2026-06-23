import "server-only";

import {
  allowsDirectIptvFallback,
  getEnv,
  isIptvConfigured,
  isJellyfinConfigured,
  prefersJellyfinLiveTv,
} from "@/lib/config/env";
import {
  fetchJellyfinChannels,
  fetchJellyfinEpg,
  jellyfinLiveTvAvailable,
  refreshJellyfinLiveTv,
} from "@/lib/jellyfin/livetv";
import {
  iptvCacheManager,
  resolveCacheStatus,
  type IptvCacheStatus,
} from "@/lib/iptv/cache";
import { parseM3uStream, parseXmltvStream } from "@/lib/iptv/parser";
import { filterEpgForChannels, filterChannelsByMode, type RegionFilterMode } from "@/lib/iptv/filters";
import { getChannelUpstream, setChannelUpstreamMap } from "@/lib/iptv/upstream";
import {
  fetchXtreamChannelsViaApi,
  fetchXtreamM3uUrl,
  buildXtreamXmltvUrl,
  getXtreamConfig,
} from "@/lib/iptv/xtream";
import type { IptvChannelSnapshot, IptvEpgSnapshot } from "@/types/iptv";

let channelsRefreshTimer: NodeJS.Timeout | null = null;
let epgRefreshTimer: NodeJS.Timeout | null = null;

type IptvDataResult<T> = {
  data: T;
  stale: boolean;
  refreshing: boolean;
  cacheStatus: IptvCacheStatus;
};

function applyRegionFilterToChannels(
  snapshot: IptvChannelSnapshot,
  upstream: Map<string, string>,
  mode: RegionFilterMode,
): { snapshot: IptvChannelSnapshot; upstream: Map<string, string>; upstreamChannelCount: number } {
  const upstreamChannelCount = snapshot.channels.length;
  const filtered = filterChannelsByMode(snapshot.channels, mode);
  const allowed = new Set(filtered.map((channel) => channel.id));
  const filteredUpstream = new Map(
    [...upstream.entries()].filter(([id]) => allowed.has(id)),
  );
  return {
    snapshot: { ...snapshot, channels: filtered },
    upstream: filteredUpstream,
    upstreamChannelCount,
  };
}

function getRegionFilterMode(): RegionFilterMode {
  const env = getEnv();
  if (env.IPTV_US_ONLY) return "us";
  if (env.IPTV_ENGLISH_ONLY) return "english";
  return "none";
}

function shouldStoreRegionFiltered(): boolean {
  return getRegionFilterMode() !== "none";
}

export class IptvService {
  async getChannels(options?: { forceRefresh?: boolean }): Promise<IptvDataResult<IptvChannelSnapshot>> {
    await iptvCacheManager.ensureHydrated();
    const cached = iptvCacheManager.getChannels();

    if (cached.value && !options?.forceRefresh && !cached.isStale) {
      setChannelUpstreamMap(new Map(Object.entries(cached.value.upstream)));
      return {
        data: cached.value.snapshot,
        stale: false,
        refreshing: false,
        cacheStatus: "HIT",
      };
    }

    if (cached.value && cached.isStale && !options?.forceRefresh) {
      setChannelUpstreamMap(new Map(Object.entries(cached.value.upstream)));
      void this.refreshChannelsInBackground();
      return {
        data: cached.value.snapshot,
        stale: true,
        refreshing: Boolean(cached.meta?.isRefreshing),
        cacheStatus: resolveCacheStatus({
          hadCachedValue: true,
          isStale: true,
          syncFetched: false,
        }),
      };
    }

    const refreshed = await iptvCacheManager.withRefreshLock("channels", () =>
      this.refreshChannels(),
    );

    return {
      data: refreshed,
      stale: false,
      refreshing: false,
      cacheStatus: "MISS",
    };
  }

  async getEpg(options?: { forceRefresh?: boolean }): Promise<IptvDataResult<IptvEpgSnapshot>> {
    await iptvCacheManager.ensureHydrated();
    const cached = iptvCacheManager.getEpg();

    if (cached.value && !options?.forceRefresh && !cached.isStale) {
      return {
        data: cached.value,
        stale: false,
        refreshing: false,
        cacheStatus: "HIT",
      };
    }

    if (cached.value && cached.isStale && !options?.forceRefresh) {
      void this.refreshEpgInBackground();
      return {
        data: cached.value,
        stale: true,
        refreshing: Boolean(cached.meta?.isRefreshing),
        cacheStatus: resolveCacheStatus({
          hadCachedValue: true,
          isStale: true,
          syncFetched: false,
        }),
      };
    }

    const refreshed = await iptvCacheManager.withRefreshLock("epg", () => this.refreshEpg());
    return {
      data: refreshed,
      stale: false,
      refreshing: false,
      cacheStatus: "MISS",
    };
  }

  getChannelPlaybackUrl(
    channelId: string,
    options?: { format?: "hls" | "ts" },
  ): string | undefined {
    return getChannelUpstream(channelId, options?.format);
  }

  startBackgroundRefresh(): void {
    if (!isIptvConfigured()) {
      return;
    }

    const env = getEnv();

    if (!channelsRefreshTimer) {
      channelsRefreshTimer = setInterval(() => {
        void this.refreshChannelsInBackground();
      }, env.IPTV_REFRESH_INTERVAL_SECONDS * 1000);

      if (typeof channelsRefreshTimer.unref === "function") {
        channelsRefreshTimer.unref();
      }
    }

    if (!epgRefreshTimer) {
      epgRefreshTimer = setInterval(() => {
        void this.refreshEpgInBackground();
      }, env.IPTV_EPG_REFRESH_INTERVAL_SECONDS * 1000);

      if (typeof epgRefreshTimer.unref === "function") {
        epgRefreshTimer.unref();
      }
    }
  }

  private async refreshChannelsInBackground(): Promise<void> {
    await iptvCacheManager.withRefreshLock("channels", () => this.refreshChannels());
  }

  private async refreshEpgInBackground(): Promise<void> {
    await iptvCacheManager.withRefreshLock("epg", () => this.refreshEpg());
  }

  private async refreshChannels(): Promise<IptvChannelSnapshot> {
    const env = getEnv();

    if (prefersJellyfinLiveTv(env) && isJellyfinConfigured(env)) {
      try {
        const hasLiveTv = await jellyfinLiveTvAvailable();
        if (hasLiveTv) {
          const fetched = await fetchJellyfinChannels();
          let { snapshot, upstream } = fetched;
          if (shouldStoreRegionFiltered()) {
            const mode = getRegionFilterMode();
            const filtered = applyRegionFilterToChannels(snapshot, upstream, mode);
            snapshot = filtered.snapshot;
            upstream = filtered.upstream;
            iptvCacheManager.setChannels(snapshot, upstream, filtered.upstreamChannelCount);
          } else {
            iptvCacheManager.setChannels(snapshot, upstream);
          }
          setChannelUpstreamMap(upstream);
          return snapshot;
        }
        if (env.IPTV_BACKEND === "jellyfin") {
          await refreshJellyfinLiveTv();
        }
      } catch {
        if (env.IPTV_BACKEND === "jellyfin") {
          throw new Error("Live TV is not available from the media engine");
        }
      }
    }

    if (!allowsDirectIptvFallback(env)) {
      const emptyUpstream = new Map<string, string>();
      setChannelUpstreamMap(emptyUpstream);
      const empty = { generatedAt: new Date().toISOString(), channels: [] };
      iptvCacheManager.setChannels(empty, emptyUpstream);
      return empty;
    }

    const xtream = getXtreamConfig(env);

    let snapshot: IptvChannelSnapshot;
    let upstream: Map<string, string>;

    if (xtream) {
      try {
        const fetched = await fetchXtreamChannelsViaApi(xtream);
        snapshot = fetched.snapshot;
        upstream = fetched.upstream;
      } catch {
        const m3uUrl = await fetchXtreamM3uUrl(xtream);
        const parsed = await parseM3uStream(m3uUrl);
        snapshot = parsed.snapshot;
        upstream = parsed.upstream;
      }
    } else if (env.IPTV_M3U_URL) {
      const parsed = await parseM3uStream(env.IPTV_M3U_URL);
      snapshot = parsed.snapshot;
      upstream = parsed.upstream;
    } else {
      const emptyUpstream = new Map<string, string>();
      setChannelUpstreamMap(emptyUpstream);
      const empty = { generatedAt: new Date().toISOString(), channels: [] };
      iptvCacheManager.setChannels(empty, emptyUpstream);
      return empty;
    }

    if (shouldStoreRegionFiltered()) {
      const mode = getRegionFilterMode();
      const filtered = applyRegionFilterToChannels(snapshot, upstream, mode);
      snapshot = filtered.snapshot;
      upstream = filtered.upstream;
      iptvCacheManager.setChannels(snapshot, upstream, filtered.upstreamChannelCount);
    } else {
      iptvCacheManager.setChannels(snapshot, upstream);
    }

    setChannelUpstreamMap(upstream);
    return snapshot;
  }

  private async refreshEpg(): Promise<IptvEpgSnapshot> {
    const env = getEnv();

    if (prefersJellyfinLiveTv(env) && isJellyfinConfigured(env)) {
      try {
        const hasLiveTv = await jellyfinLiveTvAvailable();
        if (hasLiveTv) {
          let channelIds: string[] | undefined;
          if (shouldStoreRegionFiltered()) {
            const channelsResult = await this.getChannels();
            channelIds = channelsResult.data.channels.map((channel) => channel.id);
          }
          let snapshot = await fetchJellyfinEpg(channelIds);
          if (shouldStoreRegionFiltered()) {
            const channelsResult = await this.getChannels();
            snapshot = filterEpgForChannels(snapshot, channelsResult.data.channels);
          }
          iptvCacheManager.setEpg(snapshot);
          return snapshot;
        }
      } catch {
        if (env.IPTV_BACKEND === "jellyfin") {
          throw new Error("Program guide is not available from the media engine");
        }
      }
    }

    if (!allowsDirectIptvFallback(env)) {
      const empty = { generatedAt: new Date().toISOString(), programmes: [] };
      iptvCacheManager.setEpg(empty);
      return empty;
    }

    const xtream = getXtreamConfig(env);

    let snapshot: IptvEpgSnapshot;

    if (env.IPTV_EPG_URL) {
      snapshot = await parseXmltvStream(env.IPTV_EPG_URL);
    } else if (xtream) {
      try {
        snapshot = await parseXmltvStream(buildXtreamXmltvUrl(xtream));
      } catch {
        snapshot = { generatedAt: new Date().toISOString(), programmes: [] };
      }
    } else {
      snapshot = { generatedAt: new Date().toISOString(), programmes: [] };
    }

    if (shouldStoreRegionFiltered()) {
      const channelsResult = await this.getChannels();
      snapshot = filterEpgForChannels(snapshot, channelsResult.data.channels);
    }

    iptvCacheManager.setEpg(snapshot);
    return snapshot;
  }
}

export const iptvService = new IptvService();
