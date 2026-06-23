"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

import { Button } from "@/components/ui/Button";
import { Card, CardDescription, CardTitle } from "@/components/ui/Card";
import { formatRefreshButtonLabel, useIptvRefresh } from "@/hooks/useIptvRefresh";
import type { AdminOverviewResponse } from "@/types/rushify";

type StatusState = "loading" | "connected" | "error" | "not_configured";

function StatusBadge({ state }: { state: StatusState }) {
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

function CopyBlock({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard unavailable
    }
  }

  return (
    <div className="relative mt-4">
      <pre className="overflow-x-auto rounded-xl border border-rush-border bg-rush-canvas/80 p-4 pr-24 text-xs leading-6 text-rush-muted">
        {text}
      </pre>
      <button
        type="button"
        onClick={() => void handleCopy()}
        className="absolute right-3 top-3 rounded-lg border border-rush-border bg-rush-surface px-3 py-1.5 text-xs font-medium text-rush-foreground transition-colors hover:border-rush-accent/40"
      >
        {copied ? "Copied" : "Copy"}
      </button>
    </div>
  );
}

const usersExample = `RUSHIFY_USERS=[
  {"username":"client1","password":"change-me","role":"user"},
  {"username":"client2","password":"change-me","role":"user"}
]`;

function formatRefreshTime(iso: string | undefined): string {
  if (!iso) return "Never";
  return new Date(iso).toLocaleString();
}

