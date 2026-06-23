"use client";

import { useCallback, useRef } from "react";

import { prefetchIptvStream } from "@/lib/iptv/stream-prefetch";

export function useIptvStreamPrefetch() {
  const lastUrl = useRef<string | null>(null);

  return useCallback((streamUrl: string | undefined) => {
    if (!streamUrl || streamUrl === lastUrl.current) return;
    lastUrl.current = streamUrl;
    void prefetchIptvStream(streamUrl);
  }, []);
}
