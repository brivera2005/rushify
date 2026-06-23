"use client";

import { useCallback, useEffect, useState } from "react";

import { AboutSection } from "@/components/settings/AboutSection";
import { MediaServerExplainer } from "@/components/settings/MediaServerExplainer";
import { ServerDiscovery } from "@/components/settings/ServerDiscovery";
import { SupportTroubleshooting } from "@/components/settings/SupportTroubleshooting";
import { Button } from "@/components/ui/Button";
import { Card, CardDescription, CardTitle } from "@/components/ui/Card";
import { formatCacheAge, formatRefreshButtonLabel, useIptvRefresh } from "@/hooks/useIptvRefresh";
import type { IptvStatusResponse, JellyfinStatusResponse } from "@/types/rushify";

type StatusState = "loading" | "connected" | "error" | "not_configured";

function StatusDot({ state }: { state: StatusState }) {
  const colors: Record<StatusState, string> = {
    loading: "bg-rush-muted animate-pulse",
    connected: "bg-emerald-400 shadow-[0_0_12px_rgba(52,211,153,0.5)]",
    error: "bg-red-400 shadow-[0_0_12px_rgba(248,113,113,0.5)]",
    not_configured: "bg-amber-400/80",
  };

  const labels: Record<StatusState, string> = {
    loading: "Checking…",
    connected: "Connected",
    error: "Not connected",
    not_configured: "Not configured",
  };

  return (
    <span className="inline-flex items-center gap-2 text-sm font-medium">
      <span className={`h-2.5 w-2.5 rounded-full ${colors[state]}`} aria-hidden />
      {labels[state]}
    </span>
  );
}

function resolveMediaServerState(status: JellyfinStatusResponse | null): StatusState {
  if (!status) return "loading";
  if (!status.configured) return "not_configured";
  return status.connected ? "connected" : "error";
}

function resolveIptvState(status: IptvStatusResponse | null): StatusState {
  if (!status) return "loading";
  if (!status.configured) return "not_configured";
  return "connected";
}

const setupSteps = [
  {
    title: "Find your media server URL",
    body: (
      <>
        Click <strong className="text-rush-foreground">Scan for Library Server</strong> above — Rushify
        will probe common addresses on port{" "}
        <code className="rounded bg-rush-canvas px-1.5 py-0.5 text-rush-accent">8096</code>. Or
        paste the URL manually, for example{" "}
        <code className="rounded bg-rush-canvas px-1.5 py-0.5 text-rush-accent">
          http://192.168.1.100:8096
        </code>
        .
      </>
    ),
  },
  {
    title: "Create an API key",
    body: (
      <>
        In your media server admin dashboard, go to{" "}
        <strong className="text-rush-foreground">Dashboard → Advanced → API Keys</strong>, click{" "}
        <strong className="text-rush-foreground">+</strong> to add a key, name it{" "}
        <em>Rushify</em>, and copy the generated key.
      </>
    ),
  },
  {
    title: "Add credentials to your .env file",
    body: (
      <>
        Paste both values into{" "}
        <code className="rounded bg-rush-canvas px-1.5 py-0.5 text-rush-accent">.env.local</code>{" "}
        (development) or{" "}
        <code className="rounded bg-rush-canvas px-1.5 py-0.5 text-rush-accent">.env</code>{" "}
        (Docker), then restart Rushify.
      </>
    ),
  },
];

const envExample = `# Media engine (port 8097 after Rushify port migration)
JELLYFIN_SERVER_URL=http://192.168.1.100:8097
JELLYFIN_API_KEY=paste_your_api_key_here

# Live TV: auto = engine first, direct fallback
IPTV_BACKEND=auto

# Provider credentials (engine tuner setup + fallback — server only)
IPTV_XTREAM_URL=
IPTV_XTREAM_USERNAME=
IPTV_XTREAM_PASSWORD=`;

