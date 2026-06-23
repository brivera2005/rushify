"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useInfiniteQuery, useQuery } from "@tanstack/react-query";

import { MediaGrid } from "@/components/media/MediaGrid";
import { LibrarySearchBar } from "@/components/search/LibrarySearchBar";
import type { JellyfinMediaItem, LibraryBrowseSort } from "@/types/jellyfin";

type BrowseSection = "movies" | "shows";

const PAGE_SIZE = 48;

type BrowsePage = {
  items: JellyfinMediaItem[];
  totalCount: number;
  startIndex: number;
  limit: number;
};

class BrowseLoadError extends Error {
  offline: boolean;

  constructor(message: string, offline: boolean) {
    super(message);
    this.offline = offline;
  }
}

type BrowseFilters = {
  sort: LibraryBrowseSort;
  genre: string;
  yearMin: string;
  yearMax: string;
  search: string;
};

function buildBrowseQuery(section: BrowseSection, filters: BrowseFilters, pageIndex: number) {
  const params = new URLSearchParams({
    section,
    startIndex: String(pageIndex * PAGE_SIZE),
    limit: String(PAGE_SIZE),
    sort: filters.sort,
  });

  if (filters.genre) params.set("genre", filters.genre);
  if (filters.yearMin) params.set("yearMin", filters.yearMin);
  if (filters.yearMax) params.set("yearMax", filters.yearMax);
  if (filters.search) params.set("search", filters.search);

  return params.toString();
}

async function fetchBrowsePage(
  section: BrowseSection,
  filters: BrowseFilters,
  pageIndex: number,
): Promise<BrowsePage> {
  const response = await fetch(`/api/library/items?${buildBrowseQuery(section, filters, pageIndex)}`, {
    credentials: "include",
  });
  const data = (await response.json()) as BrowsePage & { error?: string };

  if (!response.ok) {
    const offline = response.status === 503 || data.error === "Media server offline";
    throw new BrowseLoadError(data.error ?? "Failed to load library", offline);
  }

  return {
    items: data.items ?? [],
    totalCount: data.totalCount ?? 0,
    startIndex: data.startIndex ?? 0,
    limit: data.limit ?? PAGE_SIZE,
  };
}

async function fetchGenres(section: BrowseSection): Promise<string[]> {
  const response = await fetch(`/api/library/genres?section=${section}`, { credentials: "include" });
  if (!response.ok) return [];
  const data = (await response.json()) as { genres?: string[] };
  return data.genres ?? [];
}

type BrowseContentProps = {
  section: BrowseSection;
  emptyMessage: string;
};

