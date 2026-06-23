import type { JellyfinMediaItem } from "@/types/jellyfin";

export function buildPosterUrl(
  item: Pick<JellyfinMediaItem, "id" | "imageTag">,
  fillWidth = 200,
): string | undefined {
  if (!item.imageTag) return undefined;

  const params = new URLSearchParams({
    tag: item.imageTag,
    fillWidth: String(fillWidth),
    quality: "92",
  });

  return `/api/jellyfin/Items/${item.id}/Images/Primary?${params.toString()}`;
}

/** Tiny poster for blur-up placeholder while full image loads */
export function buildPosterThumbUrl(
  item: Pick<JellyfinMediaItem, "id" | "imageTag">,
): string | undefined {
  if (!item.imageTag) return undefined;

  const params = new URLSearchParams({
    tag: item.imageTag,
    fillWidth: "32",
    quality: "30",
  });

  return `/api/jellyfin/Items/${item.id}/Images/Primary?${params.toString()}`;
}

export function buildBackdropUrl(
  item: Pick<JellyfinMediaItem, "id" | "backdropImageTag">,
  maxWidth = 2560,
): string | undefined {
  if (!item.backdropImageTag) return undefined;

  const params = new URLSearchParams({
    tag: item.backdropImageTag,
    maxWidth: String(maxWidth),
    quality: "90",
  });

  return `/api/jellyfin/Items/${item.id}/Images/Backdrop?${params.toString()}`;
}

export {
  buildAdaptiveStreamUrl,
  buildDirectStreamUrl,
  buildStreamUrl,
  prefetchPlayback,
  resolvePlaybackUrls,
  resolveCastStreamRequest,
  STREAM_QUALITY_OPTIONS,
  formatPlaybackStatus,
  type PlaybackMode,
  type PlaybackUrls,
  type StreamQuality,
} from "@/lib/jellyfin/stream";
