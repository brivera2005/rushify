import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

type RouteContext = {
  params: { path: string[] };
};

/**
 * Stream proxy skeleton for IPTV and library playback.
 * Future implementation will validate paths and pipe upstream media bytes to clients.
 */
export async function GET(request: NextRequest, context: RouteContext): Promise<NextResponse> {
  const segments = context.params.path ?? [];
  const target = segments.join("/");

  return NextResponse.json(
    {
      error: "Stream proxy not implemented",
      target,
      query: Object.fromEntries(request.nextUrl.searchParams.entries()),
    },
    { status: 501 },
  );
}
