"use client";

import { useQuery } from "@tanstack/react-query";

import type { IptvChannelSnapshot, IptvEpgSnapshot } from "@/types/iptv";

type IptvMeta = {
  stale: boolean;
  refreshing: boolean;
  regionFilter?: "none" | "english" | "us";
  usOnly?: boolean;
  englishOnly?: boolean;
  totalChannels?: number;
  filteredChannels?: number;
  totalProgrammes?: number;
  filteredProgrammes?: number;
  lastUpdated?: string;
};

type ChannelsResponse = {
  data: IptvChannelSnapshot;
  meta: IptvMeta;
};

type EpgResponse = {
  data: IptvEpgSnapshot;
  meta: IptvMeta;
};

async function fetchChannels(): Promise<ChannelsResponse> {
  const response = await fetch("/api/iptv/channels", { credentials: "include" });
  if (response.status === 429) {
    const payload = (await response.json()) as { error?: string; retryAfterSeconds?: number };
    throw new Error(payload.error ?? "Rate limited loading channels");
  }
  if (!response.ok) throw new Error("Unable to load channels");
  return response.json() as Promise<ChannelsResponse>;
}

async function fetchEpg(): Promise<EpgResponse> {
  const response = await fetch("/api/iptv/epg", { credentials: "include" });
  if (response.status === 429) {
    const payload = (await response.json()) as { error?: string; retryAfterSeconds?: number };
    throw new Error(payload.error ?? "Rate limited loading TV guide");
  }
  if (!response.ok) throw new Error("Unable to load TV guide");
  return response.json() as Promise<EpgResponse>;
}

export function useIptvChannels() {
  return useQuery({
    queryKey: ["iptv", "channels"],
    queryFn: fetchChannels,
    staleTime: 60_000,
    refetchInterval: 5 * 60_000,
  });
}

export function useIptvEpg() {
  return useQuery({
    queryKey: ["iptv", "epg"],
    queryFn: fetchEpg,
    staleTime: 120_000,
    refetchInterval: 10 * 60_000,
  });
}
