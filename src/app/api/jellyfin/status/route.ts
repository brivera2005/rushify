import { NextResponse } from "next/server";

import { getJellyfinStatus } from "@/lib/jellyfin/client";
import type { JellyfinStatusResponse } from "@/types/rushify";

export const dynamic = "force-dynamic";

export async function GET(): Promise<NextResponse<JellyfinStatusResponse>> {
  const status = await getJellyfinStatus();
  return NextResponse.json(status);
}
