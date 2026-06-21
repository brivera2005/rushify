import "server-only";

import { MemoryCache } from "@/lib/cache/memory-cache";
import { getEnv } from "@/lib/config/env";
import type { IptvCacheMeta } from "@/types/iptv";

const env = getEnv();
const channelTtlMs = env.IPTV_CACHE_TTL_SECONDS * 1000;
const channelStaleMs = env.IPTV_STALE_TTL_SECONDS * 1000;

export const IPTV_CACHE_KEYS = {
  channels: "iptv:channels",
  epg: "iptv:epg",
} as const;

const refreshLocks = new Map<string, Promise<unknown>>();

export class IptvCacheManager {
  private readonly channelsCache = new MemoryCache<unknown>({
    ttlMs: channelTtlMs,
    staleTtlMs: channelStaleMs,
    maxEntries: 4,
  });

  private readonly epgCache = new MemoryCache<unknown>({
    ttlMs: channelTtlMs,
    staleTtlMs: channelStaleMs,
    maxEntries: 4,
  });

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
      isRefreshing: refreshLocks.has(key),
    };
  }

  getChannels<T>(): { value: T | null; meta: IptvCacheMeta | null; isStale: boolean } {
    return this.read(IPTV_CACHE_KEYS.channels, this.channelsCache);
  }

  getEpg<T>(): { value: T | null; meta: IptvCacheMeta | null; isStale: boolean } {
    return this.read(IPTV_CACHE_KEYS.epg, this.epgCache);
  }

  setChannels<T>(value: T): void {
    this.channelsCache.set(IPTV_CACHE_KEYS.channels, value);
  }

  setEpg<T>(value: T): void {
    this.epgCache.set(IPTV_CACHE_KEYS.epg, value);
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
    cache: MemoryCache<unknown>,
  ): { value: T | null; meta: IptvCacheMeta | null; isStale: boolean } {
    const entry = cache.get(key) ?? cache.getStale(key);
    if (!entry) {
      return { value: null, meta: null, isStale: false };
    }

    return {
      value: entry.value as T,
      meta: this.getMeta(key, cache),
      isStale: !cache.isFresh(entry),
    };
  }
}

export const iptvCacheManager = new IptvCacheManager();
