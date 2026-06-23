const prefetchedUrls = new Set<string>();
const inflight = new Map<string, Promise<void>>();

function resolveUrl(baseUrl: string, line: string): string | null {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith("#")) return null;

  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
    return trimmed;
  }

  try {
    return new URL(trimmed, baseUrl).toString();
  } catch {
    return null;
  }
}

function findFirstSegment(manifest: string, manifestUrl: string): string | null {
  for (const line of manifest.split("\n")) {
    const resolved = resolveUrl(manifestUrl, line);
    if (!resolved) continue;

    const lower = resolved.toLowerCase();
    if (
      lower.includes(".ts") ||
      lower.includes(".m4s") ||
      lower.includes(".aac") ||
      (!lower.includes(".m3u8") && /\/\d+\.(ts|aac)/.test(lower))
    ) {
      return resolved;
    }
  }

  for (const line of manifest.split("\n")) {
    const resolved = resolveUrl(manifestUrl, line);
    if (!resolved) continue;
    if (resolved.toLowerCase().includes(".m3u8")) {
      return resolved;
    }
  }

  return null;
}

export async function prefetchIptvStream(streamUrl: string): Promise<void> {
  if (!streamUrl || prefetchedUrls.has(streamUrl)) {
    return;
  }

  const existing = inflight.get(streamUrl);
  if (existing) {
    return existing;
  }

  const task = (async () => {
    try {
      const manifestResponse = await fetch(streamUrl, {
        credentials: "include",
        cache: "force-cache",
      });
      if (!manifestResponse.ok) return;

      const manifest = await manifestResponse.text();
      let segmentUrl = findFirstSegment(manifest, streamUrl);

      if (segmentUrl?.toLowerCase().includes(".m3u8")) {
        const nested = await fetch(segmentUrl, { credentials: "include", cache: "force-cache" });
        if (nested.ok) {
          const nestedText = await nested.text();
          segmentUrl = findFirstSegment(nestedText, segmentUrl) ?? segmentUrl;
        }
      }

      if (segmentUrl) {
        void fetch(segmentUrl, {
          credentials: "include",
          method: "GET",
          cache: "force-cache",
        }).catch(() => undefined);
      }

      prefetchedUrls.add(streamUrl);
    } catch {
      // Prefetch is best-effort
    } finally {
      inflight.delete(streamUrl);
    }
  })();

  inflight.set(streamUrl, task);
  return task;
}
