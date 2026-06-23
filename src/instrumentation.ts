export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") {
    return;
  }

  try {
    const { isIptvConfigured } = await import("@/lib/config/env");
    const { getEnvOrNull } = await import("@/lib/config/env");

    if (!getEnvOrNull() || !isIptvConfigured()) {
      return;
    }

    const { iptvCacheManager } = await import("@/lib/iptv/cache");
    const { iptvService } = await import("@/lib/iptv/service");
    const { setChannelUpstreamMap } = await import("@/lib/iptv/upstream");

    await iptvCacheManager.ensureHydrated();

    const cachedChannels = iptvCacheManager.getChannels();
    if (cachedChannels.value) {
      setChannelUpstreamMap(new Map(Object.entries(cachedChannels.value.upstream)));
    }

    iptvService.startBackgroundRefresh();

    if (!cachedChannels.value) {
      void iptvService.getChannels();
    }

    if (!iptvCacheManager.getEpg().value) {
      void iptvService.getEpg();
    }
  } catch (error) {
    console.error("[rushify] IPTV warm-up failed:", error);
  }
}
