import "server-only";

import { getEnvOrNull, isDirectIptvConfigured, isIptvConfigured } from "@/lib/config/env";
import { getPublicUrl } from "@/lib/config/public-url";
import { getRushifyUsers } from "@/lib/auth/rushify-users";
import { getJellyfinStatus } from "@/lib/jellyfin/client";
import { resolveLiveTvBackend } from "@/lib/iptv/backend";
import { getIptvStatus } from "@/lib/iptv/status";
import type { AdminOverviewResponse } from "@/types/rushify";

export async function getAdminOverview(): Promise<AdminOverviewResponse> {
  const env = getEnvOrNull();
  const [jellyfin, iptv, liveTvBackend] = await Promise.all([
    getJellyfinStatus(),
    getIptvStatus(),
    resolveLiveTvBackend(),
  ]);
  const users = env ? getRushifyUsers(env) : [];

  const channelCount = iptv.channelCount ?? 0;
  const iptvConfigured = env ? isIptvConfigured(env) : false;
  const directProviderConfigured = env ? isDirectIptvConfigured(env) : false;

  return {
    jellyfin: {
      connected: jellyfin.connected,
      configured: jellyfin.configured,
      serverName: jellyfin.serverName,
      version: jellyfin.version,
      movieCount: jellyfin.movieCount,
      seriesCount: jellyfin.seriesCount,
      episodeCount: jellyfin.episodeCount,
      serverUrlConfigured: Boolean(env?.JELLYFIN_SERVER_URL),
    },
    iptv: {
      connected: iptvConfigured && channelCount > 0,
      configured: iptvConfigured,
      backend: liveTvBackend.backend,
      directFallback: liveTvBackend.directFallback,
      channelCount: iptv.channelCount,
      totalChannelCount: iptv.totalChannelCount,
      usOnly: iptv.usOnly,
      epgCount: iptv.epgProgrammeCount,
      lastRefresh: iptv.cache?.lastEpgRefresh ?? iptv.cache?.lastChannelsRefresh,
      credentialsConfigured: directProviderConfigured,
    },
    publicUrl: getPublicUrl(),
    pinEnabled: Boolean(env?.RUSHIFY_ACCESS_PIN),
    tlsEnabled: env?.RUSHIFY_TLS ?? false,
    userCount: users.length,
    users: users.map((user) => ({ username: user.username, role: user.role })),
  };
}
