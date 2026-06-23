import { NextRequest, NextResponse } from "next/server";

import {
  browseLibraryItems,
  fetchAllLibrary,
  fetchRecentlyAdded,
  fetchRecentlyAddedMovies,
  fetchRecentlyAddedShows,
  fetchResumeItems,
} from "@/lib/jellyfin/library";
import { resolveJellyfinServerUrl } from "@/lib/jellyfin/discovery";
import type { LibraryBrowseSort, LibrarySection } from "@/types/jellyfin";

export const dynamic = "force-dynamic";

const SECTIONS: LibrarySection[] = [
  "resume",
  "recent",
  "recent-movies",
  "recent-shows",
  "movies",
  "shows",
  "all",
];

const SORTS: LibraryBrowseSort[] = ["recent", "az", "release"];

function parseOptionalInt(value: string | null): number | undefined {
  if (value == null || value.trim() === "") return undefined;
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : undefined;
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  const params = request.nextUrl.searchParams;
  const section = (params.get("section") ?? "all") as LibrarySection;

  if (!SECTIONS.includes(section)) {
    return NextResponse.json({ error: "Invalid section" }, { status: 400 });
  }

  const serverUrl = await resolveJellyfinServerUrl();
  if (!serverUrl) {
    return NextResponse.json({ error: "Media server offline" }, { status: 503 });
  }

  const sort = params.get("sort") as LibraryBrowseSort | null;
  if (sort && !SORTS.includes(sort)) {
    return NextResponse.json({ error: "Invalid sort" }, { status: 400 });
  }

  const startIndex = parseOptionalInt(params.get("startIndex")) ?? 0;
  const limit = Math.min(parseOptionalInt(params.get("limit")) ?? 48, 100);
  const yearMin = parseOptionalInt(params.get("yearMin"));
  const yearMax = parseOptionalInt(params.get("yearMax"));
  const genre = params.get("genre")?.trim() || undefined;
  const search = params.get("search")?.trim() || undefined;

  try {
    if (section === "movies" || section === "shows") {
      const page = await browseLibraryItems({
        section,
        startIndex,
        limit,
        sort: sort ?? "recent",
        genre,
        yearMin,
        yearMax,
        search,
      });

      return NextResponse.json({
        items: page.items,
        section,
        totalCount: page.totalCount,
        startIndex: page.startIndex,
        limit: page.limit,
      });
    }

    let items;

    switch (section) {
      case "resume":
        items = await fetchResumeItems(limit);
        break;
      case "recent":
        items = await fetchRecentlyAdded(limit);
        break;
      case "recent-movies":
        items = await fetchRecentlyAddedMovies(limit);
        break;
      case "recent-shows":
        items = await fetchRecentlyAddedShows(limit);
        break;
      default:
        items = await fetchAllLibrary(limit);
    }

    return NextResponse.json({
      items,
      section,
      totalCount: items.length,
      startIndex: 0,
      limit: items.length,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load library";
    const status =
      message === "Not authenticated"
        ? 401
        : message === "Media server offline"
          ? 503
          : 502;
    return NextResponse.json({ error: message }, { status });
  }
}
