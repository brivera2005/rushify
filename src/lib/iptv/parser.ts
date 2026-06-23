import "server-only";

import { fetchWithTimeout } from "@/lib/iptv/fetch";
import type { IptvChannelSnapshot, IptvEpgSnapshot, IptvProgramme } from "@/types/iptv";

export type ParseProgress = {
  bytesProcessed: number;
  itemsParsed: number;
};

export type M3uParseResult = {
  snapshot: IptvChannelSnapshot;
  upstream: Map<string, string>;
};

function decodeXmlEntities(value: string): string {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)));
}

function parseExtinfLine(line: string): {
  name: string;
  group?: string;
  logoUrl?: string;
  tvgId?: string;
} {
  const nameMatch = line.match(/,(.+)$/);
  const name = nameMatch?.[1]?.trim() ?? "Unknown";
  const groupMatch = line.match(/group-title="([^"]*)"/i);
  const logoMatch = line.match(/tvg-logo="([^"]*)"/i);
  const tvgIdMatch = line.match(/tvg-id="([^"]*)"/i);

  return {
    name,
    group: groupMatch?.[1] || undefined,
    logoUrl: logoMatch?.[1] || undefined,
    tvgId: tvgIdMatch?.[1] || undefined,
  };
}

function slugifyId(value: string, index: number): string {
  const slug = value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  return slug ? `m3u-${slug}-${index}` : `m3u-${index}`;
}

export function parseM3uText(text: string): M3uParseResult {
  const lines = text.split(/\r?\n/);
  const upstream = new Map<string, string>();
  const channels: IptvChannelSnapshot["channels"] = [];
  let pending: ReturnType<typeof parseExtinfLine> | null = null;

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    if (trimmed.startsWith("#EXTINF:")) {
      pending = parseExtinfLine(trimmed);
      continue;
    }

    if (trimmed.startsWith("#") || !pending) {
      continue;
    }

    const id = pending.tvgId?.trim() ? pending.tvgId : slugifyId(pending.name, channels.length);
    upstream.set(id, trimmed);
    channels.push({
      id,
      name: pending.name,
      group: pending.group,
      logoUrl: pending.logoUrl,
      tvgId: pending.tvgId,
      streamUrl: `/api/stream/iptv/${encodeURIComponent(id)}`,
    });
    pending = null;
  }

  return {
    snapshot: {
      generatedAt: new Date().toISOString(),
      channels,
    },
    upstream,
  };
}

export async function parseM3uStream(
  sourceUrl: string,
  onProgress?: (progress: ParseProgress) => void,
): Promise<M3uParseResult> {
  const response = await fetchWithTimeout(sourceUrl);
  if (!response.ok) {
    throw new Error(`M3U fetch failed (${response.status})`);
  }

  const text = await response.text();
  onProgress?.({ bytesProcessed: text.length, itemsParsed: 0 });
  const result = parseM3uText(text);
  onProgress?.({ bytesProcessed: text.length, itemsParsed: result.snapshot.channels.length });
  return result;
}

function parseXmltvTimestamp(value: string): string {
  const match = value.trim().match(/^(\d{4})(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})\s*([+-]\d{4})?$/);
  if (!match) {
    return new Date(value).toISOString();
  }

  const [, year, month, day, hour, minute, second, offset] = match;
  const iso = `${year}-${month}-${day}T${hour}:${minute}:${second}`;
  if (offset) {
    const sign = offset[0];
    const hours = offset.slice(1, 3);
    const minutes = offset.slice(3, 5);
    return new Date(`${iso}${sign}${hours}:${minutes}`).toISOString();
  }

  return new Date(`${iso}Z`).toISOString();
}

export function parseXmltvText(text: string, maxProgrammes = 250_000): IptvEpgSnapshot {
  const programmes: IptvProgramme[] = [];
  const programmeRegex =
    /<programme\b([^>]*)>([\s\S]*?)<\/programme>/gi;

  let match: RegExpExecArray | null;
  while ((match = programmeRegex.exec(text)) !== null && programmes.length < maxProgrammes) {
    const attrs = match[1] ?? "";
    const body = match[2] ?? "";

    const channelMatch = attrs.match(/channel="([^"]+)"/i);
    const startMatch = attrs.match(/start="([^"]+)"/i);
    const stopMatch = attrs.match(/stop="([^"]+)"/i);
    if (!channelMatch || !startMatch || !stopMatch) continue;

    const titleMatch = body.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
    const descMatch = body.match(/<desc[^>]*>([\s\S]*?)<\/desc>/i);
    const categoryMatch = body.match(/<category[^>]*>([\s\S]*?)<\/category>/i);

    programmes.push({
      channelId: decodeXmlEntities(channelMatch[1] ?? ""),
      title: decodeXmlEntities(titleMatch?.[1]?.trim() ?? "Untitled"),
      description: descMatch?.[1] ? decodeXmlEntities(descMatch[1].trim()) : undefined,
      start: parseXmltvTimestamp(startMatch[1] ?? ""),
      stop: parseXmltvTimestamp(stopMatch[1] ?? ""),
      category: categoryMatch?.[1] ? decodeXmlEntities(categoryMatch[1].trim()) : undefined,
    });
  }

  return {
    generatedAt: new Date().toISOString(),
    programmes,
  };
}

export async function parseXmltvStream(
  sourceUrl: string,
  onProgress?: (progress: ParseProgress) => void,
): Promise<IptvEpgSnapshot> {
  const response = await fetchWithTimeout(sourceUrl);
  if (!response.ok) {
    throw new Error(`EPG fetch failed (${response.status})`);
  }

  const text = await response.text();
  onProgress?.({ bytesProcessed: text.length, itemsParsed: 0 });
  const snapshot = parseXmltvText(text);
  onProgress?.({ bytesProcessed: text.length, itemsParsed: snapshot.programmes.length });
  return snapshot;
}