export function BrowseContent({ section, emptyMessage }: BrowseContentProps) {
  const [filters, setFilters] = useState<BrowseFilters>({
    sort: "recent",
    genre: "",
    yearMin: "",
    yearMax: "",
    search: "",
  });
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const loadMoreRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedSearch(filters.search.trim());
    }, 300);
    return () => window.clearTimeout(timer);
  }, [filters.search]);

  const activeFilters = useMemo(
    () => ({ ...filters, search: debouncedSearch }),
    [filters, debouncedSearch],
  );

  const genresQuery = useQuery({
    queryKey: ["library", "genres", section],
    queryFn: () => fetchGenres(section),
    staleTime: 5 * 60_000,
  });

  const browseQuery = useInfiniteQuery({
    queryKey: ["library", "browse", section, activeFilters],
    queryFn: ({ pageParam = 0 }) => fetchBrowsePage(section, activeFilters, pageParam),
    initialPageParam: 0,
    getNextPageParam: (lastPage, pages) => {
      const loaded = pages.reduce((sum, page) => sum + page.items.length, 0);
      if (loaded >= lastPage.totalCount) return undefined;
      return pages.length;
    },
  });

  const items = useMemo(
    () => browseQuery.data?.pages.flatMap((page) => page.items) ?? [],
    [browseQuery.data?.pages],
  );

  const totalCount = browseQuery.data?.pages[0]?.totalCount ?? 0;

  const loadMore = useCallback(() => {
    if (browseQuery.hasNextPage && !browseQuery.isFetchingNextPage) {
      void browseQuery.fetchNextPage();
    }
  }, [browseQuery]);

  useEffect(() => {
    const node = loadMoreRef.current;
    if (!node) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) loadMore();
      },
      { rootMargin: "400px" },
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [loadMore, items.length]);

  const updateFilter = useCallback(
    <K extends keyof BrowseFilters>(key: K, value: BrowseFilters[K]) => {
      setFilters((current) => ({ ...current, [key]: value }));
    },
    [],
  );

  if (browseQuery.isLoading) {
    return (
      <div className="space-y-6">
        <div className="h-11 max-w-xl animate-pulse rounded-xl bg-rush-surface" />
        <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-7 xl:grid-cols-8">
          {Array.from({ length: 24 }).map((_, i) => (
            <div key={i} className="space-y-1.5">
              <div className="aspect-[2/3] animate-pulse rounded-lg bg-rush-surface" />
              <div className="h-3 animate-pulse rounded bg-rush-surface" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (browseQuery.error instanceof BrowseLoadError && browseQuery.error.offline) {
    return (
      <div className="rounded-2xl border border-amber-400/30 bg-amber-400/10 px-6 py-12 text-center text-sm text-amber-100/90">
        Movies and shows are temporarily unavailable. Live TV is still available from the sidebar.
      </div>
    );
  }

  if (browseQuery.error) {
    return (
      <div className="rounded-2xl border border-red-400/30 bg-red-400/10 px-6 py-12 text-center text-sm text-red-200">
        Could not load your library. Try signing in again.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <LibrarySearchBar section={section} />

      <div className="flex flex-col gap-3 lg:flex-row lg:flex-wrap lg:items-end">
        <label className="block min-w-[200px] flex-1">
          <span className="sr-only">Filter by title</span>
          <input
            type="search"
            value={filters.search}
            onChange={(event) => updateFilter("search", event.target.value)}
            placeholder={`Filter ${section} by title…`}
            className="w-full rounded-xl border border-rush-border bg-rush-surface px-4 py-2.5 text-sm text-rush-foreground outline-none transition-colors placeholder:text-rush-muted focus:border-rush-accent/50"
          />
        </label>

        <select
          value={filters.sort}
          onChange={(event) => updateFilter("sort", event.target.value as LibraryBrowseSort)}
          className="rounded-xl border border-rush-border bg-rush-surface px-4 py-2.5 text-sm text-rush-foreground outline-none focus:border-rush-accent/50"
          aria-label="Sort order"
        >
          <option value="recent">Recently added</option>
          <option value="az">A–Z</option>
          <option value="release">Release date</option>
        </select>

        <select
          value={filters.genre}
          onChange={(event) => updateFilter("genre", event.target.value)}
          className="rounded-xl border border-rush-border bg-rush-surface px-4 py-2.5 text-sm text-rush-foreground outline-none focus:border-rush-accent/50"
          aria-label="Filter by genre"
        >
          <option value="">All genres</option>
          {(genresQuery.data ?? []).map((genre) => (
            <option key={genre} value={genre}>
              {genre}
            </option>
          ))}
        </select>

        <div className="flex gap-2">
          <input
            type="number"
            inputMode="numeric"
            placeholder="From year"
            value={filters.yearMin}
            onChange={(event) => updateFilter("yearMin", event.target.value)}
            className="w-28 rounded-xl border border-rush-border bg-rush-surface px-3 py-2.5 text-sm text-rush-foreground outline-none focus:border-rush-accent/50"
            aria-label="Minimum year"
          />
          <input
            type="number"
            inputMode="numeric"
            placeholder="To year"
            value={filters.yearMax}
            onChange={(event) => updateFilter("yearMax", event.target.value)}
            className="w-28 rounded-xl border border-rush-border bg-rush-surface px-3 py-2.5 text-sm text-rush-foreground outline-none focus:border-rush-accent/50"
            aria-label="Maximum year"
          />
        </div>
      </div>

      {totalCount > 0 && (
        <p className="text-xs text-rush-muted">
          Showing {items.length.toLocaleString()} of {totalCount.toLocaleString()} {section}
        </p>
      )}

      <MediaGrid items={items} emptyMessage={emptyMessage} section={section} compact />

      <div ref={loadMoreRef} className="h-8">
        {browseQuery.isFetchingNextPage && (
          <p className="text-center text-sm text-rush-muted">Loading more…</p>
        )}
      </div>
    </div>
  );
}