export function SetupGuide() {
  const {
    refresh,
    refreshingEpg,
    refreshingChannels,
    epgCooldown,
    channelsCooldown,
    isRefreshing,
  } = useIptvRefresh();
  const [jellyfin, setJellyfin] = useState<JellyfinStatusResponse | null>(null);
  const [iptv, setIptv] = useState<IptvStatusResponse | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const fetchStatus = useCallback(async () => {
    setRefreshing(true);
    try {
      const [jellyfinRes, iptvRes] = await Promise.all([
        fetch("/api/jellyfin/status", { cache: "no-store" }),
        fetch("/api/iptv/status", { cache: "no-store" }),
      ]);

      setJellyfin((await jellyfinRes.json()) as JellyfinStatusResponse);
      setIptv((await iptvRes.json()) as IptvStatusResponse);
    } catch {
      setJellyfin({ configured: false, connected: false, error: "Could not reach Rushify API" });
      setIptv({
        configured: false,
        m3uConfigured: false,
        epgConfigured: false,
        channelsCached: false,
        epgCached: false,
        error: "Could not reach Rushify API",
      });
    } finally {
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void fetchStatus();
  }, [fetchStatus]);

  const mediaState = resolveMediaServerState(jellyfin);
  const iptvState = resolveIptvState(iptv);

  const showMediaServerExplainer = mediaState !== "connected";

  return (
    <div className="space-y-6">
      <AboutSection />

      <SupportTroubleshooting />

      {showMediaServerExplainer && <MediaServerExplainer />}

      <ServerDiscovery />

      <Card glow className="border-rush-accent/20">
        <CardTitle>Authorized subscriber access</CardTitle>
        <CardDescription>
          The Rushify service is provided to authorized subscribers only. Credentials are managed
          server-side and are never exposed to the browser.
        </CardDescription>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card glow>
          <div className="flex items-start justify-between gap-4">
            <div>
              <CardTitle>Media Library Server</CardTitle>
              <CardDescription>Your personal movies, shows, and music library.</CardDescription>
            </div>
            <StatusDot state={mediaState} />
          </div>

          <dl className="mt-5 space-y-2 text-sm text-rush-muted">
            {jellyfin?.connected && jellyfin.serverName && (
              <div className="flex justify-between gap-4">
                <dt>Server</dt>
                <dd className="text-rush-foreground">{jellyfin.serverName}</dd>
              </div>
            )}
            {jellyfin?.connected && jellyfin.version && (
              <div className="flex justify-between gap-4">
                <dt>Version</dt>
                <dd className="text-rush-foreground">{jellyfin.version}</dd>
              </div>
            )}
            {jellyfin?.error && mediaState !== "loading" && (
              <p className="rounded-xl border border-red-400/30 bg-red-400/5 px-4 py-3 text-red-300">
                {jellyfin.error}
              </p>
            )}
            {jellyfin?.discoveredUrl && !jellyfin.connected && mediaState !== "loading" && (
              <p className="rounded-xl border border-emerald-400/30 bg-emerald-400/5 px-4 py-3 text-emerald-200/90">
                Auto-discovered server at{" "}
                <code className="text-rush-accent">{jellyfin.discoveredUrl}</code> — add{" "}
                <code className="text-rush-accent">JELLYFIN_SERVER_URL</code> to your .env to
                persist it.
              </p>
            )}
            {mediaState === "not_configured" && (
              <p className="rounded-xl border border-amber-400/30 bg-amber-400/5 px-4 py-3 text-amber-200/90">
                Use <strong className="text-rush-foreground">Scan for Library Server</strong> above,
                or add <code className="text-rush-accent">JELLYFIN_SERVER_URL</code> and{" "}
                <code className="text-rush-accent">JELLYFIN_API_KEY</code> to your environment
                file, then restart.
              </p>
            )}
          </dl>
        </Card>

        <Card glow>
          <div className="flex items-start justify-between gap-4">
            <div>
              <CardTitle>Live TV</CardTitle>
              <CardDescription>Channels and program guide via the media engine.</CardDescription>
            </div>
            <StatusDot state={iptvState} />
          </div>

          <dl className="mt-5 space-y-2 text-sm text-rush-muted">
            {iptv?.configured && (
              <>
                <div className="flex justify-between gap-4">
                  <dt>Backend</dt>
                  <dd className="text-rush-foreground">
                    {iptv.backend === "jellyfin"
                      ? "Media engine"
                      : iptv.backend === "direct"
                        ? "Direct provider"
                        : "Pending"}
                  </dd>
                </div>
                {iptv.channelsCached && iptv.channelCount !== undefined && (
                  <div className="flex justify-between gap-4">
                    <dt>Cached channels</dt>
                    <dd className="text-rush-foreground">{iptv.channelCount}</dd>
                  </div>
                )}
                {iptv.epgProgrammeCount !== undefined && (
                  <div className="flex justify-between gap-4">
                    <dt>Cached programmes</dt>
                    <dd className="text-rush-foreground">{iptv.epgProgrammeCount.toLocaleString()}</dd>
                  </div>
                )}
                {iptv.cache?.cacheAgeSeconds !== undefined && (
                  <div className="flex justify-between gap-4">
                    <dt>Cache age</dt>
                    <dd className="text-rush-foreground">
                      {Math.floor(iptv.cache.cacheAgeSeconds / 60)}m{" "}
                      {iptv.cache.cacheAgeSeconds % 60}s
                      {iptv.cache.channelsSource ? ` (${iptv.cache.channelsSource})` : ""}
                    </dd>
                  </div>
                )}
                {iptv.cache?.epgCacheAgeSeconds !== undefined && (
                  <div className="flex justify-between gap-4">
                    <dt>EPG cache age</dt>
                    <dd className="text-rush-foreground">
                      {formatCacheAge(iptv.cache.epgCacheAgeSeconds)}
                      {iptv.cache.epgSource ? ` (${iptv.cache.epgSource})` : ""}
                    </dd>
                  </div>
                )}
                {iptv.cache?.nextEpgRefresh && (
                  <div className="flex justify-between gap-4">
                    <dt>Next EPG refresh</dt>
                    <dd className="text-rush-foreground">
                      {new Date(iptv.cache.nextEpgRefresh).toLocaleTimeString()}
                    </dd>
                  </div>
                )}
                {iptv.configured && (
                  <div className="flex flex-wrap gap-2 pt-2">
                    <Button
                      variant="secondary"
                      size="sm"
                      disabled={refreshingEpg || epgCooldown > 0}
                      onClick={() => void refresh("epg")}
                    >
                      {formatRefreshButtonLabel({
                        type: "epg",
                        refreshing: refreshingEpg,
                        cooldown: epgCooldown,
                        ageSeconds: iptv.cache?.epgCacheAgeSeconds,
                      })}
                    </Button>
                    <Button
                      variant="secondary"
                      size="sm"
                      disabled={refreshingChannels || channelsCooldown > 0}
                      onClick={() => void refresh("channels")}
                    >
                      {formatRefreshButtonLabel({
                        type: "channels",
                        refreshing: refreshingChannels,
                        cooldown: channelsCooldown,
                        ageSeconds: iptv.cache?.cacheAgeSeconds,
                      })}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      disabled={isRefreshing || epgCooldown > 0 || channelsCooldown > 0}
                      onClick={() => void refresh("all")}
                    >
                      Refresh all
                    </Button>
                  </div>
                )}
              </>
            )}
            {iptvState === "not_configured" && (
              <p className="rounded-xl border border-rush-border bg-rush-canvas/60 px-4 py-3">
                Configure Live TV in the media engine admin UI, then set{" "}
                <code className="text-rush-accent">JELLYFIN_API_KEY</code> in your environment file.
              </p>
            )}
          </dl>
        </Card>
      </div>

      <Card glow>
        <CardTitle>Setup in 3 steps</CardTitle>
        <CardDescription>
          Rushify reads all credentials server-side — your API key never reaches the browser.
        </CardDescription>
        <ol className="mt-6 space-y-5">
          {setupSteps.map((step, index) => (
            <li key={step.title} className="flex gap-4">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-rush-accent/40 bg-rush-accent/10 text-sm font-semibold text-rush-accent">
                {index + 1}
              </span>
              <div>
                <h4 className="font-medium text-rush-foreground">{step.title}</h4>
                <p className="mt-1 text-sm leading-6 text-rush-muted">{step.body}</p>
              </div>
            </li>
          ))}
        </ol>
      </Card>

      <Card glow>
        <CardTitle>Example .env</CardTitle>
        <CardDescription>
          Copy this into <code className="text-rush-accent">.env.local</code> or{" "}
          <code className="text-rush-accent">.env</code> and replace with your values.
        </CardDescription>
        <pre className="mt-4 overflow-x-auto rounded-xl border border-rush-border bg-rush-canvas/80 p-4 text-xs leading-6 text-rush-muted">
          {envExample}
        </pre>
        <div className="mt-4 space-y-2 text-sm text-rush-muted">
          <p>
            <strong className="text-rush-foreground">Local network:</strong> use your server&apos;s
            LAN IP, e.g.{" "}
            <code className="text-rush-accent">http://192.168.1.100:8096</code>
          </p>
          <p>
            <strong className="text-rush-foreground">Docker on same host:</strong> try{" "}
            <code className="text-rush-accent">http://host.docker.internal:8096</code> or your
            container name, e.g.{" "}
            <code className="text-rush-accent">http://jellyfin:8096</code>
          </p>
          <p>
            <strong className="text-rush-foreground">unRAID:</strong> use the container&apos;s IP
            or host IP with port 8096 mapped from your media server app.
          </p>
        </div>
      </Card>

      <div className="flex justify-end">
        <button
          type="button"
          onClick={() => void fetchStatus()}
          disabled={refreshing}
          className="rounded-lg border border-rush-border bg-rush-surface px-4 py-2 text-sm font-medium text-rush-foreground transition-colors hover:border-rush-accent/40 disabled:opacity-50"
        >
          {refreshing ? "Checking…" : "Refresh status"}
        </button>
      </div>
    </div>
  );
}
