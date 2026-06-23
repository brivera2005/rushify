import "server-only";

import { iptvCacheManager } from "@/lib/iptv/cache";

const channelUpstream = new Map<string, string>();

export async function ensureUpstreamFromCache(): Promise<boolean> {
  await iptvCacheManager.ensureHydrated();
  const cached = iptvCacheManager.getChannels();
  if (!cached.value) {
    return false;
  }

  setChannelUpstreamMap(new Map(Object.entries(cached.value.upstream)));
  return channelUpstream.size > 0;
}

export function setChannelUpstreamMap(upstream: Map<string, string>): void {
  channelUpstream.clear();
  upstream.forEach((url, id) => {
    channelUpstream.set(id, url);
  });
}

function toTsUrl(hlsUrl: string): string {
  if (hlsUrl.endsWith(".m3u8")) {
    return hlsUrl.replace(/\.m3u8(\?.*)?$/, ".ts$1");
  }
  return hlsUrl;
}

export function getChannelUpstream(
  channelId: string,
  format: "hls" | "ts" = "hls",
): string | undefined {
  const url = channelUpstream.get(channelId);
  if (!url) return undefined;
  return format === "ts" ? toTsUrl(url) : url;
}

export function getUpstreamChannelCount(): number {
  return channelUpstream.size;
}
