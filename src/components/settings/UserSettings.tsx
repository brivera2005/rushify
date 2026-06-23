"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState, type ReactNode } from "react";

import packageJson from "../../../package.json";

import { Button } from "@/components/ui/Button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
import { cn } from "@/lib/utils/cn";
import type { IptvStatusResponse, JellyfinStatusResponse } from "@/types/rushify";

type UserSettingsProps = {
  username: string;
};

type StatusState = "loading" | "connected" | "error";

function SectionIcon({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-rush-accent/20 bg-gradient-to-br from-rush-accent/15 to-[rgba(56,189,248,0.12)] text-rush-accent",
        className,
      )}
    >
      {children}
    </span>
  );
}

function StatusDot({ state }: { state: StatusState }) {
  const colors: Record<StatusState, string> = {
    loading: "bg-rush-muted animate-pulse",
    connected: "bg-emerald-400 shadow-[0_0_12px_rgba(52,211,153,0.5)]",
    error: "bg-red-400 shadow-[0_0_12px_rgba(248,113,113,0.5)]",
  };

  return (
    <span
      className={cn("mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full", colors[state])}
      aria-hidden
    />
  );
}

function ServiceStatusCard({
  title,
  state,
  detail,
}: {
  title: string;
  state: StatusState;
  detail: string;
}) {
  const statusLabel =
    state === "loading" ? "Checking…" : state === "connected" ? "Connected" : "Unavailable";

  return (
    <div className="rounded-2xl border border-rush-border bg-rush-canvas/40 p-4">
      <div className="flex items-start gap-3">
        <StatusDot state={state} />
        <div className="min-w-0 flex-1">
          <h3 className="text-sm font-semibold text-rush-foreground">{title}</h3>
          <p className="mt-1 text-sm leading-6 text-rush-muted">
            {state === "loading" ? (
              "Checking your service…"
            ) : (
              <>
                <span className="font-medium text-rush-foreground">{statusLabel}</span>
                {detail ? (
                  <>
                    {" · "}
                    {detail}
                  </>
                ) : null}
              </>
            )}
          </p>
        </div>
      </div>
    </div>
  );
}

function TipItem({ children }: { children: ReactNode }) {
  return (
    <li className="flex gap-3 text-sm leading-6 text-rush-muted">
      <span
        className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--rush-accent-secondary)]"
        aria-hidden
      />
      <span>{children}</span>
    </li>
  );
}

function formatChannelCount(count: number | undefined): string {
  if (count == null || count <= 0) return "";
  if (count >= 1000) {
    const rounded = Math.floor(count / 1000) * 1000;
    return `${rounded.toLocaleString()}+ channels`;
  }
  return `${count.toLocaleString()} channels`;
}

function formatLibraryStats(movieCount?: number, seriesCount?: number): string {
  const parts: string[] = [];
  if (movieCount != null) parts.push(`${movieCount.toLocaleString()} movies`);
  if (seriesCount != null) parts.push(`${seriesCount.toLocaleString()} series`);
  return parts.join(", ");
}

function resolveLiveTvState(status: IptvStatusResponse | null): StatusState {
  if (!status) return "loading";
  if (!status.configured) return "error";
  if (status.channelCount != null && status.channelCount > 0) return "connected";
  if (status.channelsCached) return "connected";
  return "error";
}

function resolveLibraryState(status: JellyfinStatusResponse | null): StatusState {
  if (!status) return "loading";
  if (!status.configured) return "error";
  return status.connected ? "connected" : "error";
}

const howToWatch = [
  {
    title: "At home",
    description:
      "Connect to your home Wi‑Fi and open the URL your provider gave you.",
  },
  {
    title: "On the go",
    description: "Use the same URL anywhere you have internet.",
  },
  {
    title: "Add to home screen",
    description:
      "On iPhone, tap Share in Safari, then Add to Home Screen. On Android, open the menu in Chrome and tap Add to Home screen for an app-like experience.",
  },
] as const;

