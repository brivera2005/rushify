import "server-only";

import { getEnvOrNull, isJellyfinConfigured } from "@/lib/config/env";
import { discoverJellyfinServer, resolveJellyfinServerUrl } from "@/lib/jellyfin/discovery";
import type { JellyfinProxyRequest } from "@/types/jellyfin";
import type { JellyfinStatusResponse } from "@/types/rushify";

const DEFAULT_HEADERS = {
  Accept: "application/json",
};

export class JellyfinClient {
  private readonly baseUrl: string;
  private readonly apiKey: string;

  constructor(baseUrl: string, apiKey: string) {
    this.baseUrl = baseUrl.replace(/\/$/, "");
    this.apiKey = apiKey;
  }

  static async fromEnv(): Promise<JellyfinClient> {
    const env = getEnvOrNull();
    const serverUrl = await resolveJellyfinServerUrl();

    if (!serverUrl || !env?.JELLYFIN_API_KEY) {
      throw new Error("Media server is not configured");
    }

    return new JellyfinClient(serverUrl, env.JELLYFIN_API_KEY);
  }

  buildUrl(path: string, searchParams?: Record<string, string>): string {
    const normalizedPath = path.startsWith("/") ? path : `/${path}`;
    const url = new URL(`${this.baseUrl}${normalizedPath}`);

    if (searchParams) {
      for (const [key, value] of Object.entries(searchParams)) {
        url.searchParams.set(key, value);
      }
    }

    return url.toString();
  }

  getServerBaseUrl(): string {
    return this.baseUrl;
  }

  authHeaders(): HeadersInit {
    return { "X-Emby-Token": this.apiKey };
  }

  isServerUrl(url: string): boolean {
    return url.startsWith(this.baseUrl);
  }

  private buildHeaders(request: JellyfinProxyRequest): HeadersInit {
    return {
      ...DEFAULT_HEADERS,
      "X-Emby-Token": this.apiKey,
      ...(request.body ? { "Content-Type": "application/json" } : {}),
      ...request.headers,
    };
  }

  async proxy<T = unknown>(request: JellyfinProxyRequest): Promise<T> {
    const url = this.buildUrl(request.path, request.searchParams);

    const response = await fetch(url, {
      method: request.method,
      headers: this.buildHeaders(request),
      body: request.body ? JSON.stringify(request.body) : undefined,
      cache: "no-store",
    });

    if (!response.ok) {
      throw new Error(`Media backend request failed (${response.status})`);
    }

    const contentType = response.headers.get("content-type") ?? "";
    if (contentType.includes("application/json")) {
      return (await response.json()) as T;
    }

    return (await response.text()) as T;
  }

  async proxyRaw(
    request: JellyfinProxyRequest,
    incomingHeaders?: Headers,
  ): Promise<Response> {
    const url = this.buildUrl(request.path, request.searchParams);
    const headers = this.buildHeaders(request);

    if (incomingHeaders?.get("range")) {
      (headers as Record<string, string>)["Range"] = incomingHeaders.get("range")!;
    }

    return fetch(url, {
      method: request.method,
      headers,
      body: request.body ? JSON.stringify(request.body) : undefined,
      cache: "no-store",
    });
  }

  async healthCheck(): Promise<boolean> {
    const status = await this.getConnectionStatus();
    return status.connected;
  }

  async getConnectionStatus(): Promise<JellyfinStatusResponse> {
    try {
      const info = await this.proxy<JellyfinSystemInfo>({
        method: "GET",
        path: "/System/Info",
      });

      const counts = await fetchItemCounts(this);

      return {
        configured: true,
        connected: true,
        serverName: info.ServerName,
        version: info.Version,
        ...counts,
      };
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unable to reach media server";
      return {
        configured: true,
        connected: false,
        error: message,
      };
    }
  }
}

type JellyfinSystemInfo = {
  ServerName?: string;
  Version?: string;
};

type JellyfinItemCounts = {
  MovieCount?: number;
  SeriesCount?: number;
  EpisodeCount?: number;
};

async function fetchItemCounts(
  client: JellyfinClient,
): Promise<Pick<JellyfinStatusResponse, "movieCount" | "seriesCount" | "episodeCount">> {
  try {
    const counts = await client.proxy<JellyfinItemCounts>({
      method: "GET",
      path: "/Items/Counts",
    });
    return {
      movieCount: counts.MovieCount,
      seriesCount: counts.SeriesCount,
      episodeCount: counts.EpisodeCount,
    };
  } catch {
    return {};
  }
}

export async function getJellyfinStatus(): Promise<JellyfinStatusResponse> {
  const env = getEnvOrNull();
  if (!env) {
    return {
      configured: false,
      connected: false,
      error: "Invalid environment configuration",
    };
  }

  const configuredUrl = env.JELLYFIN_SERVER_URL?.replace(/\/$/, "");
  const discovery = configuredUrl ? null : await discoverJellyfinServer();
  const serverUrl = configuredUrl ?? discovery?.url;
  const discoveredUrl = !configuredUrl && discovery?.found ? discovery.url : undefined;
  const hasKey = Boolean(env.JELLYFIN_API_KEY);

  if (!serverUrl && !hasKey) {
    return { configured: false, connected: false };
  }

  if (!serverUrl) {
    return {
      configured: false,
      connected: false,
      error: "Media server not reachable. Check your server address in .env",
    };
  }

  if (!hasKey) {
    try {
      const response = await fetch(`${serverUrl}/System/Info/Public`, {
        headers: { Accept: "application/json" },
        cache: "no-store",
      });
      if (!response.ok) {
        return {
          configured: true,
          connected: false,
          discoveredUrl,
          error: `Media server unreachable (${response.status})`,
        };
      }
      const info = (await response.json()) as JellyfinSystemInfo;
      return {
        configured: true,
        connected: true,
        serverName: info.ServerName,
        version: info.Version,
        discoveredUrl,
      };
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unable to reach media server";
      return {
        configured: true,
        connected: false,
        discoveredUrl,
        error: message,
      };
    }
  }

  if (isJellyfinConfigured(env)) {
    return JellyfinClient.fromEnv().then((client) => client.getConnectionStatus());
  }

  const client = new JellyfinClient(serverUrl, env.JELLYFIN_API_KEY!);
  const status = await client.getConnectionStatus();

  return {
    ...status,
    discoveredUrl,
  };
}

export async function createJellyfinClient(): Promise<JellyfinClient> {
  return JellyfinClient.fromEnv();
}

export async function createJellyfinClientWithToken(token: string): Promise<JellyfinClient> {
  const serverUrl = await resolveJellyfinServerUrl();
  if (!serverUrl) {
    throw new Error("Media server not reachable");
  }
  return new JellyfinClient(serverUrl, token);
}
