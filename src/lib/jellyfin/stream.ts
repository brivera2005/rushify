import type { ClientCapabilities } from "@/lib/jellyfin/client-capabilities";

export type StreamQuality = "auto" | "original" | "1080p" | "720p" | "480p";

export type PlaybackMode = "direct" | "adaptive" | "transcode";

export type PlaybackUrls = {
  src: string;
  fallbackSrc?: string;
  label: string;
  mode: PlaybackMode;
};

/** Stable device id for Jellyfin transcode sessions */
export const RUSHIFY_DEVICE_ID = "rushify-web-player";

/** 120 Mbps — generous for LAN; Jellyfin caps to source bitrate when lower */
const LAN_MAX_BITRATE = "120000000";

const QUALITY_PRESETS = {
  "1080p": { width: 1920, height: 1080, bitrate: "80000000" },
  "720p": { width: 1280, height: 720, bitrate: "40000000" },
  "480p": { width: 854, height: 480, bitrate: "20000000" },
} as const;

export const STREAM_QUALITY_OPTIONS: { value: StreamQuality; label: string }[] = [
  { value: "auto", label: "Auto" },
  { value: "original", label: "Original (Direct)" },
  { value: "1080p", label: "1080p" },
  { value: "720p", label: "720p" },
  { value: "480p", label: "480p" },
];

const prefetchedItems = new Set<string>();

