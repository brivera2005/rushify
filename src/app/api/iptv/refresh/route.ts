import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import {
  checkIptvRefreshRateLimit,
  recordIptvRefreshSuccess,
  type IptvRefreshLimitType,
} from "@/lib/auth/rate-limit";
import { isAdminRole } from "@/lib/auth/rushify-users";
import { getSession } from "@/lib/auth/session";
import { getEnv } from "@/lib/config/env";
import { iptvCacheManager } from "@/lib/iptv/cache";
import { filterChannelSnapshot, filterEpgForChannels, resolveRegionFilter } from "@/lib/iptv/filters";
import { iptvService } from "@/lib/iptv/service";

export const dynamic = "force-dynamic";

const bodySchema = z.object({
  type: z.enum(["epg", "channels", "all"]),
});

function formatAgeSeconds(iso: string | undefined): number | undefined {
  if (!iso) return undefined;
  return Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 1000));
}

function refreshLabel(type: IptvRefreshLimitType, limitedType?: "epg" | "channels"): string {
  if (type === "all") return limitedType === "channels" ? "Channels" : "EPG";
  return type === "channels" ? "Channels" : "EPG";
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "type must be epg, channels, or all" }, { status: 400 });
  }

  const { type } = parsed.data;
  const isAdmin = isAdminRole(session);

  const rate = checkIptvRefreshRateLimit(session.userId, type, { isAdmin });
  if (!rate.allowed) {
    const label = refreshLabel(type, rate.limitedType);
    const retryAfter = rate.retryAfterSeconds ?? 30;
    const message =
      rate.lastRefreshAgeSeconds != null
        ? `${label} refreshed ${rate.lastRefreshAgeSeconds}s ago. Try again in ${retryAfter}s`
        : `${label} refresh rate limited. Try again in ${retryAfter}s`;

    return NextResponse.json(
      {
        error: message,
        retryAfterSeconds: retryAfter,
        lastRefreshAgeSeconds: rate.lastRefreshAgeSeconds,
        limitedType: rate.limitedType,
        action: "iptv_refresh",
      },
      {
        status: 429,
        headers: { "Retry-After": String(retryAfter) },
      },
    );
  }

  const env = getEnv();
  const regionFilter = resolveRegionFilter({ usOnly: null, englishOnly: null }, env);

  try {
    iptvService.startBackgroundRefresh();
    await iptvCacheManager.ensureHydrated();

    let channelsRefreshed = false;
    let epgRefreshed = false;

    if (type === "channels" || type === "all") {
      await iptvService.getChannels({ forceRefresh: true });
      channelsRefreshed = true;
    }

    if (type === "epg" || type === "all") {
      await iptvService.getEpg({ forceRefresh: true });
      epgRefreshed = true;
    }

    recordIptvRefreshSuccess(session.userId, type, { isAdmin });

    const channels = iptvCacheManager.getChannels();
    const epg = iptvCacheManager.getEpg();
    const channelSnapshot = channels.value?.snapshot;
    const epgSnapshot = epg.value;

    const filteredChannels = channelSnapshot
      ? regionFilter === "none"
        ? channelSnapshot
        : filterChannelSnapshot(channelSnapshot, regionFilter)
      : null;

    const filteredEpg =
      epgSnapshot && filteredChannels
        ? regionFilter === "none"
          ? epgSnapshot
          : filterEpgForChannels(epgSnapshot, filteredChannels.channels)
        : epgSnapshot;

    return NextResponse.json({
      ok: true,
      type,
      channelsRefreshed,
      epgRefreshed,
      regionFilter,
      usOnly: regionFilter === "us",
      englishOnly: regionFilter === "english",
      cache: {
        channelCount: filteredChannels?.channels.length ?? 0,
        totalChannelCount: channels.value?.upstreamChannelCount,
        programmeCount: filteredEpg?.programmes.length ?? 0,
        channelsUpdatedAt: channels.meta?.fetchedAt,
        epgUpdatedAt: epg.meta?.fetchedAt,
        channelsAgeSeconds: formatAgeSeconds(channels.meta?.fetchedAt),
        epgAgeSeconds: formatAgeSeconds(epg.meta?.fetchedAt),
        channelsRefreshing: channels.meta?.isRefreshing ?? false,
        epgRefreshing: epg.meta?.isRefreshing ?? false,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Refresh failed";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
