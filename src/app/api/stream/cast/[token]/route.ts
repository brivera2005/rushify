import { NextRequest, NextResponse } from "next/server";

import { resolveCastToken } from "@/lib/cast/tokens";
import { JellyfinClient } from "@/lib/jellyfin/client";
import { isJellyfinChannelId } from "@/lib/jellyfin/livetv";
import { resolveCastStreamRequest, type StreamQuality } from "@/lib/jellyfin/stream";
import { getRequestOrigin, IPTV_UPSTREAM_HEADERS, proxyUpstream, rewriteM3u8Playlist } from "@/lib/stream/proxy";
import { iptvService } from "@/lib/iptv/service";

export const dynamic = "force-dynamic";

type RouteContext = {
  params: { token: string };
};

function buildCastAssetUrl(token: string, origin: string, resolvedUrl: string): string {
  const proxyUrl = new URL(`/api/stream/cast/${encodeURIComponent(token)}/asset`, origin);
  proxyUrl.searchParams.set("path", resolvedUrl);
  return proxyUrl.pathname + proxyUrl.search;
}

async function proxyJellyfinLiveCast(
  token: string,
  channelId: string,
  request: NextRequest,
): Promise<NextResponse> {
  const client = await JellyfinClient.fromEnv();
  const origin = getRequestOrigin(request);
  const jellyfinId = channelId.replace(/^jf-/, "");
  const { path, searchParams } = resolveCastStreamRequest(jellyfinId, "auto");
  const upstreamUrl = client.buildUrl(path, searchParams);

  const upstream = await client.proxyRaw(
    { method: "GET", path, searchParams },
    request.headers,
  );

  if (!upstream.ok) {
    return NextResponse.json(
      { error: "Live TV playback failed", status: upstream.status },
      { status: upstream.status >= 400 ? upstream.status : 502 },
    );
  }

  const text = await upstream.text();
  const effectiveUrl = upstream.url || upstreamUrl;
  const rewritten = rewriteM3u8Playlist(text, effectiveUrl, (resolved) =>
    buildCastAssetUrl(token, origin, resolved),
  );

  return new NextResponse(rewritten, {
    status: upstream.status,
    headers: {
      "Content-Type": "application/vnd.apple.mpegurl",
      "Cache-Control": "no-store",
    },
  });
}

async function proxyIptvCast(
  token: string,
  channelId: string,
  request: NextRequest,
): Promise<NextResponse> {
  iptvService.startBackgroundRefresh();
  await iptvService.getChannels();

  const upstreamUrl = iptvService.getChannelPlaybackUrl(channelId);
  if (!upstreamUrl) {
    return NextResponse.json({ error: "Channel not found" }, { status: 404 });
  }

  const origin = getRequestOrigin(request);

  return proxyUpstream(upstreamUrl, request, {
    headers: IPTV_UPSTREAM_HEADERS,
    rewrite: (body, effectiveUrl) =>
      rewriteM3u8Playlist(body, effectiveUrl, (resolved) =>
        buildCastAssetUrl(token, origin, resolved),
      ),
  });
}

async function proxyVodCast(
  token: string,
  itemId: string,
  quality: StreamQuality | undefined,
  request: NextRequest,
): Promise<NextResponse> {
  const client = await JellyfinClient.fromEnv();
  const origin = getRequestOrigin(request);
  const { path, searchParams } = resolveCastStreamRequest(itemId, quality ?? "auto");
  const upstreamUrl = client.buildUrl(path, searchParams);

  const upstream = await client.proxyRaw(
    { method: "GET", path, searchParams },
    request.headers,
  );

  if (!upstream.ok) {
    return NextResponse.json(
      { error: "VOD playback failed", status: upstream.status },
      { status: upstream.status >= 400 ? upstream.status : 502 },
    );
  }

  const text = await upstream.text();
  const effectiveUrl = upstream.url || upstreamUrl;
  const rewritten = rewriteM3u8Playlist(text, effectiveUrl, (resolved) =>
    buildCastAssetUrl(token, origin, resolved),
  );

  return new NextResponse(rewritten, {
    status: upstream.status,
    headers: {
      "Content-Type": "application/vnd.apple.mpegurl",
      "Cache-Control": "no-store",
    },
  });
}

export async function GET(request: NextRequest, context: RouteContext): Promise<NextResponse> {
  const token = decodeURIComponent(context.params.token ?? "");
  const payload = resolveCastToken(token);

  if (!payload) {
    return NextResponse.json({ error: "Invalid or expired cast token" }, { status: 401 });
  }

  if (payload.kind === "iptv") {
    if (isJellyfinChannelId(payload.id)) {
      return proxyJellyfinLiveCast(token, payload.id, request);
    }
    return proxyIptvCast(token, payload.id, request);
  }

  return proxyVodCast(token, payload.id, payload.quality, request);
}
