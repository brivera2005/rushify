import { NextRequest, NextResponse } from "next/server";

import { discoverJellyfinServer } from "@/lib/jellyfin/discovery";
import type { JellyfinDiscoveryResponse } from "@/types/rushify";

export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
): Promise<NextResponse<JellyfinDiscoveryResponse>> {
  const force = request.nextUrl.searchParams.get("force") === "true";
  const result = await discoverJellyfinServer({ force });
  return NextResponse.json(result);
}
