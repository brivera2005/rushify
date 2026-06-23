import { NextResponse } from "next/server";

import { getEnv } from "@/lib/config/env";
import { iptvCacheManager, iptvCacheResponseHeaders } from "@/lib/iptv/cache";
import {
  filterChannelSnapshot,
  filterEpgForChannels,
  resolveRegionFilter,
  trimEpgByTimeWindow,
} from "@/lib/iptv/filters";
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
    const epgResult = await iptvService.getEpg();

    // Channel list for EPG filtering comes from cache — never block guide on a full channel refresh.
    await iptvCacheManager.ensureHydrated();
    const cachedChannels = iptvCacheManager.getChannels();
    const channelSnapshot =
      cachedChannels.value?.snapshot ??
      (await iptvService.getChannels({ forceRefresh: false })).data;

    const totalChannels =
      cachedChannels.value?.upstreamChannelCount ?? channelSnapshot.channels.length;
    const channels =
      regionFilter === "none"
        ? channelSnapshot.channels
        : filterChannelSnapshot(channelSnapshot, regionFilter).channels;
    let data =
      regionFilter === "none" ? epgResult.data : filterEpgForChannels(epgResult.data, channels);

    // Guide UI only needs programmes near "now" — full cache stays on disk.
    data = trimEpgByTimeWindow(data, 1, 3);
    data = {
      ...data,
      programmes: data.programmes.map((programme) => ({
        channelId: programme.channelId,
        title: programme.title,
        start: programme.start,
        stop: programme.stop,
        category: programme.category,
      })),
    };

    return NextResponse.json(
      {
        data,
        meta: {
          stale: epgResult.stale,
          refreshing: epgResult.refreshing,
          cacheStatus: epgResult.cacheStatus,
          regionFilter,
          usOnly: regionFilter === "us",
          englishOnly: regionFilter === "english",
          totalChannels,
          filteredChannels: channels.length,
          totalProgrammes: epgResult.data.programmes.length,
          filteredProgrammes: data.programmes.length,
          lastUpdated: iptvCacheManager.getEpg().meta?.fetchedAt,
        },
      },
      { headers: iptvCacheResponseHeaders(epgResult.cacheStatus) },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to load IPTV EPG";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
