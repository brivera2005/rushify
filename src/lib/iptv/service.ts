import "server-only";

import { getEnv, isIptvConfigured } from "@/lib/config/env";
import { iptvCacheManager } from "@/lib/iptv/cache";
import { parseM3uStream, parseXmltvStream } from "@/lib/iptv/parser";
import type { IptvChannelSnapshot, IptvEpgSnapshot } from "@/types/iptv";

let refreshTimer: NodeJS.Timeout | null = null;

export class IptvService {
  async getChannels(options?: { forceRefresh?: boolean }): Promise<{
    data: IptvChannelSnapshot;
    stale: boolean;
    refreshing: boolean;
  }> {
    const cached = iptvCacheManager.getChannels<IptvChannelSnapshot>();

    if (cached.value && !options?.forceRefresh && !cached.isStale) {
      return { data: cached.value, stale: false, refreshing: false };
    }

    if (cached.value && cached.isStale && !options?.forceRefresh) {
      void this.refreshChannelsInBackground();
      return {
        data: cached.value,
        stale: true,
        refreshing: Boolean(cached.meta?.isRefreshing),
      };
    }

    const refreshed = await iptvCacheManager.withRefreshLock("channels", () =>
      this.refreshChannels(),
    );

    return { data: refreshed, stale: false, refreshing: false };
  }

  async getEpg(options?: { forceRefresh?: boolean }): Promise<{
    data: IptvEpgSnapshot;
    stale: boolean;
    refreshing: boolean;
  }> {
    const cached = iptvCacheManager.getEpg<IptvEpgSnapshot>();

    if (cached.value && !options?.forceRefresh && !cached.isStale) {
      return { data: cached.value, stale: false, refreshing: false };
    }

    if (cached.value && cached.isStale && !options?.forceRefresh) {
      void this.refreshEpgInBackground();
      return {
        data: cached.value,
        stale: true,
        refreshing: Boolean(cached.meta?.isRefreshing),
      };
    }

    const refreshed = await iptvCacheManager.withRefreshLock("epg", () => this.refreshEpg());
    return { data: refreshed, stale: false, refreshing: false };
  }

  startBackgroundRefresh(): void {
    if (refreshTimer || !isIptvConfigured()) {
      return;
    }

    const intervalMs = getEnv().IPTV_REFRESH_INTERVAL_SECONDS * 1000;

    refreshTimer = setInterval(() => {
      void this.refreshChannelsInBackground();
      void this.refreshEpgInBackground();
    }, intervalMs);

    if (typeof refreshTimer.unref === "function") {
      refreshTimer.unref();
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
    if (!env.IPTV_M3U_URL) {
      return { generatedAt: new Date().toISOString(), channels: [] };
    }
    const snapshot = await parseM3uStream(env.IPTV_M3U_URL);
    iptvCacheManager.setChannels(snapshot);
    return snapshot;
  }

  private async refreshEpg(): Promise<IptvEpgSnapshot> {
    const env = getEnv();
    if (!env.IPTV_EPG_URL) {
      return { generatedAt: new Date().toISOString(), programmes: [] };
    }
    const snapshot = await parseXmltvStream(env.IPTV_EPG_URL);
    iptvCacheManager.setEpg(snapshot);
    return snapshot;
  }
}

export const iptvService = new IptvService();
