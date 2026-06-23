import "server-only";

import type { RushifyEnv } from "@/lib/config/env";
import { fetchWithTimeout } from "@/lib/iptv/fetch";
import type { IptvChannelSnapshot } from "@/types/iptv";

export type XtreamConfig = {
  baseUrl: string;
  username: string;
  password: string;
};

type XtreamCategory = {
  category_id: string;
  category_name: string;
};

type XtreamStream = {
  stream_id: number;
  num?: number;
  name: string;
  stream_icon?: string;
  epg_channel_id?: string;
  category_id?: string;
};

export function getXtreamConfig(env: RushifyEnv): XtreamConfig | null {
  if (!env.IPTV_XTREAM_URL || !env.IPTV_XTREAM_USERNAME || !env.IPTV_XTREAM_PASSWORD) {
    return null;
  }

  return {
    baseUrl: env.IPTV_XTREAM_URL.replace(/\/$/, ""),
    username: env.IPTV_XTREAM_USERNAME,
    password: env.IPTV_XTREAM_PASSWORD,
  };
}

function buildM3uPlusUrl(config: XtreamConfig): string {
  const params = new URLSearchParams({
    username: config.username,
    password: config.password,
    type: "m3u_plus",
  });
  return `${config.baseUrl}/get.php?${params.toString()}`;
}

function buildPlayerApiUrl(config: XtreamConfig, action: string, extra?: Record<string, string>): string {
  const params = new URLSearchParams({
    username: config.username,
    password: config.password,
    action,
    ...extra,
  });
  return `${config.baseUrl}/player_api.php?${params.toString()}`;
}

export function buildXtreamStreamUrl(config: XtreamConfig, streamId: number): string {
  return `${config.baseUrl}/live/${encodeURIComponent(config.username)}/${encodeURIComponent(config.password)}/${streamId}.m3u8`;
}

export function buildXtreamTsStreamUrl(config: XtreamConfig, streamId: number): string {
  return `${config.baseUrl}/live/${encodeURIComponent(config.username)}/${encodeURIComponent(config.password)}/${streamId}.ts`;
}

export function buildXtreamXmltvUrl(config: XtreamConfig): string {
  const params = new URLSearchParams({
    username: config.username,
    password: config.password,
  });
  return `${config.baseUrl}/xmltv.php?${params.toString()}`;
}

export async function fetchXtreamM3uUrl(config: XtreamConfig): Promise<string> {
  return buildM3uPlusUrl(config);
}

export async function fetchXtreamChannelsViaApi(
  config: XtreamConfig,
): Promise<{ snapshot: IptvChannelSnapshot; upstream: Map<string, string> }> {
  const [categoriesResponse, streamsResponse] = await Promise.all([
    fetchWithTimeout(buildPlayerApiUrl(config, "get_live_categories")),
    fetchWithTimeout(buildPlayerApiUrl(config, "get_live_streams")),
  ]);

  if (!streamsResponse.ok) {
    throw new Error(`Xtream API failed (${streamsResponse.status})`);
  }

  const categories = categoriesResponse.ok
    ? ((await categoriesResponse.json()) as XtreamCategory[])
    : [];
  const streams = (await streamsResponse.json()) as XtreamStream[];

  const categoryNames = new Map(categories.map((cat) => [cat.category_id, cat.category_name]));
  const upstream = new Map<string, string>();
  const channels = streams.map((stream) => {
    const id = `xtream-${stream.stream_id}`;
    upstream.set(id, buildXtreamStreamUrl(config, stream.stream_id));

    return {
      id,
      name: stream.name,
      group: stream.category_id ? categoryNames.get(stream.category_id) : undefined,
      categoryId: stream.category_id || undefined,
      logoUrl: stream.stream_icon || undefined,
      tvgId: stream.epg_channel_id || undefined,
      channelNumber: stream.num ?? undefined,
      streamUrl: `/api/stream/iptv/${encodeURIComponent(id)}`,
      fallbackStreamUrl: `/api/stream/iptv/${encodeURIComponent(id)}?format=ts`,
    };
  });

  return {
    snapshot: {
      generatedAt: new Date().toISOString(),
      channels,
    },
    upstream,
  };
}