export function AdminSettingsPanel() {
  const {
    refresh,
    refreshingEpg,
    refreshingChannels,
    epgCooldown,
    channelsCooldown,
    isRefreshing,
  } = useIptvRefresh();
  const [overview, setOverview] = useState<AdminOverviewResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [operatorOpen, setOperatorOpen] = useState(false);

  const fetchOverview = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/admin/overview", { cache: "no-store" });
      if (response.ok) {
        setOverview((await response.json()) as AdminOverviewResponse);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchOverview();
  }, [fetchOverview]);

  const jellyfinState: StatusState = loading
    ? "loading"
    : !overview?.jellyfin.configured
      ? "not_configured"
      : overview.jellyfin.connected
        ? "connected"
        : "error";

  const iptvState: StatusState = loading
    ? "loading"
    : !overview?.iptv.configured
      ? "not_configured"
      : overview.iptv.connected
        ? "connected"
        : "error";

  return (
    <div className="space-y-6">
      <Card glow className="border-rush-accent/20">
        <CardTitle>What is Rushify?</CardTitle>
        <CardDescription>What you are offering to your clients.</CardDescription>
        <div className="mt-4 space-y-3 text-sm leading-6 text-rush-muted">
          <p>
            Rushify is your private media service: live TV, movies, and shows in one app. Developed
            by Benjamin Rivera.
          </p>
          <p>
            Clients access Rushify through their browser or by adding it to their home screen on
            phone, tablet, or TV. You host the server on your network. They subscribe as authorized
            users you create.
          </p>
          <p>
            You configure the media library and live TV sources once on the server. Clients sign in
            and start watching. No technical setup required on their devices.
          </p>
        </div>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card glow>
          <div className="flex items-start justify-between gap-4">
            <div>
              <CardTitle>Media engine</CardTitle>
              <CardDescription>Movies, shows, and library behind Rushify.</CardDescription>
            </div>
            <StatusBadge state={jellyfinState} />
          </div>

          <dl className="mt-5 space-y-2 text-sm text-rush-muted">
            <div className="flex justify-between gap-4">
              <dt>Server URL</dt>
              <dd className="text-rush-foreground">
                {overview?.jellyfin.serverUrlConfigured ? "http://••••••:8097" : "Not configured"}
              </dd>
            </div>
            {overview?.jellyfin.connected && overview.jellyfin.serverName && (
              <div className="flex justify-between gap-4">
                <dt>Server name</dt>
                <dd className="text-rush-foreground">{overview.jellyfin.serverName}</dd>
              </div>
            )}
            {overview?.jellyfin.connected && overview.jellyfin.version && (
              <div className="flex justify-between gap-4">
                <dt>Version</dt>
                <dd className="text-rush-foreground">{overview.jellyfin.version}</dd>
              </div>
            )}
            {overview?.jellyfin.connected && overview.jellyfin.movieCount !== undefined && (
              <div className="flex justify-between gap-4">
                <dt>Movies</dt>
                <dd className="text-rush-foreground">{overview.jellyfin.movieCount.toLocaleString()}</dd>
              </div>
            )}
            {overview?.jellyfin.connected && overview.jellyfin.seriesCount !== undefined && (
              <div className="flex justify-between gap-4">
                <dt>Series</dt>
                <dd className="text-rush-foreground">{overview.jellyfin.seriesCount.toLocaleString()}</dd>
              </div>
            )}
            {overview?.jellyfin.connected && overview.jellyfin.episodeCount !== undefined && (
              <div className="flex justify-between gap-4">
                <dt>Episodes</dt>
                <dd className="text-rush-foreground">{overview.jellyfin.episodeCount.toLocaleString()}</dd>
              </div>
            )}
          </dl>

          <p className="mt-4 rounded-xl border border-rush-border bg-rush-canvas/60 px-4 py-3 text-sm text-rush-muted">
            Set <code className="text-rush-accent">JELLYFIN_SERVER_URL</code> and{" "}
            <code className="text-rush-accent">JELLYFIN_API_KEY</code> in your server{" "}
            <code className="text-rush-accent">.env</code> file, then redeploy. The media engine runs on
            port 8097 internally. Never expose it directly to the internet.
          </p>
        </Card>

        <Card glow>
          <div className="flex items-start justify-between gap-4">
            <div>
              <CardTitle>Live TV</CardTitle>
              <CardDescription>Channels and electronic program guide.</CardDescription>
            </div>
            <StatusBadge state={iptvState} />
          </div>

          <dl className="mt-5 space-y-2 text-sm text-rush-muted">
            <div className="flex justify-between gap-4">
              <dt>Source</dt>
              <dd className="text-rush-foreground">
                {overview?.iptv.backend === "jellyfin"
                  ? "Media engine"
                  : overview?.iptv.backend === "direct"
                    ? overview.iptv.directFallback
                      ? "Direct fallback"
                      : "Direct provider"
                    : overview?.iptv.configured
                      ? "Pending"
                      : "Not configured"}
              </dd>
            </div>
            {overview?.iptv.directFallback && (
              <div className="flex justify-between gap-4">
                <dt>Fallback</dt>
                <dd className="text-amber-300">Active — media engine Live TV unavailable</dd>
              </div>
            )}
            <div className="flex justify-between gap-4">
              <dt>Provider credentials</dt>
              <dd className="text-rush-foreground">
                {overview?.iptv.credentialsConfigured
                  ? "Configured on server"
                  : "Not required"}
              </dd>
            </div>
            {overview?.iptv.configured && overview.iptv.channelCount !== undefined && (
              <div className="flex justify-between gap-4">
                <dt>Channels</dt>
                <dd className="text-rush-foreground">
                  {overview.iptv.totalChannelCount != null &&
                  overview.iptv.totalChannelCount > overview.iptv.channelCount
                    ? `${overview.iptv.channelCount.toLocaleString()} of ${overview.iptv.totalChannelCount.toLocaleString()}`
                    : overview.iptv.channelCount.toLocaleString()}
                  {overview.iptv.usOnly ? " (US only)" : null}
                </dd>
              </div>
            )}
            {overview?.iptv.configured && overview.iptv.epgCount !== undefined && (
              <div className="flex justify-between gap-4">
                <dt>EPG programmes</dt>
                <dd className="text-rush-foreground">{overview.iptv.epgCount.toLocaleString()}</dd>
              </div>
            )}
            {overview?.iptv.configured && (
              <div className="flex justify-between gap-4">
                <dt>Last refresh</dt>
                <dd className="text-rush-foreground">{formatRefreshTime(overview.iptv.lastRefresh)}</dd>
              </div>
            )}
          </dl>

          {overview?.iptv.configured && (
            <div className="mt-4 flex flex-wrap gap-2">
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

          <p className="mt-4 rounded-xl border border-rush-border bg-rush-canvas/60 px-4 py-3 text-sm text-rush-muted">
            Live TV is configured in the media engine admin UI (tuner + guide). Rushify reads channels
            and EPG from the engine API. Provider credentials stay in server{" "}
            <code className="text-rush-accent">.env</code> for engine setup and fallback only.
          </p>
        </Card>
      </div>

      <Card glow className="border-rush-accent/20">
        <CardTitle>Remote Access</CardTitle>
        <CardDescription>What URL to give your clients when they are away from home.</CardDescription>
        <div className="mt-4 space-y-3 text-sm leading-6 text-rush-muted">
          <p>
            Clients on your home network can use your local address. Remote users need the{" "}
            <strong className="text-rush-foreground">public server URL</strong> to reach Rushify from
            outside your network.
          </p>
          <div className="rounded-xl border border-emerald-400/30 bg-emerald-400/5 px-4 py-3">
            <p className="text-xs uppercase tracking-wider text-emerald-200/80">
              Give this URL to your clients
            </p>
            <p className="mt-1 font-mono text-base text-rush-foreground">
              {overview?.publicUrl ?? "Loading…"}
            </p>
          </div>
          <p>
            Set <code className="text-rush-accent">RUSHIFY_PUBLIC_URL</code> in your server{" "}
            <code className="text-rush-accent">.env</code> to match what clients should use, for
            example <code className="text-rush-accent">http://your-public-ip:8096</code> or{" "}
            <code className="text-rush-accent">https://rushify.yourdomain.com</code>.
          </p>
          <p>
            Forward external port <strong className="text-rush-foreground">8096</strong> only. Do not
            expose the media engine (8097) or your NAS admin panel.
          </p>
          <Link
            href="/support"
            className="inline-flex text-sm font-medium text-rush-accent hover:text-rush-accent/80"
          >
            VPN troubleshooting on Support
          </Link>
        </div>
      </Card>

      <Card glow>
        <CardTitle>Client Accounts</CardTitle>
        <CardDescription>
          Authorized users from <code className="text-rush-accent">RUSHIFY_USERS</code>.
        </CardDescription>
        <p className="mt-4 text-sm text-rush-muted">
          Add clients by editing <code className="text-rush-accent">RUSHIFY_USERS</code> in your
          server <code className="text-rush-accent">.env</code> and redeploying. Accounts are
          hard-coded: create one as each client signs up.
        </p>

        {overview && overview.users.length > 0 && (
          <ul className="mt-4 space-y-2">
            {overview.users.map((user) => (
              <li
                key={user.username}
                className="flex items-center justify-between rounded-xl border border-rush-border bg-rush-canvas/60 px-4 py-2.5 text-sm"
              >
                <span className="font-medium text-rush-foreground">{user.username}</span>
                <span className="rounded-full border border-rush-border px-2.5 py-0.5 text-xs capitalize text-rush-muted">
                  {user.role}
                </span>
              </li>
            ))}
          </ul>
        )}

        <p className="mt-4 text-sm text-rush-muted">
          Example format (replace placeholder passwords before deploying):
        </p>
        <CopyBlock text={usersExample} />
      </Card>

      <Card glow>
        <CardTitle>Security</CardTitle>
        <CardDescription>Port forward checklist and protection layers.</CardDescription>
        <div className="mt-4 space-y-4 text-sm leading-6 text-rush-muted">
          <ul className="list-disc space-y-2 pl-5">
            <li>
              <strong className="text-rush-foreground">Access PIN:</strong>{" "}
              {overview?.pinEnabled ? (
                <span className="text-emerald-300">Enabled</span>
              ) : (
                <>
                  Not set. Add <code className="text-rush-accent">RUSHIFY_ACCESS_PIN</code> to{" "}
                  <code className="text-rush-accent">.env</code> for a PIN gate before login.
                </>
              )}
            </li>
            <li>
              <strong className="text-rush-foreground">HTTPS:</strong>{" "}
              {overview?.tlsEnabled ? (
                <span className="text-emerald-300">Enabled (RUSHIFY_TLS=true)</span>
              ) : (
                <>
                  Off. Set <code className="text-rush-accent">RUSHIFY_TLS=true</code> for HTTPS.
                </>
              )}
            </li>
            <li>
              <strong className="text-rush-foreground">Login rate limiting:</strong> 5 attempts per
              minute, IP ban after 10 failed logins (built in).
            </li>
            <li>
              <strong className="text-rush-foreground">Bot blocking:</strong> Caddy blocks common
              scanner paths (built in).
            </li>
            <li>
              <strong className="text-rush-foreground">Tailscale:</strong> Recommended alternative
              to port forwarding. No router changes needed.
            </li>
          </ul>

          <div>
            <h4 className="font-medium text-rush-foreground">Standard port forward setup</h4>
            <ol className="mt-2 list-decimal space-y-2 pl-5">
              <li>Forward external 8096 to 192.168.0.19:8096 on your router.</li>
              <li>
                Set <code className="text-rush-accent">RUSHIFY_PUBLIC_URL</code> to your public IP
                or domain.
              </li>
              <li>
                Set <code className="text-rush-accent">RUSHIFY_ACCESS_PIN</code> in{" "}
                <code className="text-rush-accent">.env</code>.
              </li>
              <li>
                Optional: <code className="text-rush-accent">RUSHIFY_TLS=true</code> for HTTPS.
              </li>
              <li>
                Redeploy:{" "}
                <code className="text-rush-accent">
                  bash /mnt/user/appdata/rushify/deploy/unraid/deploy.sh
                </code>
              </li>
            </ol>
          </div>

          <Link
            href="/support"
            className="inline-flex text-sm font-medium text-rush-accent hover:text-rush-accent/80"
          >
            Port forward and VPN guide on Support
          </Link>
        </div>
      </Card>

      <Card glow>
        <button
          type="button"
          className="flex w-full items-center justify-between text-left"
          onClick={() => setOperatorOpen((open) => !open)}
          aria-expanded={operatorOpen}
        >
          <div>
            <CardTitle>Development / Operator Notes</CardTitle>
            <CardDescription>unRAID deployment reference (admin only).</CardDescription>
          </div>
          <span className="text-rush-muted">{operatorOpen ? "▲" : "▼"}</span>
        </button>

        {operatorOpen && (
          <div className="mt-4 space-y-3 text-sm leading-6 text-rush-muted">
            <dl className="space-y-2">
              <div className="flex justify-between gap-4">
                <dt>Deploy command</dt>
                <dd className="font-mono text-xs text-rush-foreground">
                  bash /mnt/user/appdata/rushify/deploy/unraid/deploy.sh
                </dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt>App path</dt>
                <dd className="font-mono text-xs text-rush-foreground">/mnt/user/appdata/rushify</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt>Env file</dt>
                <dd className="font-mono text-xs text-rush-foreground">
                  /mnt/user/appdata/rushify/.env
                </dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt>Public port</dt>
                <dd className="text-rush-foreground">8096 (Rushify + Caddy)</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt>Media engine port</dt>
                <dd className="text-rush-foreground">8097 (internal only)</dd>
              </div>
            </dl>
            <p>
              <strong className="text-rush-foreground">Add a user:</strong> edit{" "}
              <code className="text-rush-accent">RUSHIFY_USERS</code> in{" "}
              <code className="text-rush-accent">.env</code>, then redeploy.
            </p>
            <p>
              <strong className="text-rush-foreground">Refresh EPG:</strong> use Refresh buttons in
              the Live TV section above, or redeploy to clear cache.
            </p>
            <p>
              <strong className="text-rush-foreground">Restart container:</strong>{" "}
              <code className="text-rush-accent">docker restart rushify rushify-caddy</code>
            </p>
          </div>
        )}
      </Card>

      <div className="flex justify-end">
        <button
          type="button"
          onClick={() => void fetchOverview()}
          disabled={loading}
          className="rounded-lg border border-rush-border bg-rush-surface px-4 py-2 text-sm font-medium text-rush-foreground transition-colors hover:border-rush-accent/40 disabled:opacity-50"
        >
          {loading ? "Checking…" : "Refresh status"}
        </button>
      </div>
    </div>
  );
}
