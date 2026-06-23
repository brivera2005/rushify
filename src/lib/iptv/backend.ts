import "server-only";

import {
  allowsDirectIptvFallback,
  getEnvOrNull,
  isDirectIptvConfigured,
  isIptvConfigured,
  isJellyfinConfigured,
  prefersJellyfinLiveTv,
} from "@/lib/config/env";
import { jellyfinLiveTvAvailable } from "@/lib/jellyfin/livetv";

export type LiveTvBackend = "jellyfin" | "direct" | "none";

export async function resolveLiveTvBackend(): Promise<{
  backend: LiveTvBackend;
  directFallback: boolean;
}> {
  const env = getEnvOrNull();
  if (!env || !isIptvConfigured(env)) {
    return { backend: "none", directFallback: false };
  }

  if (prefersJellyfinLiveTv(env) && isJellyfinConfigured(env)) {
    try {
      if (await jellyfinLiveTvAvailable()) {
        return { backend: "jellyfin", directFallback: false };
      }
    } catch {
      // fall through
    }
  }

  if (allowsDirectIptvFallback(env) && isDirectIptvConfigured(env)) {
    return {
      backend: "direct",
      directFallback: env.IPTV_BACKEND === "auto" && isJellyfinConfigured(env),
    };
  }

  return { backend: "none", directFallback: false };
}
