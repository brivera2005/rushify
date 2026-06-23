"use client";

import { useCallback, useRef } from "react";

import { detectClientCapabilities } from "@/lib/jellyfin/client-capabilities";
import { prefetchPlayback } from "@/lib/jellyfin/stream";

export function useStreamPrefetch(itemId: string) {
  const done = useRef(false);

  return useCallback(() => {
    if (done.current) return;
    done.current = true;
    prefetchPlayback(itemId, detectClientCapabilities());
  }, [itemId]);
}