export function UserSettings({ username }: UserSettingsProps) {
  const router = useRouter();
  const initial = username.trim().charAt(0).toUpperCase() || "R";
  const [jellyfin, setJellyfin] = useState<JellyfinStatusResponse | null>(null);
  const [iptv, setIptv] = useState<IptvStatusResponse | null>(null);

  const fetchStatus = useCallback(async () => {
    try {
      const [jellyfinRes, iptvRes] = await Promise.all([
        fetch("/api/jellyfin/status", { cache: "no-store" }),
        fetch("/api/iptv/status", { cache: "no-store" }),
      ]);

      setJellyfin((await jellyfinRes.json()) as JellyfinStatusResponse);
      setIptv((await iptvRes.json()) as IptvStatusResponse);
    } catch {
      setJellyfin({ configured: false, connected: false });
      setIptv({
        configured: false,
        m3uConfigured: false,
        epgConfigured: false,
        channelsCached: false,
        epgCached: false,
      });
    }
  }, []);

  useEffect(() => {
    void fetchStatus();
  }, [fetchStatus]);

  const liveTvState = resolveLiveTvState(iptv);
  const libraryState = resolveLibraryState(jellyfin);
  const liveTvDetail = formatChannelCount(iptv?.channelCount);
  const libraryDetail = formatLibraryStats(jellyfin?.movieCount, jellyfin?.seriesCount);

  async function handleSignOut() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  return (
    <div className="mx-auto max-w-3xl space-y-5 pb-8">
      <Card
        glow
        className="overflow-hidden border-rush-accent/15 bg-gradient-to-br from-rush-surface/90 via-rush-surface/80 to-[rgba(56,189,248,0.04)] p-0"
      >
        <div className="flex flex-col gap-5 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
          <div className="flex items-center gap-4">
            <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-rush-accent to-[var(--rush-accent-secondary)] text-lg font-semibold text-rush-ink shadow-glow-sm">
              {initial}
            </span>
            <div>
              <CardTitle className="text-xl">Account</CardTitle>
              <CardDescription className="mt-1">
                You&apos;re signed in as{" "}
                <span className="font-medium text-rush-foreground">{username}</span>
              </CardDescription>
            </div>
          </div>
          <Button variant="secondary" size="md" onClick={() => void handleSignOut()}>
            Sign out
          </Button>
        </div>
      </Card>

      <Card glow className="border-rush-border/80">
        <CardHeader className="flex flex-row items-start gap-4">
          <SectionIcon>
            <svg aria-hidden viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.75">
              <rect x="3" y="5" width="18" height="12" rx="2" />
              <path d="M8 21h8M12 17v4" strokeLinecap="round" />
            </svg>
          </SectionIcon>
          <div>
            <CardTitle>Your service</CardTitle>
            <CardDescription>Everything included with your Rushify access.</CardDescription>
          </div>
        </CardHeader>
        <p className="text-sm leading-7 text-rush-muted">
          Rushify gives you live TV, movies, and shows in one place. Sign in on any device and
          start watching.
        </p>
      </Card>

      <Card glow className="border-rush-border/80">
        <CardHeader className="flex flex-row items-start gap-4">
          <SectionIcon>
            <svg aria-hidden viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.75">
              <path d="M4 7h16M4 12h10M4 17h14" strokeLinecap="round" />
            </svg>
          </SectionIcon>
          <div>
            <CardTitle>Service status</CardTitle>
            <CardDescription>Your Rushify service at a glance.</CardDescription>
          </div>
        </CardHeader>
        <div className="grid gap-3 sm:grid-cols-1">
          <ServiceStatusCard title="Live TV" state={liveTvState} detail={liveTvDetail} />
          <ServiceStatusCard
            title="Movies & Shows"
            state={libraryState}
            detail={libraryDetail}
          />
          <ServiceStatusCard title="Connection" state="connected" detail="Secure · Encrypted sign-in" />
        </div>
      </Card>

      <Card glow className="border-rush-border/80">
        <CardHeader className="flex flex-row items-start gap-4">
          <SectionIcon>
            <svg aria-hidden viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.75">
              <rect x="7" y="2" width="10" height="20" rx="2" />
              <path d="M11 18h2" strokeLinecap="round" />
            </svg>
          </SectionIcon>
          <div>
            <CardTitle>How to watch</CardTitle>
            <CardDescription>Get started on any device.</CardDescription>
          </div>
        </CardHeader>
        <div className="space-y-4">
          {howToWatch.map((item) => (
            <div key={item.title}>
              <h3 className="text-sm font-semibold text-rush-foreground">{item.title}</h3>
              <p className="mt-1 text-sm leading-6 text-rush-muted">{item.description}</p>
            </div>
          ))}
        </div>
      </Card>

      <Card glow className="border-rush-border/80">
        <CardHeader className="flex flex-row items-start gap-4">
          <SectionIcon>
            <svg aria-hidden viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.75">
              <circle cx="12" cy="12" r="9" />
              <path d="M9.5 9.5a3 3 0 015 1.5c0 2-2.5 2.5-2.5 4M12 17h.01" strokeLinecap="round" />
            </svg>
          </SectionIcon>
          <div>
            <CardTitle>Streaming tips</CardTitle>
            <CardDescription>Quick fixes if playback stutters or won&apos;t start.</CardDescription>
          </div>
        </CardHeader>
        <ul className="space-y-3">
          <TipItem>
            If video buffers, try turning VPN <strong className="text-rush-foreground">off</strong>{" "}
            on your device first, then on if that doesn&apos;t help.
          </TipItem>
          <TipItem>Close other apps using bandwidth while you watch.</TipItem>
          <TipItem>Try a different channel or lower quality on movies.</TipItem>
          <TipItem>
            Need more help? Visit{" "}
            <Link href="/support" className="text-rush-accent hover:text-rush-accent/80">
              Support
            </Link>{" "}
            for additional tips.
          </TipItem>
        </ul>
      </Card>

      <Card glow className="border-rush-border/80">
        <CardHeader className="flex flex-row items-start gap-4">
          <SectionIcon>
            <svg aria-hidden viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.75">
              <path d="M12 3l7 4v6c0 4.5-3 7.5-7 8-4-.5-7-3.5-7-8V7l7-4z" strokeLinejoin="round" />
            </svg>
          </SectionIcon>
          <div>
            <CardTitle>Security</CardTitle>
            <CardDescription>How Rushify keeps your access safe.</CardDescription>
          </div>
        </CardHeader>
        <ul className="space-y-3">
          <TipItem>Your password is never shared with other apps.</TipItem>
          <TipItem>Streams are delivered through Rushify&apos;s secure server.</TipItem>
          <TipItem>
            Hosted on high-speed fiber (3.5 Gbps) for reliable playback.
          </TipItem>
        </ul>
      </Card>

      <footer className="rounded-2xl border border-rush-border/50 bg-rush-canvas/20 px-5 py-4">
        <dl className="grid gap-2 text-xs text-rush-muted sm:grid-cols-2">
          <div className="flex justify-between gap-4 sm:block">
            <dt>Service</dt>
            <dd className="text-rush-foreground/80">Rushify</dd>
          </div>
          <div className="flex justify-between gap-4 sm:block">
            <dt>Version</dt>
            <dd className="text-rush-foreground/80">{packageJson.version}</dd>
          </div>
          <div className="flex justify-between gap-4 sm:block">
            <dt>Developed by</dt>
            <dd className="text-rush-foreground/80">Benjamin Rivera</dd>
          </div>
          <div className="flex justify-between gap-4 sm:block">
            <dt>Copyright</dt>
            <dd className="text-rush-foreground/80">© 2026 Rushify</dd>
          </div>
        </dl>
      </footer>
    </div>
  );
}
