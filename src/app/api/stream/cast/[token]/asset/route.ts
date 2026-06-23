import { NextRequest, NextResponse } from "next/server";

import { resolveCastToken } from "@/lib/cast/tokens";
import { JellyfinClient } from "@/lib/jellyfin/client";
import { IPTV_UPSTREAM_HEADERS, proxyUpstream } from "@/lib/stream/proxy";

export const dynamic = "force-dynamic";

type RouteContext = {
  params: { token: string };
};

export async function GET(request: NextRequest, context: RouteContext): Promise<NextResponse> {
  const token = decodeURIComponent(context.params.token ?? "");
  const payload = resolveCastToken(token);

  if (!payload) {
    return NextResponse.json({ error: "Invalid or expired cast token" }, { status: 401 });
  }

  const path = request.nextUrl.searchParams.get("path");
  if (!path) {
    return NextResponse.json({ error: "Missing asset path" }, { status: 400 });
  }

  let headers: HeadersInit | undefined = IPTV_UPSTREAM_HEADERS;
  try {
    const client = await JellyfinClient.fromEnv();
    if (client.isServerUrl(path)) {
      headers = client.authHeaders();
    }
  } catch {
    // IPTV assets use unsigned upstream URLs — browser User-Agent only.
  }

  return proxyUpstream(path, request, { headers });
}
