export type RushifyNavItem = {
  label: string;
  href: string;
  icon: "home" | "live" | "movies" | "shows" | "settings";
};

export type DashboardSection = {
  id: string;
  title: string;
  description: string;
};

export type ServiceCheckStatus = "ok" | "error" | "not_configured";

export type HealthStatus = {
  status: "ok" | "degraded" | "error";
  service: "rushify";
  timestamp: string;
  checks: {
    jellyfin: ServiceCheckStatus;
    iptv: ServiceCheckStatus;
  };
};

export type JellyfinStatusResponse = {
  configured: boolean;
  connected: boolean;
  serverName?: string;
  version?: string;
  movieCount?: number;
  seriesCount?: number;
  episodeCount?: number;
  discoveredUrl?: string;
  error?: string;
};

export type AdminOverviewResponse = {
  jellyfin: {
    connected: boolean;
    configured: boolean;
    serverName?: string;
    version?: string;
    movieCount?: number;
    seriesCount?: number;
    episodeCount?: number;
    serverUrlConfigured: boolean;
  };
  iptv: {
    connected: boolean;
    configured: boolean;
    backend?: "jellyfin" | "direct" | "none";
    directFallback?: boolean;
    channelCount?: number;
    totalChannelCount?: number;
    usOnly?: boolean;
    epgCount?: number;
    lastRefresh?: string;
    credentialsConfigured: boolean;
  };
  publicUrl: string;
  pinEnabled: boolean;
  tlsEnabled: boolean;
  userCount: number;
  users: Array<{ username: string; role: "admin" | "user" }>;
};

export type JellyfinDiscoveryCandidate = {
  url: string;
  status: "ok" | "fail" | "timeout";
  serverName?: string;
};

export type JellyfinDiscoveryResponse = {
  found: boolean;
  url?: string;
  serverName?: string;
  version?: string;
  candidates: JellyfinDiscoveryCandidate[];
};

export type IptvStatusResponse = {
  configured: boolean;
  /** Where live TV data is sourced — admin diagnostics only */
  backend?: "jellyfin" | "direct" | "none";
  directFallback?: boolean;
  xtreamConfigured?: boolean;
  m3uConfigured: boolean;
  epgConfigured: boolean;
  channelsCached: boolean;
  epgCached: boolean;
  channelCount?: number;
  totalChannelCount?: number;
  usOnly?: boolean;
  englishOnly?: boolean;
  programmeCount?: number;
  epgProgrammeCount?: number;
  cache?: {
    channelsFetchedAt?: string;
    epgFetchedAt?: string;
    channelsRefreshing?: boolean;
    epgRefreshing?: boolean;
    cacheAgeSeconds?: number;
    epgCacheAgeSeconds?: number;
    lastChannelsRefresh?: string;
    lastEpgRefresh?: string;
    nextChannelsRefresh?: string;
    nextEpgRefresh?: string;
    channelsSource?: "memory" | "disk";
    epgSource?: "memory" | "disk";
    diskCacheDir?: string;
  };
  error?: string;
};
