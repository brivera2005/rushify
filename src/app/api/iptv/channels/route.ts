import { NextResponse } from "next/server";

import { getEnv } from "@/lib/config/env";
import { iptvCacheManager, iptvCacheResponseHeaders } from "@/lib/iptv/cache";
import { filterChannelSnapshot, resolveRegionFilter } from "@/lib/iptv/filters";
import { iptvService } from "@/lib/iptv/service";

export const dynamic = "force-dynamic";

export async function GET(request: Request): Promise<NextResponse> {
  try {
    const { searchParams } = new URL(request.url);
    const env = getEnv();
    const regionFilter = resolveRegionFilter(
      {
        usOnly: searchParams.get("usOnly"),
        englishOnly: searchParams.get("englishOnly"),
      },
      env,
    );

    iptvService.startBackgroundRefresh();
    const result = await iptvService.getChannels();
    await iptvCacheManager.ensureHydrated();
    const cached = iptvCacheManager.getChannels();
    const totalChannels =
      cached.value?.upstreamChannelCount ?? result.data.channels.length;
    const data =
      regionFilter === "none" ? result.data : filterChannelSnapshot(result.data, regionFilter);

    return NextResponse.json(
      {
        data,
        meta: {
          stale: result.stale,
          refreshing: result.refreshing,
          cacheStatus: result.cacheStatus,
          regionFilter,
          usOnly: regionFilter === "us",
          englishOnly: regionFilter === "english",
          totalChannels,
          filteredChannels: data.channels.length,
          lastUpdated: iptvCacheManager.getChannels().meta?.fetchedAt,
        },
      },
      { headers: iptvCacheResponseHeaders(result.cacheStatus) },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to load IPTV channels";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
