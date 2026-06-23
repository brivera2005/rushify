import { NextRequest, NextResponse } from "next/server";

import { getEnv } from "@/lib/config/env";

const PROXY_HEADERS = [
  "content-type",
  "content-length",
  "accept-ranges",
  "content-range",
  "cache-control",
];

/** Many IPTV providers block requests without a browser-like User-Agent. */
export const IPTV_UPSTREAM_HEADERS: HeadersInit = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  Accept: "*/*",
  Connection: "keep-alive",
};

function getUpstreamTimeoutMs(isSegment: boolean): number {
  const env = getEnv();
  if (isSegment) {
    return env.IPTV_MAX_SEGMENT_WAIT_MS;
  }
  return Math.min(env.IPTV_CONNECT_TIMEOUT_MS, env.IPTV_UPSTREAM_TIMEOUT_MS);
}

function isDirectSegmentsEnabled(): boolean {
  return getEnv().IPTV_DIRECT_SEGMENTS;
}

export function isPlaylistUrl(url: string): boolean {
  const lower = url.toLowerCase();
  return lower.includes(".m3u8") || lower.includes(".m3u") || lower.includes("mpegurl");
}

export function isMediaSegmentUrl(url: string): boolean {
  const lower = url.toLowerCase();
  return (
    lower.includes(".ts") ||
    lower.includes(".aac") ||
    lower.includes(".mp4") ||
    lower.includes(".m4s") ||
    lower.endsWith(".ts?") ||
    (!isPlaylistUrl(url) && /\/\d+\.(ts|aac|mp4)/.test(lower))
  );
}

function isPlaylistResponse(contentType: string, url: string): boolean {
  const lower = contentType.toLowerCase();
  return (
    lower.includes("mpegurl") ||
    lower.includes("m3u") ||
    isPlaylistUrl(url)
  );
}

function mergeHeaders(...sources: Array<HeadersInit | undefined>): HeadersInit {
  const merged = new Headers();
  for (const source of sources) {
    if (!source) continue;
    new Headers(source).forEach((value, key) => merged.set(key, value));
  }
  return merged;
}

async function fetchUpstream(
  upstreamUrl: string,
  init?: RequestInit,
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(
    () => controller.abort(),
    getUpstreamTimeoutMs(isMediaSegmentUrl(upstreamUrl)),
  );

  try {
    return await fetch(upstreamUrl, {
      ...init,
      redirect: "follow",
      cache: "no-store",
      signal: controller.signal,
      headers: mergeHeaders(IPTV_UPSTREAM_HEADERS, init?.headers),
    });
  } finally {
    clearTimeout(timer);
  }
}

export function rewriteM3u8Playlist(
  body: string,
  upstreamUrl: string,
  rewriteLine: (resolvedUrl: string, isNestedPlaylist: boolean) => string,
): string {
  const base = new URL(upstreamUrl);

  return body
    .split(/\r?\n/)
    .map((line) => {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) {
        return line;
      }

      const resolved = new URL(trimmed, base).href;
      const nested = isPlaylistUrl(resolved);
      return rewriteLine(resolved, nested);
    })
    .join("\n");
}

export async function proxyUpstream(
  upstreamUrl: string,
  request: NextRequest,
  options?: {
    rewrite?: (body: string, effectiveUrl: string) => string;
    headers?: HeadersInit;
    /** When true, return 302 to CDN instead of proxying bytes (browser/Android only). */
    allowRedirect?: boolean;
  },
): Promise<NextResponse> {
  const range = request.headers.get("range");
  const castToken = request.headers.get("x-rushify-cast");

  if (
    options?.allowRedirect &&
    isDirectSegmentsEnabled() &&
    !castToken &&
    isMediaSegmentUrl(upstreamUrl)
  ) {
    return NextResponse.redirect(upstreamUrl, 302);
  }

  const upstream = await fetchUpstream(upstreamUrl, {
    headers: mergeHeaders(options?.headers, range ? { Range: range } : {}),
  });

  if (!upstream.ok && upstream.status !== 206) {
    return NextResponse.json(
      { error: "Upstream playback failed", status: upstream.status },
      { status: upstream.status >= 400 ? upstream.status : 502 },
    );
  }

  const effectiveUrl = upstream.url || upstreamUrl;
  const contentType = upstream.headers.get("content-type") ?? "";

  if (options?.rewrite && isPlaylistResponse(contentType, effectiveUrl)) {
    const text = await upstream.text();
    const rewritten = options.rewrite(text, effectiveUrl);
    return new NextResponse(rewritten, {
      status: upstream.status,
      headers: {
        "Content-Type": "application/vnd.apple.mpegurl",
        "Cache-Control": "no-store",
      },
    });
  }

  const headers = new Headers();
  for (const key of PROXY_HEADERS) {
    const value = upstream.headers.get(key);
    if (value) headers.set(key, value);
  }
  headers.set("Cache-Control", "no-store");

  return new NextResponse(upstream.body, {
    status: upstream.status,
    headers,
  });
}

export function getRequestOrigin(request: NextRequest): string {
  const configured = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "");
  return configured || request.nextUrl.origin;
}

export function buildSegmentRewriteLine(
  channelId: string,
  origin: string,
  resolvedUrl: string,
  isNestedPlaylist: boolean,
): string {
  if (isNestedPlaylist || !isDirectSegmentsEnabled()) {
    const proxyUrl = new URL(`/api/stream/iptv/${encodeURIComponent(channelId)}/asset`, origin);
    proxyUrl.searchParams.set("path", resolvedUrl);
    return proxyUrl.pathname + proxyUrl.search;
  }

  return resolvedUrl;
}
