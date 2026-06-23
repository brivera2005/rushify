import "server-only";

import { MemoryCache } from "@/lib/cache/memory-cache";
import { getEnv } from "@/lib/config/env";
import type { IptvCacheMeta, IptvChannelSnapshot, IptvEpgSnapshot } from "@/types/iptv";

const env = getEnv();
const channelTtlMs = env.IPTV_CACHE_TTL_SECONDS * 1000;
const channelStaleMs = env.IPTV_STALE_TTL_SECONDS * 1000;
const epgTtlMs = env.IPTV_EPG_CACHE_TTL_SECONDS * 1000;
const epgStaleMs = env.IPTV_EPG_STALE_TTL_SECONDS * 1000;

export const IPTV_CACHE_KEYS = {
  channels: "iptv:channels",
  epg: "iptv:epg",
} as const;

export const IPTV_DISK_KEYS = {
  channels: "channels",
  epg: "epg",
} as const;

export type IptvCacheSource = "memory" | "disk";

export type ChannelsCacheBundle = {
  snapshot: IptvChannelSnapshot;
  upstream: Record<string, string>;
  /** Channel count before region filter was applied at refresh time. */
  upstreamChannelCount?: number;
};

const refreshLocks = new Map<string, Promise<unknown>>();

export class IptvCacheManager {
  private readonly channelsCache = new MemoryCache<ChannelsCacheBundle>({
    ttlMs: channelTtlMs,
    staleTtlMs: channelStaleMs,
    maxEntries: 4,
  });

  private readonly epgCache = new MemoryCache<IptvEpgSnapshot>({
    ttlMs: epgTtlMs,
    staleTtlMs: epgStaleMs,
    maxEntries: 4,
  });

  private hydratePromise: Promise<void> | null = null;
  private channelsSource: IptvCacheSource | null = null;
  private epgSource: IptvCacheSource | null = null;
  private lastChannelsRefreshAt: number | null = null;
  private lastEpgRefreshAt: number | null = null;

  async ensureHydrated(): Promise<void> {
    if (this.hydratePromise) {
      return this.hydratePromise;
    }

    this.hydratePromise = this.hydrateFromDisk();
    return this.hydratePromise;
  }

  private async hydrateFromDisk(): Promise<void> {
    const { readDiskCache } = await import("@/lib/cache/disk-cache");
    const [channelsDisk, epgDisk] = await Promise.all([
      readDiskCache<ChannelsCacheBundle>(IPTV_DISK_KEYS.channels),
      readDiskCache<IptvEpgSnapshot>(IPTV_DISK_KEYS.epg),
    ]);

    if (channelsDisk && !this.channelsCache.getStale(IPTV_CACHE_KEYS.channels)) {
      this.channelsCache.setWithTimestamps(IPTV_CACHE_KEYS.channels, channelsDisk.value, channelsDisk);
      this.channelsSource = "disk";
      this.lastChannelsRefreshAt = channelsDisk.createdAt;
    }

    if (epgDisk && !this.epgCache.getStale(IPTV_CACHE_KEYS.epg)) {
      this.epgCache.setWithTimestamps(IPTV_CACHE_KEYS.epg, epgDisk.value, epgDisk);
      this.epgSource = "disk";
      this.lastEpgRefreshAt = epgDisk.createdAt;
    }
  }

  getMeta(key: string, cache: MemoryCache<unknown>): IptvCacheMeta | null {
    const entry = cache.getStale(key);
    if (!entry) {
      return null;
    }

    return {
      key,
      fetchedAt: new Date(entry.createdAt).toISOString(),
      staleAt: new Date(entry.staleAt).toISOString(),
      expiresAt: new Date(entry.expiresAt).toISOString(),
      isRefreshing: refreshLocks.has(key.replace("iptv:", "")),
    };
  }

  getChannels(): {
    value: ChannelsCacheBundle | null;
    meta: IptvCacheMeta | null;
    isStale: boolean;
    source: IptvCacheSource | null;
  } {
    return this.read(IPTV_CACHE_KEYS.channels, this.channelsCache, this.channelsSource);
  }

  getEpg(): {
    value: IptvEpgSnapshot | null;
    meta: IptvCacheMeta | null;
    isStale: boolean;
    source: IptvCacheSource | null;
  } {
    return this.read(IPTV_CACHE_KEYS.epg, this.epgCache, this.epgSource);
  }

  setChannels(
    snapshot: IptvChannelSnapshot,
    upstream: Map<string, string>,
    upstreamChannelCount?: number,
  ): void {
    const bundle: ChannelsCacheBundle = {
      snapshot,
      upstream: Object.fromEntries(upstream.entries()),
      upstreamChannelCount,
    };
    const entry = this.channelsCache.set(IPTV_CACHE_KEYS.channels, bundle);
    this.channelsSource = "memory";
    this.lastChannelsRefreshAt = entry.createdAt;
    void import("@/lib/cache/disk-cache").then(({ writeDiskCache }) =>
      writeDiskCache(IPTV_DISK_KEYS.channels, entry),
    );
  }

  setEpg(value: IptvEpgSnapshot): void {
    const entry = this.epgCache.set(IPTV_CACHE_KEYS.epg, value);
    this.epgSource = "memory";
    this.lastEpgRefreshAt = entry.createdAt;
    void import("@/lib/cache/disk-cache").then(({ writeDiskCache }) =>
      writeDiskCache(IPTV_DISK_KEYS.epg, entry),
    );
  }

  getLastChannelsRefreshAt(): number | null {
    return this.lastChannelsRefreshAt;
  }

  getLastEpgRefreshAt(): number | null {
    return this.lastEpgRefreshAt;
  }

  /**
   * Prevents concurrent refresh storms when multiple API requests arrive during stale windows.
   */
  async withRefreshLock<T>(key: string, refreshFn: () => Promise<T>): Promise<T> {
    const existing = refreshLocks.get(key) as Promise<T> | undefined;
    if (existing) {
      return existing;
    }

    const task = refreshFn().finally(() => {
      refreshLocks.delete(key);
    });

    refreshLocks.set(key, task);
    return task;
  }

  private read<T>(
    key: string,
    cache: MemoryCache<T>,
    source: IptvCacheSource | null,
  ): { value: T | null; meta: IptvCacheMeta | null; isStale: boolean; source: IptvCacheSource | null } {
    const entry = cache.getStale(key);
    if (!entry || Date.now() > entry.expiresAt) {
      return { value: null, meta: null, isStale: false, source: null };
    }

    return {
      value: entry.value,
      meta: this.getMeta(key, cache as MemoryCache<unknown>),
      isStale: !cache.isFresh(entry),
      source,
    };
  }
}

export const iptvCacheManager = new IptvCacheManager();

export type IptvCacheStatus = "HIT" | "STALE" | "MISS";

export function resolveCacheStatus(options: {
  hadCachedValue: boolean;
  isStale: boolean;
  syncFetched: boolean;
}): IptvCacheStatus {
  if (options.syncFetched) {
    return "MISS";
  }
  if (options.hadCachedValue && options.isStale) {
    return "STALE";
  }
  return "HIT";
}

export function iptvCacheResponseHeaders(cacheStatus: IptvCacheStatus): HeadersInit {
  return {
    "Cache-Control": "private, max-age=60",
    "X-Cache-Status": cacheStatus,
  };
}
