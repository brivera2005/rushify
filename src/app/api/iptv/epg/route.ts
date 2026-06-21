import { NextResponse } from "next/server";

import { iptvService } from "@/lib/iptv/service";

export const dynamic = "force-dynamic";

export async function GET(): Promise<NextResponse> {
  try {
    iptvService.startBackgroundRefresh();
    const result = await iptvService.getEpg();

    return NextResponse.json({
      data: result.data,
      meta: {
        stale: result.stale,
        refreshing: result.refreshing,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to load IPTV EPG";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
