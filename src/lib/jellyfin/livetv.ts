import "server-only";

import { JellyfinClient } from "@/lib/jellyfin/client";
import { createPlaySessionId, RUSHIFY_DEVICE_ID } from "@/lib/jellyfin/stream";
import type { IptvChannel, IptvChannelSnapshot, IptvEpgSnapshot, IptvProgramme } from "@/types/iptv";

const CHANNEL_PAGE_SIZE = 1000;
const PROGRAM_PAGE_SIZE = 1000;
/** Jellyfin URL length limit — filter programmes in-memory above this */
const MAX_EPG_CHANNEL_IDS_IN_REQUEST = 200;

export const JELLYFIN_CHANNEL_PREFIX = "jf-";

type JellyfinQueryResult<T> = {
  Items?: T[];
  TotalRecordCount?: number;
  StartIndex?: number;
};

type JellyfinTvChannel = {
  Id: string;
  Name: string;
  Number?: string;
  ImageTags?: { Primary?: string };
  Taglines?: string[];
  ChannelId?: string;
  Genres?: string[];
};

type JellyfinProgram = {
  Id?: string;
  ChannelId?: string;
  Name?: string;
  Overview?: string;
  StartDate?: string;
  EndDate?: string;
  Genres?: string[];
};

export function isJellyfinChannelId(channelId: string): boolean {
  return channelId.startsWith(JELLYFIN_CHANNEL_PREFIX);
}

export function toJellyfinChannelId(channelId: string): string {
  return isJellyfinChannelId(channelId) ? channelId.slice(JELLYFIN_CHANNEL_PREFIX.length) : channelId;
}

export function fromJellyfinChannelId(jellyfinId: string): string {
  return `${JELLYFIN_CHANNEL_PREFIX}${jellyfinId}`;
}

export function buildJellyfinLiveStreamUrl(channelId: string): string {
  const jellyfinId = toJellyfinChannelId(channelId);
  const params = new URLSearchParams({
    Static: "false",
    MediaSourceId: jellyfinId,
    DeviceId: RUSHIFY_DEVICE_ID,
    PlaySessionId: createPlaySessionId(),
    VideoCodec: "h264,hevc",
    AudioCodec: "aac,ac3,eac3,truehd,dts",
    AudioStreamIndex: "0",
    VideoStreamIndex: "0",
    MaxStreamingBitrate: "80000000",
    EnableDirectPlay: "true",
    EnableDirectStream: "true",
    AllowVideoStreamCopy: "true",
    AllowAudioStreamCopy: "true",
    SegmentContainer: "ts",
    BreakOnNonKeyFrames: "true",
  });
  return `/api/jellyfin/Videos/${encodeURIComponent(jellyfinId)}/master.m3u8?${params.toString()}`;
}

function buildJellyfinLiveFallbackUrl(channelId: string): string {
  const jellyfinId = toJellyfinChannelId(channelId);
  const params = new URLSearchParams({
    Static: "false",
    MediaSourceId: jellyfinId,
    DeviceId: RUSHIFY_DEVICE_ID,
    PlaySessionId: createPlaySessionId(),
    VideoCodec: "h264",
    AudioCodec: "aac",
    MaxStreamingBitrate: "40000000",
    EnableDirectPlay: "true",
    EnableDirectStream: "true",
    SegmentContainer: "ts",
    RequireAvc: "true",
  });
  return `/api/jellyfin/Videos/${encodeURIComponent(jellyfinId)}/master.m3u8?${params.toString()}`;
}

function mapChannel(item: JellyfinTvChannel): IptvChannel {
  const id = fromJellyfinChannelId(item.Id);
  const name = item.Name;
  const regionFromName = name.match(/^([A-Za-z]{2,})\|/);
  const group =
    item.Taglines?.[0]?.trim() ||
    item.Genres?.[0]?.trim() ||
    (regionFromName ? `${regionFromName[1].toUpperCase()}|` : undefined);
  const channelNumber = item.Number ? Number.parseInt(item.Number, 10) : undefined;

  return {
    id,
    name: item.Name,
    group,
    logoUrl: item.ImageTags?.Primary
      ? `/api/jellyfin/Items/${encodeURIComponent(item.Id)}/Images/Primary?maxHeight=128`
      : undefined,
    tvgId: item.ChannelId?.trim() || undefined,
    channelNumber: Number.isFinite(channelNumber) ? channelNumber : undefined,
    streamUrl: buildJellyfinLiveStreamUrl(id),
    fallbackStreamUrl: buildJellyfinLiveFallbackUrl(id),
  };
}

