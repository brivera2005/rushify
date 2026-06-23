"use client";

import { useCallback, useState } from "react";

import { Button } from "@/components/ui/Button";
import { Card, CardDescription, CardTitle } from "@/components/ui/Card";
import type { JellyfinDiscoveryResponse } from "@/types/rushify";

function CandidateIcon({ status }: { status: JellyfinDiscoveryResponse["candidates"][number]["status"] }) {
  if (status === "ok") {
    return (
      <span className="text-emerald-400" aria-label="Found">
        ✓
      </span>
    );
  }

  if (status === "timeout") {
    return (
      <span className="text-amber-400" aria-label="Timed out">
        ⏱
      </span>
    );
  }

  return (
    <span className="text-red-400" aria-label="Not found">
      ✗
    </span>
  );
}

export function ServerDiscovery() {
  const [scanning, setScanning] = useState(false);
  const [result, setResult] = useState<JellyfinDiscoveryResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const runScan = useCallback(async (force = true) => {
    setScanning(true);
    setError(null);
    setCopied(false);

    try {
      const response = await fetch(`/api/jellyfin/discover${force ? "?force=true" : ""}`, {
        cache: "no-store",
      });

      if (!response.ok) {
        throw new Error("Discovery request failed");
      }

      setResult((await response.json()) as JellyfinDiscoveryResponse);
    } catch {
      setError("Could not run discovery scan. Check that Rushify is running and try again.");
      setResult(null);
    } finally {
      setScanning(false);
    }
  }, []);

  const envLine = result?.url ? `JELLYFIN_SERVER_URL=${result.url}` : null;

  const copyEnvLine = useCallback(async () => {
    if (!envLine) return;

    try {
      await navigator.clipboard.writeText(envLine);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  }, [envLine]);

  return (
    <Card glow className="border-rush-accent/30">
      <CardTitle>Find My Server</CardTitle>
      <CardDescription>
        Rushify does not install a media server. This scan only checks whether one you already
        run is reachable on port 8096 from this PC. Read-only; no account or media access.
      </CardDescription>

      <div className="mt-6">
        <Button
          type="button"
          className="w-full px-6 py-3 text-base sm:w-auto"
          onClick={() => void runScan()}
          disabled={scanning}
        >
          {scanning ? "Scanning…" : "Scan for Library Server"}
        </Button>
      </div>

      {error && (
        <p className="mt-4 rounded-xl border border-red-400/30 bg-red-400/5 px-4 py-3 text-sm text-red-300">
          {error}
        </p>
      )}

      {result && (
        <div className="mt-6 space-y-4">
          {result.found ? (
            <div className="rounded-xl border border-emerald-400/30 bg-emerald-400/5 px-4 py-4">
              <p className="font-medium text-emerald-200">Media server found</p>
              <dl className="mt-3 space-y-2 text-sm text-rush-muted">
                <div className="flex justify-between gap-4">
                  <dt>URL</dt>
                  <dd className="text-right font-mono text-rush-foreground">{result.url}</dd>
                </div>
                {result.serverName && (
                  <div className="flex justify-between gap-4">
                    <dt>Server</dt>
                    <dd className="text-rush-foreground">{result.serverName}</dd>
                  </div>
                )}
                {result.version && (
                  <div className="flex justify-between gap-4">
                    <dt>Version</dt>
                    <dd className="text-rush-foreground">{result.version}</dd>
                  </div>
                )}
              </dl>
              {envLine && (
                <div className="mt-4 space-y-2">
                  <p className="text-sm text-rush-muted">
                    Add this line to your{" "}
                    <code className="text-rush-accent">.env</code> or{" "}
                    <code className="text-rush-accent">.env.local</code> file, then restart
                    Rushify:
                  </p>
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                    <pre className="flex-1 overflow-x-auto rounded-lg border border-rush-border bg-rush-canvas/80 px-3 py-2 text-xs text-rush-foreground">
                      {envLine}
                    </pre>
                    <Button type="button" variant="secondary" onClick={() => void copyEnvLine()}>
                      {copied ? "Copied" : "Copy line"}
                    </Button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="rounded-xl border border-amber-400/30 bg-amber-400/5 px-4 py-4 text-sm text-amber-100/90">
              <p className="font-medium text-amber-200">No media server found on port 8096</p>
              <ul className="mt-3 list-disc space-y-2 pl-5 text-rush-muted">
                <li>Is your media server running and reachable from this machine?</li>
                <li>On unRAID, confirm the container is started and port 8096 is published.</li>
                <li>
                  If it runs on a different host or port, add extra candidates with{" "}
                  <code className="text-rush-accent">JELLYFIN_DISCOVERY_URLS</code> (comma-separated
                  URLs) in your environment file.
                </li>
              </ul>
            </div>
          )}

          <div>
            <h4 className="text-sm font-medium text-rush-foreground">Candidates checked</h4>
            <ul className="mt-3 max-h-64 space-y-2 overflow-y-auto rounded-xl border border-rush-border bg-rush-canvas/40 p-3">
              {result.candidates.map((candidate) => (
                <li
                  key={candidate.url}
                  className="flex items-start gap-3 text-sm text-rush-muted"
                >
                  <span className="mt-0.5 shrink-0">
                    <CandidateIcon status={candidate.status} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="break-all font-mono text-xs text-rush-foreground">
                      {candidate.url}
                    </p>
                    {candidate.serverName && (
                      <p className="mt-0.5 text-xs">{candidate.serverName}</p>
                    )}
                    {candidate.status === "timeout" && (
                      <p className="mt-0.5 text-xs">Timed out after 2 seconds</p>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </Card>
  );
}
