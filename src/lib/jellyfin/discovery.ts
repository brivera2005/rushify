import "server-only";

import os from "os";

import { getEnvOrNull, type RushifyEnv } from "@/lib/config/env";
import type { JellyfinDiscoveryResponse } from "@/types/rushify";

const DEFAULT_PORT = 8097;
const PROBE_TIMEOUT_MS = 2000;
const CACHE_TTL_MS = 5 * 60 * 1000;
const MAX_CANDIDATES = 15;

type ProbeResult = {
  url: string;
  status: "ok" | "fail" | "timeout";
  serverName?: string;
  version?: string;
};

type JellyfinPublicInfo = {
  ServerName?: string;
  Version?: string;
};

let cachedDiscovery: JellyfinDiscoveryResponse | null = null;
let cachedAt = 0;

function normalizeUrl(url: string): string {
  return url.replace(/\/$/, "");
}

function getLanIpAddresses(): string[] {
  const ips: string[] = [];

  for (const addresses of Object.values(os.networkInterfaces())) {
    if (!addresses) continue;

    for (const address of addresses) {
      if (address.family === "IPv4" && !address.internal) {
        ips.push(address.address);
      }
    }
  }

  return Array.from(new Set(ips));
}

function buildCandidateUrls(env: RushifyEnv | null): string[] {
  const candidates: string[] = [];

  if (env?.JELLYFIN_SERVER_URL) {
    candidates.push(normalizeUrl(env.JELLYFIN_SERVER_URL));
  }

  const defaults = [
    `http://127.0.0.1:${DEFAULT_PORT}`,
    `http://localhost:${DEFAULT_PORT}`,
    `http://host.docker.internal:${DEFAULT_PORT}`,
    `http://jellyfin:${DEFAULT_PORT}`,
    `http://Jellyfin:${DEFAULT_PORT}`,
  ];

  candidates.push(...defaults);

  for (const ip of getLanIpAddresses()) {
    candidates.push(`http://${ip}:${DEFAULT_PORT}`);
  }

  if (env?.JELLYFIN_DISCOVERY_URLS) {
    for (const entry of env.JELLYFIN_DISCOVERY_URLS.split(",")) {
      const trimmed = entry.trim();
      if (trimmed) {
        candidates.push(normalizeUrl(trimmed));
      }
    }
  }

  const seen = new Set<string>();
  const unique: string[] = [];

  for (const url of candidates) {
    if (seen.has(url)) continue;
    seen.add(url);
    unique.push(url);
    if (unique.length >= MAX_CANDIDATES) break;
  }

  return unique;
}

async function probeCandidate(url: string): Promise<ProbeResult> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), PROBE_TIMEOUT_MS);

  try {
    const response = await fetch(`${url}/System/Info/Public`, {
      signal: controller.signal,
      headers: { Accept: "application/json" },
      cache: "no-store",
    });

    if (!response.ok) {
      return { url, status: "fail" };
    }

    const info = (await response.json()) as JellyfinPublicInfo;
    if (!info.ServerName) {
      return { url, status: "fail" };
    }

    return {
      url,
      status: "ok",
      serverName: info.ServerName,
      version: info.Version,
    };
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      return { url, status: "timeout" };
    }
    return { url, status: "fail" };
  } finally {
    clearTimeout(timeout);
  }
}

export async function discoverJellyfinServer(
  options: { force?: boolean } = {},
): Promise<JellyfinDiscoveryResponse> {
  const { force = false } = options;

  if (!force && cachedDiscovery && Date.now() - cachedAt < CACHE_TTL_MS) {
    return cachedDiscovery;
  }

  const env = getEnvOrNull();
  const candidates = buildCandidateUrls(env);
  const settled = await Promise.allSettled(candidates.map((url) => probeCandidate(url)));

  const probes: ProbeResult[] = settled.map((result, index) =>
    result.status === "fulfilled"
      ? result.value
      : { url: candidates[index] ?? "", status: "fail" as const },
  );

  const firstOk = probes.find((probe) => probe.status === "ok");

  const response: JellyfinDiscoveryResponse = {
    found: Boolean(firstOk),
    url: firstOk?.url,
    serverName: firstOk?.serverName,
    version: firstOk?.version,
    candidates: probes.map((probe) => ({
      url: probe.url,
      status: probe.status,
      ...(probe.serverName ? { serverName: probe.serverName } : {}),
    })),
  };

  cachedDiscovery = response;
  cachedAt = Date.now();

  return response;
}

export async function resolveJellyfinServerUrl(): Promise<string | null> {
  const env = getEnvOrNull();

  if (env?.JELLYFIN_SERVER_URL) {
    return normalizeUrl(env.JELLYFIN_SERVER_URL);
  }

  const discovery = await discoverJellyfinServer();
  return discovery.found && discovery.url ? discovery.url : null;
}

export function clearJellyfinDiscoveryCache(): void {
  cachedDiscovery = null;
  cachedAt = 0;
}