function mapProgramme(item: JellyfinProgram): IptvProgramme | null {
  if (!item.ChannelId || !item.Name || !item.StartDate || !item.EndDate) {
    return null;
  }

  return {
    channelId: fromJellyfinChannelId(item.ChannelId),
    title: item.Name,
    description: item.Overview,
    start: item.StartDate,
    stop: item.EndDate,
    category: item.Genres?.[0],
  };
}

async function fetchAllChannels(client: JellyfinClient): Promise<JellyfinTvChannel[]> {
  const items: JellyfinTvChannel[] = [];
  let startIndex = 0;
  let total = Number.POSITIVE_INFINITY;

  while (startIndex < total) {
    const page = await client.proxy<JellyfinQueryResult<JellyfinTvChannel>>({
      method: "GET",
      path: "/LiveTv/Channels",
      searchParams: {
        StartIndex: String(startIndex),
        Limit: String(CHANNEL_PAGE_SIZE),
        EnableImages: "true",
        AddCurrentProgram: "false",
      },
    });

    const batch = page.Items ?? [];
    items.push(...batch);
    total = page.TotalRecordCount ?? items.length;
    startIndex += batch.length;

    if (batch.length === 0) {
      break;
    }
  }

  return items;
}

async function fetchProgramsInWindow(
  client: JellyfinClient,
  minStart: Date,
  maxEnd: Date,
  channelIds?: string[],
): Promise<IptvProgramme[]> {
  const programmes: IptvProgramme[] = [];
  let startIndex = 0;
  let total = Number.POSITIVE_INFINITY;

  while (startIndex < total) {
    const searchParams: Record<string, string> = {
      StartIndex: String(startIndex),
      Limit: String(PROGRAM_PAGE_SIZE),
      MinStartDate: minStart.toISOString(),
      MaxEndDate: maxEnd.toISOString(),
      Fields: "Basic",
      EnableImageTypes: "None",
    };

    if (channelIds && channelIds.length > 0 && channelIds.length <= MAX_EPG_CHANNEL_IDS_IN_REQUEST) {
      searchParams.ChannelIds = channelIds.map(toJellyfinChannelId).join(",");
    }

    const page = await client.proxy<JellyfinQueryResult<JellyfinProgram>>({
      method: "GET",
      path: "/LiveTv/Programs",
      searchParams,
    });

    const batch = page.Items ?? [];
    for (const item of batch) {
      const mapped = mapProgramme(item);
      if (mapped) programmes.push(mapped);
    }

    total = page.TotalRecordCount ?? programmes.length;
    startIndex += batch.length;

    if (batch.length === 0) {
      break;
    }
  }

  return programmes;
}

export async function jellyfinLiveTvAvailable(): Promise<boolean> {
  try {
    const client = await JellyfinClient.fromEnv();
    const page = await client.proxy<JellyfinQueryResult<JellyfinTvChannel>>({
      method: "GET",
      path: "/LiveTv/Channels",
      searchParams: { StartIndex: "0", Limit: "1" },
    });
    return (page.TotalRecordCount ?? page.Items?.length ?? 0) > 0;
  } catch {
    return false;
  }
}

export async function fetchJellyfinChannels(): Promise<{
  snapshot: IptvChannelSnapshot;
  upstream: Map<string, string>;
}> {
  const client = await JellyfinClient.fromEnv();
  const rawChannels = await fetchAllChannels(client);
  const channels = rawChannels.map(mapChannel);
  const upstream = new Map<string, string>();

  for (const channel of channels) {
    const jellyfinId = toJellyfinChannelId(channel.id);
    upstream.set(
      channel.id,
      client.buildUrl(`/Videos/${jellyfinId}/master.m3u8`, {
        Static: "false",
        MediaSourceId: jellyfinId,
        DeviceId: RUSHIFY_DEVICE_ID,
        PlaySessionId: createPlaySessionId(),
        VideoCodec: "h264,hevc",
        AudioCodec: "aac,ac3,eac3",
        SegmentContainer: "ts",
      }),
    );
  }

  return {
    snapshot: {
      generatedAt: new Date().toISOString(),
      channels,
    },
    upstream,
  };
}

export async function fetchJellyfinEpg(channelIds?: string[]): Promise<IptvEpgSnapshot> {
  const client = await JellyfinClient.fromEnv();
  const now = new Date();
  const minStart = new Date(now.getTime() - 60 * 60 * 1000);
  const maxEnd = new Date(now.getTime() + 6 * 60 * 60 * 1000);

  const programmes = await fetchProgramsInWindow(client, minStart, maxEnd, channelIds);

  return {
    generatedAt: new Date().toISOString(),
    programmes,
  };
}

export async function refreshJellyfinLiveTv(): Promise<void> {
  const client = await JellyfinClient.fromEnv();
  await client.proxy({
    method: "POST",
    path: "/LiveTv/Refresh",
  }).catch(() => undefined);
}
