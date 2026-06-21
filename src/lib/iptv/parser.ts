import "server-only";

import type { IptvChannelSnapshot, IptvEpgSnapshot } from "@/types/iptv";

export type ParseProgress = {
  bytesProcessed: number;
  itemsParsed: number;
};

/**
 * Streaming/chunked M3U parser skeleton.
 * Future implementation should process remote text incrementally without blocking the event loop.
 */
export async function parseM3uStream(
  sourceUrl: string,
  onProgress?: (progress: ParseProgress) => void,
): Promise<IptvChannelSnapshot> {
  void sourceUrl;
  void onProgress;

  return {
    generatedAt: new Date().toISOString(),
    channels: [],
  };
}

/**
 * Streaming/chunked XMLTV parser skeleton.
 * Future implementation should use incremental XML parsing with backpressure controls.
 */
export async function parseXmltvStream(
  sourceUrl: string,
  onProgress?: (progress: ParseProgress) => void,
): Promise<IptvEpgSnapshot> {
  void sourceUrl;
  void onProgress;

  return {
    generatedAt: new Date().toISOString(),
    programmes: [],
  };
}
