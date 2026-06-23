"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";

import { MediaGrid } from "@/components/media/MediaGrid";
import type { JellyfinMediaItem } from "@/types/jellyfin";

type LibrarySearchBarProps = {
  section?: "movies" | "shows" | "all";
  className?: string;
};

type SearchAskResponse = {
  items?: JellyfinMediaItem[];
  mode?: "gemini" | "jellyfin";
  error?: string;
  retryAfterSeconds?: number;
};

export function LibrarySearchBar({ section = "all", className }: LibrarySearchBarProps) {
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [results, setResults] = useState<JellyfinMediaItem[]>([]);
  const [mode, setMode] = useState<"gemini" | "jellyfin" | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedQuery(query.trim()), 400);
    return () => window.clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    if (!debouncedQuery) {
      setResults([]);
      setMode(null);
      setError(null);
      setOpen(false);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    fetch("/api/search/ask", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ query: debouncedQuery, section }),
    })
      .then(async (response) => {
        const payload = (await response.json()) as SearchAskResponse;
        if (cancelled) return;

        if (!response.ok) {
          setResults([]);
          setMode(null);
          setError(payload.error ?? "Search failed");
          setOpen(true);
          return;
        }

        setResults(payload.items ?? []);
        setMode(payload.mode ?? "jellyfin");
        setOpen(true);
      })
      .catch(() => {
        if (!cancelled) {
          setError("Search unavailable");
          setOpen(true);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [debouncedQuery, section]);

  useEffect(() => {
    function onPointerDown(event: MouseEvent) {
      if (!containerRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, []);

  const clear = useCallback(() => {
    setQuery("");
    setDebouncedQuery("");
    setResults([]);
    setOpen(false);
    setError(null);
  }, []);

  return (
    <div ref={containerRef} className={className}>
      <label className="relative block">
        <span className="sr-only">Search library</span>
        <input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          onFocus={() => {
            if (debouncedQuery) setOpen(true);
          }}
          placeholder="Search or ask: comedy with Seth Rogen…"
          className="w-full rounded-xl border border-rush-border bg-rush-surface px-4 py-3 pr-10 text-sm text-rush-foreground outline-none transition-colors placeholder:text-rush-muted focus:border-rush-accent/50"
        />
        {query && (
          <button
            type="button"
            onClick={clear}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-rush-muted hover:text-rush-foreground"
            aria-label="Clear search"
          >
            ✕
          </button>
        )}
      </label>

      {open && (loading || error || results.length > 0) && (
        <div className="relative z-30">
          <div className="absolute mt-2 w-full overflow-hidden rounded-xl border border-rush-border bg-rush-elevated shadow-glow">
            {loading && (
              <p className="px-4 py-3 text-sm text-rush-muted">Searching…</p>
            )}

            {error && !loading && (
              <p className="px-4 py-3 text-sm text-red-300" role="alert">
                {error}
              </p>
            )}

            {!loading && !error && results.length === 0 && debouncedQuery && (
              <p className="px-4 py-3 text-sm text-rush-muted">No matches found.</p>
            )}

            {!loading && results.length > 0 && (
              <div className="border-b border-rush-border px-4 py-2 text-xs text-rush-muted">
                {mode === "gemini" ? "AI matches" : "Library matches"} · {results.length} result
                {results.length === 1 ? "" : "s"}
              </div>
            )}

            {!loading && results.length > 0 && (
              <div className="max-h-[420px] overflow-y-auto p-3">
                <MediaGrid items={results.slice(0, 12)} section={section === "all" ? undefined : section} compact />
                {results.length > 12 && (
                  <p className="mt-2 text-center text-xs text-rush-muted">
                    Showing top 12. Refine your search for more.
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {section !== "all" && debouncedQuery && results.length > 0 && (
        <p className="mt-2 text-xs text-rush-muted">
          Tip: browse{" "}
          <Link href={section === "movies" ? "/shows" : "/movies"} className="text-rush-accent">
            {section === "movies" ? "shows" : "movies"}
          </Link>{" "}
          for more results.
        </p>
      )}
    </div>
  );
}
