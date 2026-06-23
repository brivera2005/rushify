import { NextRequest, NextResponse } from "next/server";

import { iptvService } from "@/lib/iptv/service";
import { ensureUpstreamFromCache, getChannelUpstream } from "@/lib/iptv/upstream";
import {
  buildSegmentRewriteLine,
  getRequestOrigin,
  IPTV_UPSTREAM_HEADERS,
  proxyUpstream,
  rewriteM3u8Playlist,
} from "@/lib/stream/proxy";

export const dynamic = "force-dynamic";

type RouteContext = {
  params: { path: string[] };
};

export async function GET(request: NextRequest, context: RouteContext): Promise<NextResponse> {
  const segments = context.params.path ?? [];

  if (segments[0] !== "iptv" || !segments[1]) {
    return NextResponse.json({ error: "Invalid stream path" }, { status: 404 });
  }

  const channelId = decodeURIComponent(segments[1]);
  const origin = getRequestOrigin(request);

  if (segments[2] === "asset") {
    const path = request.nextUrl.searchParams.get("path");
    if (!path) {
      return NextResponse.json({ error: "Missing asset path" }, { status: 400 });
    }

    return proxyUpstream(path, request, {
      headers: IPTV_UPSTREAM_HEADERS,
      allowRedirect: true,
    });
  }

  iptvService.startBackgroundRefresh();
  const format = request.nextUrl.searchParams.get("format") === "ts" ? "ts" : "hls";

  let upstreamUrl = getChannelUpstream(channelId, format);
  if (!upstreamUrl) {
    const hydrated = await ensureUpstreamFromCache();
    upstreamUrl = getChannelUpstream(channelId, format);
    if (!upstreamUrl && !hydrated) {
      await iptvService.getChannels({ forceRefresh: false });
      upstreamUrl = iptvService.getChannelPlaybackUrl(channelId, { format });
    }
  }
  if (!upstreamUrl) {
    return NextResponse.json({ error: "Channel not found" }, { status: 404 });
  }

  return proxyUpstream(upstreamUrl, request, {
    headers: IPTV_UPSTREAM_HEADERS,
    rewrite: (body, effectiveUrl) =>
      rewriteM3u8Playlist(body, effectiveUrl, (resolved, isNestedPlaylist) =>
        buildSegmentRewriteLine(channelId, origin, resolved, isNestedPlaylist),
      ),
  });
}
