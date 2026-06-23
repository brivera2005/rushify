"use client";

import { useIptvChannels } from "@/hooks/useIptvData";

/** Prefetch channel lineup as soon as the dashboard shell mounts. */
export function IptvWarmup() {
  useIptvChannels();
  return null;
}
