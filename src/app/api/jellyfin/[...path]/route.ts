import { NextRequest, NextResponse } from "next/server";

import { createJellyfinClient } from "@/lib/jellyfin/client";

export const dynamic = "force-dynamic";

type RouteContext = {
  params: { path: string[] };
};

/**
 * Catch-all BFF proxy skeleton for media backend requests.
 * Stream-specific routes will branch here in a later phase.
 */
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
    const client = createJellyfinClient();
    const pathSegments = context.params.path ?? [];
    const path = `/${pathSegments.join("/")}`;
    const searchParams = Object.fromEntries(request.nextUrl.searchParams.entries());

    const payload =
      method === "POST" && request.headers.get("content-type")?.includes("application/json")
        ? await request.json()
        : undefined;

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
