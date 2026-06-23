"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";

import { useToast } from "@/components/ui/Toast";
import {
  IPTV_CHANNELS_ADMIN_COOLDOWN_SEC,
  IPTV_CHANNELS_REFRESH_COOLDOWN_SEC,
  IPTV_EPG_ADMIN_COOLDOWN_SEC,
  IPTV_EPG_REFRESH_COOLDOWN_SEC,
} from "@/lib/iptv/refresh-cooldown";

export type IptvRefreshType = "epg" | "channels" | "all";

type RefreshResponse = {
  ok?: boolean;
  error?: string;
  retryAfterSeconds?: number;
  lastRefreshAgeSeconds?: number;
  limitedType?: "epg" | "channels";
  cache?: {
    channelCount?: number;
    programmeCount?: number;
    channelsAgeSeconds?: number;
    epgAgeSeconds?: number;
  };
};

function parseRetryAfter(response: Response, payload: RefreshResponse): number | undefined {
  const header = response.headers.get("Retry-After");
  if (header) {
    const parsed = Number.parseInt(header, 10);
    if (!Number.isNaN(parsed)) return parsed;
  }
  return payload.retryAfterSeconds;
}

function getCooldownSeconds(type: "epg" | "channels", isAdmin: boolean): number {
  if (type === "epg") {
    return isAdmin ? IPTV_EPG_ADMIN_COOLDOWN_SEC : IPTV_EPG_REFRESH_COOLDOWN_SEC;
  }
  return isAdmin ? IPTV_CHANNELS_ADMIN_COOLDOWN_SEC : IPTV_CHANNELS_REFRESH_COOLDOWN_SEC;
}

export function useIptvRefresh() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [refreshingEpg, setRefreshingEpg] = useState(false);
  const [refreshingChannels, setRefreshingChannels] = useState(false);
  const [epgCooldown, setEpgCooldown] = useState(0);
  const [channelsCooldown, setChannelsCooldown] = useState(0);
  const [isAdmin, setIsAdmin] = useState(false);
  const isAdminRef = useRef(false);

  useEffect(() => {
    isAdminRef.current = isAdmin;
  }, [isAdmin]);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/auth/me")
      .then((response) => (response.ok ? response.json() : null))
      .then((payload: { isAdmin?: boolean } | null) => {
        if (!cancelled && payload?.isAdmin) {
          setIsAdmin(true);
        }
      })
      .catch(() => {
        // Ignore — default non-admin cooldowns apply.
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (epgCooldown <= 0 && channelsCooldown <= 0) return;

    const timer = setInterval(() => {
      setEpgCooldown((value) => Math.max(0, value - 1));
      setChannelsCooldown((value) => Math.max(0, value - 1));
    }, 1000);

    return () => clearInterval(timer);
  }, [epgCooldown, channelsCooldown]);

  const startCooldown = useCallback((type: IptvRefreshType, seconds: number) => {
    if (type === "epg" || type === "all") {
      setEpgCooldown(seconds);
    }
    if (type === "channels" || type === "all") {
      setChannelsCooldown(seconds);
    }
  }, []);

  const refresh = useCallback(
    async (type: IptvRefreshType) => {
      const admin = isAdminRef.current;
      if (type === "epg" && epgCooldown > 0) return false;
      if (type === "channels" && channelsCooldown > 0) return false;
      if (type === "all" && (epgCooldown > 0 || channelsCooldown > 0)) return false;

      const setLoading =
        type === "epg"
          ? setRefreshingEpg
          : type === "channels"
            ? setRefreshingChannels
            : (value: boolean) => {
                setRefreshingEpg(value);
                setRefreshingChannels(value);
              };

      setLoading(true);
      try {
        const response = await fetch("/api/iptv/refresh", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ type }),
        });
        const payload = (await response.json()) as RefreshResponse;

        if (!response.ok) {
          const retryAfter = parseRetryAfter(response, payload);
          if (response.status === 429 && retryAfter != null) {
            const limitedType = payload.limitedType ?? (type === "channels" ? "channels" : "epg");
            startCooldown(limitedType, retryAfter);
          }
          toast(payload.error ?? "Refresh failed", "error");
          return false;
        }

        await queryClient.invalidateQueries({ queryKey: ["iptv"] });
        if (type === "all") {
          startCooldown("epg", getCooldownSeconds("epg", admin));
          startCooldown("channels", getCooldownSeconds("channels", admin));
        } else {
          startCooldown(type, getCooldownSeconds(type, admin));
        }

        const label =
          type === "epg"
            ? "EPG refreshed"
            : type === "channels"
              ? "Channels refreshed"
              : "IPTV cache refreshed";
        toast(label, "success");
        return true;
      } catch {
        toast("Refresh failed", "error");
        return false;
      } finally {
        setLoading(false);
      }
    },
    [channelsCooldown, epgCooldown, queryClient, startCooldown, toast],
  );

  return {
    refresh,
    refreshingEpg,
    refreshingChannels,
    isRefreshing: refreshingEpg || refreshingChannels,
    epgCooldown,
    channelsCooldown,
    isAdmin,
  };
}

export function formatCacheAge(seconds: number | undefined): string {
  if (seconds == null) return "unknown";
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  return `${hours}h ago`;
}

export function formatProgrammeCount(count: number | undefined): string {
  if (count == null) return "N/A";
  if (count >= 1000) return `${Math.round(count / 1000)}k programmes`;
  return `${count.toLocaleString()} programmes`;
}

export function formatRefreshButtonLabel(options: {
  type: "epg" | "channels";
  refreshing: boolean;
  cooldown: number;
  ageSeconds?: number;
}): string {
  const { type, refreshing, cooldown, ageSeconds } = options;
  const noun = type === "epg" ? "EPG" : "Channels";

  if (refreshing) {
    return type === "epg" ? "Refreshing EPG…" : "Refreshing channels…";
  }
  if (cooldown > 0) {
    return `Try again in ${cooldown}s`;
  }
  if (ageSeconds != null) {
    return `Refresh ${noun} · ${formatCacheAge(ageSeconds)}`;
  }
  return `Refresh ${noun}`;
}
