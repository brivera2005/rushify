import "server-only";

import { getEnvOrNull, isIptvConfigured, isXtreamConfigured } from "@/lib/config/env";
import { iptvCacheManager } from "@/lib/iptv/cache";
import { resolveRegionFilter } from "@/lib/iptv/filters";
import { resolveLiveTvBackend } from "@/lib/iptv/backend";
import { getUpstreamChannelCount } from "@/lib/iptv/upstream";
import type { IptvStatusResponse } from "@/types/rushify";

function secondsSince(isoTimestamp: string | undefined): number | undefined {
  if (!isoTimestamp) {
    return undefined;
  }

  const ageMs = Date.now() - new Date(isoTimestamp).getTime();
  return Math.max(0, Math.floor(ageMs / 1000));
}

function nextRefreshIso(lastRefreshAt: number | null, intervalSeconds: number): string | undefined {
  if (!lastRefreshAt) {
    return undefined;
  }

  return new Date(lastRefreshAt + intervalSeconds * 1000).toISOString();
}

export async function getIptvStatus(): Promise<IptvStatusResponse> {
  const env = getEnvOrNull();
  const xtreamConfigured = env ? isXtreamConfigured(env) : false;
  const m3uConfigured = Boolean(env?.IPTV_M3U_URL);
  const epgConfigured = Boolean(env?.IPTV_EPG_URL) || xtreamConfigured;
  const configured = env ? isIptvConfigured(env) : false;

  if (!configured) {
    return {
      configured: false,
      xtreamConfigured: false,
      m3uConfigured: false,
      epgConfigured: false,
      channelsCached: false,
      epgCached: false,
    };
  }

  await iptvCacheManager.ensureHydrated();

  const channels = iptvCacheManager.getChannels();
  const epg = iptvCacheManager.getEpg();
  const { backend, directFallback } = await resolveLiveTvBackend();
  const epgSnapshot = epg.value;
  const channelsFetchedAt = channels.meta?.fetchedAt;
  const epgFetchedAt = epg.meta?.fetchedAt;
  const channelsRefreshInterval = env?.IPTV_REFRESH_INTERVAL_SECONDS ?? 600;
  const epgRefreshInterval = env?.IPTV_EPG_REFRESH_INTERVAL_SECONDS ?? 1800;
  const { getDiskCacheDir } = await import("@/lib/cache/disk-cache");

  const regionFilter = env
    ? resolveRegionFilter({ usOnly: null, englishOnly: null }, env)
    : "none";
  const filteredCount =
    channels.value?.snapshot.channels.length ?? getUpstreamChannelCount();
  const totalChannelCount = channels.value?.upstreamChannelCount ?? filteredCount;

  return {
    configured: true,
    backend,
    directFallback,
    xtreamConfigured,
    m3uConfigured,
    epgConfigured,
    channelsCached: Boolean(channels.value),
    epgCached: Boolean(epg.value),
    channelCount: filteredCount,
    totalChannelCount,
    usOnly: regionFilter === "us",
    englishOnly: regionFilter === "english",
    programmeCount: epgSnapshot?.programmes.length,
    epgProgrammeCount: epgSnapshot?.programmes.length,
    cache: {
      channelsFetchedAt,
      epgFetchedAt,
      channelsRefreshing: channels.meta?.isRefreshing,
      epgRefreshing: epg.meta?.isRefreshing,
      cacheAgeSeconds: secondsSince(channelsFetchedAt),
      epgCacheAgeSeconds: secondsSince(epgFetchedAt),
      lastChannelsRefresh: channelsFetchedAt,
      lastEpgRefresh: epgFetchedAt,
      nextChannelsRefresh: nextRefreshIso(
        iptvCacheManager.getLastChannelsRefreshAt(),
        channelsRefreshInterval,
      ),
      nextEpgRefresh: nextRefreshIso(iptvCacheManager.getLastEpgRefreshAt(), epgRefreshInterval),
      channelsSource: channels.source ?? undefined,
      epgSource: epg.source ?? undefined,
      diskCacheDir: getDiskCacheDir(),
    },
  };
}
