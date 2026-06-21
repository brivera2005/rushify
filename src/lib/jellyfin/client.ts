import "server-only";

import { getEnv } from "@/lib/config/env";
import type { JellyfinProxyRequest } from "@/types/jellyfin";

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

  static fromEnv(): JellyfinClient {
    const env = getEnv();
    if (!env.JELLYFIN_SERVER_URL || !env.JELLYFIN_API_KEY) {
      throw new Error("Media server is not configured");
    }
    return new JellyfinClient(env.JELLYFIN_SERVER_URL, env.JELLYFIN_API_KEY);
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

  /**
   * Server-side proxy to the media backend. Full integration is deferred.
   */
  async proxy<T = unknown>(request: JellyfinProxyRequest): Promise<T> {
    const url = this.buildUrl(request.path, request.searchParams);

    const response = await fetch(url, {
      method: request.method,
      headers: {
        ...DEFAULT_HEADERS,
        "X-Emby-Token": this.apiKey,
        ...(request.body ? { "Content-Type": "application/json" } : {}),
      },
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

  async healthCheck(): Promise<boolean> {
    try {
      await this.proxy({ method: "GET", path: "/System/Info/Public" });
      return true;
    } catch {
      return false;
    }
  }
}

export function createJellyfinClient(): JellyfinClient {
  return JellyfinClient.fromEnv();
}
