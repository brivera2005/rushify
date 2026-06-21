import { NextResponse } from "next/server";

import { iptvService } from "@/lib/iptv/service";

export const dynamic = "force-dynamic";

export async function GET(): Promise<NextResponse> {
  try {
    iptvService.startBackgroundRefresh();
    const result = await iptvService.getChannels();

    return NextResponse.json({
      data: result.data,
      meta: {
        stale: result.stale,
        refreshing: result.refreshing,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to load IPTV channels";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