export function createPlaySessionId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID().replace(/-/g, "");
  }
  return `rushify-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

export function buildDirectStreamUrl(itemId: string): string {
  return `/api/jellyfin/Videos/${itemId}/stream?Static=true`;
}

function buildVideoCodecs(forceH264 = false): string {
  if (forceH264) return "h264";
  return "h264,hevc,av1";
}

function buildAudioCodecs(): string {
  return "aac,ac3,eac3,truehd,dts";
}

type AdaptiveStreamOptions = {
  maxWidth?: number;
  maxHeight?: number;
  maxBitrate?: string;
  forceH264?: boolean;
  deviceId?: string;
  playSessionId?: string;
  userId?: string;
};

export function getAdaptiveStreamRequest(
  itemId: string,
  _caps: ClientCapabilities,
  mediaSourceId = itemId,
  options: AdaptiveStreamOptions = {},
): { path: string; searchParams: Record<string, string> } {
  const searchParams: Record<string, string> = {
    Static: "false",
    MediaSourceId: mediaSourceId,
    DeviceId: options.deviceId ?? RUSHIFY_DEVICE_ID,
    PlaySessionId: options.playSessionId ?? createPlaySessionId(),
    VideoCodec: buildVideoCodecs(options.forceH264),
    AudioCodec: buildAudioCodecs(),
    AudioStreamIndex: "0",
    VideoStreamIndex: "0",
    MaxStreamingBitrate: options.maxBitrate ?? LAN_MAX_BITRATE,
    MaxWidth: String(options.maxWidth ?? 3840),
    MaxHeight: String(options.maxHeight ?? 2160),
    TranscodingMaxAudioChannels: "8",
    EnableDirectPlay: "true",
    EnableDirectStream: "true",
    AllowVideoStreamCopy: "true",
    AllowAudioStreamCopy: "true",
    SegmentContainer: "ts",
    BreakOnNonKeyFrames: "true",
    RequireAvc: options.forceH264 ? "true" : "false",
  };

  if (options.userId) {
    searchParams.UserId = options.userId;
  }

  return {
    path: `/Videos/${itemId}/master.m3u8`,
    searchParams,
  };
}

export function buildAdaptiveStreamUrl(
  itemId: string,
  caps: ClientCapabilities,
  mediaSourceId = itemId,
  options: AdaptiveStreamOptions = {},
): string {
  const { path, searchParams } = getAdaptiveStreamRequest(itemId, caps, mediaSourceId, options);
  return `/api/jellyfin${path}?${new URLSearchParams(searchParams).toString()}`;
}

/** Adaptive HLS URL with LAN defaults and full codec negotiation */
export function buildStreamUrl(itemId: string, caps?: ClientCapabilities, mediaSourceId = itemId): string {
  const effectiveCaps: ClientCapabilities = caps ?? {
    hevc: true,
    h264: true,
    av1: true,
    ac3: true,
    eac3: true,
    dts: true,
    truehd: true,
    preferTranscode: false,
  };
  return buildAdaptiveStreamUrl(itemId, effectiveCaps, mediaSourceId);
}

function buildAutoAdaptiveUrl(itemId: string, caps: ClientCapabilities, playSessionId: string): string {
  if (caps.preferTranscode) {
    return buildAdaptiveStreamUrl(itemId, caps, itemId, {
      playSessionId,
      maxWidth: QUALITY_PRESETS["1080p"].width,
      maxHeight: QUALITY_PRESETS["1080p"].height,
      maxBitrate: QUALITY_PRESETS["1080p"].bitrate,
    });
  }
  return buildAdaptiveStreamUrl(itemId, caps, itemId, { playSessionId });
}

export function resolvePlaybackUrls(
  itemId: string,
  quality: StreamQuality,
  caps: ClientCapabilities,
): PlaybackUrls {
  const playSessionId = createPlaySessionId();

  if (quality === "original") {
    return {
      src: buildDirectStreamUrl(itemId),
      fallbackSrc: buildAdaptiveStreamUrl(itemId, caps, itemId, { playSessionId }),
      label: "Original",
      mode: "direct",
    };
  }

  if (quality === "auto") {
    const adaptive = buildAutoAdaptiveUrl(itemId, caps, playSessionId);
    const h264Fallback = buildAdaptiveStreamUrl(itemId, caps, itemId, {
      playSessionId,
      forceH264: true,
      maxWidth: QUALITY_PRESETS["1080p"].width,
      maxHeight: QUALITY_PRESETS["1080p"].height,
      maxBitrate: QUALITY_PRESETS["1080p"].bitrate,
    });

    return {
      src: adaptive,
      fallbackSrc: h264Fallback,
      label: "Auto",
      mode: "adaptive",
    };
  }

  const preset = QUALITY_PRESETS[quality];
  const adaptive = buildAdaptiveStreamUrl(itemId, caps, itemId, {
    playSessionId,
    maxWidth: preset.width,
    maxHeight: preset.height,
    maxBitrate: preset.bitrate,
  });

  return {
    src: adaptive,
    fallbackSrc: buildAdaptiveStreamUrl(itemId, caps, itemId, {
      playSessionId,
      forceH264: true,
      maxWidth: preset.width,
      maxHeight: preset.height,
      maxBitrate: preset.bitrate,
    }),
    label: quality,
    mode: "transcode",
  };
}

export function resolveCastStreamRequest(
  itemId: string,
  quality: StreamQuality = "auto",
): { path: string; searchParams: Record<string, string> } {
  const caps: ClientCapabilities = {
    hevc: true,
    h264: true,
    av1: false,
    ac3: true,
    eac3: true,
    dts: true,
    truehd: false,
    preferTranscode: false,
  };

  if (quality === "original") {
    return {
      path: `/Videos/${itemId}/stream`,
      searchParams: { Static: "true" },
    };
  }

  if (quality === "auto") {
    return getAdaptiveStreamRequest(itemId, caps, itemId, {
      playSessionId: createPlaySessionId(),
    });
  }

  const preset = QUALITY_PRESETS[quality];
  return getAdaptiveStreamRequest(itemId, caps, itemId, {
    playSessionId: createPlaySessionId(),
    maxWidth: preset.width,
    maxHeight: preset.height,
    maxBitrate: preset.bitrate,
    forceH264: true,
  });
}

export function formatPlaybackStatus(
  quality: StreamQuality,
  usingFallback: boolean,
  mode: PlaybackMode,
  resolution?: { width: number; height: number },
): string {
  const res =
    resolution && resolution.width > 0
      ? resolution.height >= 2160
        ? "4K"
        : `${resolution.height}p`
      : undefined;

  if (!usingFallback && mode === "direct") {
    return res === "4K" ? "Direct Play 4K" : res ? `Direct Play ${res}` : "Direct Play";
  }

  if (!usingFallback && mode === "adaptive") {
    return res ? `Direct Stream ${res}` : "Direct Stream";
  }

  if (usingFallback && mode === "direct") {
    return res ? `Direct Stream ${res}` : "Direct Stream";
  }

  if (usingFallback || mode === "transcode") {
    const target = res ?? (quality === "1080p" ? "1080p" : quality === "720p" ? "720p" : quality === "480p" ? "480p" : undefined);
    if (quality === "auto") {
      return target ? `Transcoding ${target}` : "Transcoding";
    }
    return target ? `Transcoding ${target}` : `${quality} Transcode`;
  }

  return res ? `Streaming ${res}` : "Streaming";
}

/** Warm HLS manifest on card hover/focus for faster start */
export function prefetchPlayback(itemId: string, caps: ClientCapabilities): void {
  if (prefetchedItems.has(itemId)) return;
  prefetchedItems.add(itemId);

  const manifest = buildAdaptiveStreamUrl(itemId, caps);

  void fetch(manifest, { credentials: "include" }).catch(() => undefined);
}
