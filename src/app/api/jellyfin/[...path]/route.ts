import { NextRequest, NextResponse } from "next/server";

import { resolveMediaCredentials } from "@/lib/auth/resolve-token";
import { createJellyfinClientWithToken, type JellyfinClient } from "@/lib/jellyfin/client";
import { rewriteM3u8Playlist } from "@/lib/stream/proxy";

export const dynamic = "force-dynamic";

type RouteContext = {
  params: { path: string[] };
};

function isBinaryPath(path: string): boolean {
  return (
    path.includes("/Videos/") ||
    path.includes("/Audio/") ||
    path.includes("/Images/")
  );
}

function isPlaylistPath(path: string, contentType: string): boolean {
  const lower = contentType.toLowerCase();
  return (
    path.includes(".m3u8") ||
    lower.includes("mpegurl") ||
    lower.includes("m3u")
  );
}

/** Route Jellyfin CDN URLs through the authenticated BFF proxy. */
function buildJellyfinProxyPath(resolvedUrl: string, client: JellyfinClient): string {
  if (client.isServerUrl(resolvedUrl)) {
    const url = new URL(resolvedUrl);
    return `/api/jellyfin${url.pathname}${url.search}`;
  }
  return resolvedUrl;
}

export async function GET(request: NextRequest, context: RouteContext): Promise<NextResponse> {
  return proxyRequest(request, context, "GET");
}

export async function POST(request: NextRequest, context: RouteContext): Promise<NextResponse> {
  return proxyRequest(request, context, "POST");
}

async function proxyRequest(
  request: NextRequest,
  context: RouteContext,
  method: "GET" | "POST",
): Promise<NextResponse> {
  try {
    const credentials = await resolveMediaCredentials();
    if (!credentials) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const client = await createJellyfinClientWithToken(credentials.token);
    const pathSegments = context.params.path ?? [];
    const path = `/${pathSegments.join("/")}`;
    const searchParams = Object.fromEntries(request.nextUrl.searchParams.entries());

    const payload =
      method === "POST" && request.headers.get("content-type")?.includes("application/json")
        ? await request.json()
        : undefined;

    if (isBinaryPath(path)) {
      const upstream = await client.proxyRaw(
        { method, path, searchParams, body: payload },
        request.headers,
      );

      if (!upstream.ok && upstream.status !== 206) {
        return NextResponse.json(
          { error: "Media request failed" },
          { status: upstream.status },
        );
      }

      const contentType = upstream.headers.get("content-type") ?? "";

      if (isPlaylistPath(path, contentType)) {
        const text = await upstream.text();
        const effectiveUrl = upstream.url || client.buildUrl(path, searchParams);
        const rewritten = rewriteM3u8Playlist(text, effectiveUrl, (resolved) =>
          buildJellyfinProxyPath(resolved, client),
        );

        return new NextResponse(rewritten, {
          status: upstream.status,
          headers: {
            "Content-Type": "application/vnd.apple.mpegurl",
            "Cache-Control": "no-store",
          },
        });
      }

      const headers = new Headers();
      const passthrough = [
        "content-type",
        "content-length",
        "content-range",
        "accept-ranges",
        "cache-control",
        "etag",
        "last-modified",
      ];

      for (const key of passthrough) {
        const value = upstream.headers.get(key);
        if (value) headers.set(key, value);
      }

      if (path.includes("/Images/")) {
        headers.set("Cache-Control", "public, max-age=86400, immutable");
      }

      return new NextResponse(upstream.body, {
        status: upstream.status,
        headers,
      });
    }

    const result = await client.proxy({
      method,
      path,
      searchParams,
      body: payload,
    });

    return NextResponse.json({ data: result });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Proxy request failed";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
