import "server-only";

import { resolveMediaCredentials } from "@/lib/auth/resolve-token";
import { JellyfinClient } from "@/lib/jellyfin/client";
import { resolveJellyfinServerUrl } from "@/lib/jellyfin/discovery";
import type {
  JellyfinMediaItem,
  LibraryBrowseFilters,
  LibraryBrowseSort,
  LibraryItemsPage,
} from "@/types/jellyfin";

type JellyfinItem = {
  Id: string;
  Name: string;
  Type: string;
  Overview?: string;
  ImageTags?: { Primary?: string; Backdrop?: string };
  UserData?: { PlayedPercentage?: number };
  ProductionYear?: number;
  SeriesName?: string;
  ParentIndexNumber?: number;
  IndexNumber?: number;
  Genres?: string[];
  DateCreated?: string;
  PremiereDate?: string;
};

type JellyfinItemsResponse = {
  Items: JellyfinItem[];
  TotalRecordCount?: number;
};

function mapItemKind(type: string): JellyfinMediaItem["kind"] {
  switch (type) {
    case "Movie":
      return "Movie";
    case "Series":
      return "Series";
    case "Episode":
      return "Episode";
    case "Audio":
    case "MusicAlbum":
    case "MusicArtist":
      return "Music";
    default:
      return "Unknown";
  }
}

export function mapJellyfinItem(item: JellyfinItem): JellyfinMediaItem {
  return {
    id: item.Id,
    name: item.Name,
    kind: mapItemKind(item.Type),
    overview: item.Overview,
    imageTag: item.ImageTags?.Primary,
    backdropImageTag: item.ImageTags?.Backdrop,
    progressPercent: item.UserData?.PlayedPercentage,
    year: item.ProductionYear,
    seriesName: item.SeriesName,
    seasonNumber: item.ParentIndexNumber,
    episodeNumber: item.IndexNumber,
    genres: item.Genres,
    dateCreated: item.DateCreated,
    premiereDate: item.PremiereDate,
  };
}

function itemTypeForSection(section: "movies" | "shows"): string {
  return section === "movies" ? "Movie" : "Series";
}

function sortParamsForBrowse(sort: LibraryBrowseSort | undefined): {
  SortBy: string;
  SortOrder: string;
} {
  switch (sort) {
    case "recent":
      return { SortBy: "DateCreated", SortOrder: "Descending" };
    case "release":
      return { SortBy: "PremiereDate,SortName", SortOrder: "Descending" };
    case "az":
    default:
      return { SortBy: "SortName", SortOrder: "Ascending" };
  }
}

export async function fetchLibraryGenres(
  section: "movies" | "shows",
): Promise<string[]> {
  const { client, userId } = await createClientForRequest();

  const data = await client.proxy<{ Items?: Array<{ Name?: string }> }>({
    method: "GET",
    path: "/Genres",
    searchParams: {
      IncludeItemTypes: itemTypeForSection(section),
      Recursive: "true",
      SortBy: "SortName",
      SortOrder: "Ascending",
      Fields: "ItemCounts",
      UserId: userId,
    },
  });

  return (data.Items ?? [])
    .map((genre) => genre.Name?.trim())
    .filter((name): name is string => Boolean(name));
}

export async function browseLibraryItems(
  filters: LibraryBrowseFilters,
): Promise<LibraryItemsPage> {
  const { client, userId } = await createClientForRequest();
  const startIndex = filters.startIndex ?? 0;
  const limit = filters.limit ?? 48;
  const sort = sortParamsForBrowse(filters.sort);

  const searchParams: Record<string, string> = {
    IncludeItemTypes: itemTypeForSection(filters.section),
    Recursive: "true",
    StartIndex: String(startIndex),
    Limit: String(limit),
    SortBy: sort.SortBy,
    SortOrder: sort.SortOrder,
    Fields: "Overview,ProductionYear,Genres,DateCreated,PremiereDate",
    ExcludeLocationTypes: "Virtual",
  };

  if (filters.genre?.trim()) {
    searchParams.Genres = filters.genre.trim();
  }

  if (filters.yearMin != null) {
    searchParams.MinYear = String(filters.yearMin);
  }

  if (filters.yearMax != null) {
    searchParams.MaxYear = String(filters.yearMax);
  }

  if (filters.search?.trim()) {
    searchParams.SearchTerm = filters.search.trim();
  }

  const data = await client.proxy<JellyfinItemsResponse>({
    method: "GET",
    path: userItemsPath(userId),
    searchParams,
  });

  return {
    items: (data.Items ?? []).map(mapJellyfinItem),
    totalCount: data.TotalRecordCount ?? (data.Items ?? []).length,
    startIndex,
    limit,
  };
}

export async function searchLibraryItems(options: {
  query: string;
  section?: "movies" | "shows" | "all";
  limit?: number;
}): Promise<JellyfinMediaItem[]> {
  const { client, userId } = await createClientForRequest();
  const trimmed = options.query.trim();
  if (!trimmed) return [];

  const includeTypes =
    options.section === "movies"
      ? "Movie"
      : options.section === "shows"
        ? "Series"
        : "Movie,Series";

  const searchParams: Record<string, string> = {
    SearchTerm: trimmed,
    IncludeItemTypes: includeTypes,
    Recursive: "true",
    Limit: String(options.limit ?? 24),
    Fields: "Overview,ProductionYear,Genres",
    ExcludeLocationTypes: "Virtual",
  };

  const data = await client.proxy<JellyfinItemsResponse>({
    method: "GET",
    path: userItemsPath(userId),
    searchParams,
  });

  return (data.Items ?? []).map(mapJellyfinItem);
}

type JellyfinUserSummary = {
  Id: string;
  Policy?: { IsAdministrator?: boolean };
};

let cachedDefaultUserId: string | null = null;

async function resolveDefaultUserId(client: JellyfinClient): Promise<string> {
  if (cachedDefaultUserId) return cachedDefaultUserId;

  const users = await client.proxy<JellyfinUserSummary[]>({
    method: "GET",
    path: "/Users",
  });

  const admin = users.find((user) => user.Policy?.IsAdministrator) ?? users[0];
  if (!admin?.Id) {
    throw new Error("No media library users found");
  }

  cachedDefaultUserId = admin.Id;
  return admin.Id;
}

function isJellyfinUserId(userId: string | undefined): userId is string {
  return Boolean(userId && !userId.startsWith("rushify-"));
}

async function createClientForRequest(): Promise<{
  client: JellyfinClient;
  userId: string;
}> {
  const credentials = await resolveMediaCredentials();
  const serverUrl = await resolveJellyfinServerUrl();

  if (!serverUrl) {
    throw new Error("Media server offline");
  }

  if (!credentials) {
    throw new Error("Not authenticated");
  }

  const client = new JellyfinClient(serverUrl, credentials.token);
  const userId = isJellyfinUserId(credentials.userId)
    ? credentials.userId
    : await resolveDefaultUserId(client);

  return { client, userId };
}

function userItemsPath(userId: string): string {
  return `/Users/${userId}/Items`;
}

export async function fetchResumeItems(limit = 12): Promise<JellyfinMediaItem[]> {
  const { client, userId } = await createClientForRequest();

  const data = await client.proxy<JellyfinItemsResponse>({
    method: "GET",
    path: `/Users/${userId}/Items/Resume`,
    searchParams: { Limit: String(limit), MediaTypes: "Video" },
  });

  return (data.Items ?? []).map(mapJellyfinItem);
}

export async function fetchRecentlyAdded(limit = 16): Promise<JellyfinMediaItem[]> {
  const { client, userId } = await createClientForRequest();

  const data = await client.proxy<JellyfinItemsResponse>({
    method: "GET",
    path: userItemsPath(userId),
    searchParams: {
      Recursive: "true",
      SortBy: "DateCreated",
      SortOrder: "Descending",
      IncludeItemTypes: "Movie,Series",
      Limit: String(limit),
      Fields: "Overview,ProductionYear",
      ExcludeLocationTypes: "Virtual",
    },
  });

  return (data.Items ?? []).map(mapJellyfinItem);
}

export async function fetchRecentlyAddedMovies(limit = 12): Promise<JellyfinMediaItem[]> {
  const { client, userId } = await createClientForRequest();

  const data = await client.proxy<JellyfinItemsResponse>({
    method: "GET",
    path: userItemsPath(userId),
    searchParams: {
      Recursive: "true",
      SortBy: "DateCreated",
      SortOrder: "Descending",
      IncludeItemTypes: "Movie",
      Limit: String(limit),
      Fields: "Overview,ProductionYear",
      ExcludeLocationTypes: "Virtual",
    },
  });

  return (data.Items ?? []).map(mapJellyfinItem);
}

export async function fetchRecentlyAddedShows(limit = 12): Promise<JellyfinMediaItem[]> {
  const { client, userId } = await createClientForRequest();

  const data = await client.proxy<JellyfinItemsResponse>({
    method: "GET",
    path: userItemsPath(userId),
    searchParams: {
      Recursive: "true",
      SortBy: "DateCreated",
      SortOrder: "Descending",
      IncludeItemTypes: "Series",
      Limit: String(limit),
      Fields: "Overview,ProductionYear",
      ExcludeLocationTypes: "Virtual",
    },
  });

  return (data.Items ?? []).map(mapJellyfinItem);
}

export async function fetchMovies(limit = 48, startIndex = 0): Promise<LibraryItemsPage> {
  return browseLibraryItems({ section: "movies", limit, startIndex, sort: "az" });
}

export async function fetchShows(limit = 48, startIndex = 0): Promise<LibraryItemsPage> {
  return browseLibraryItems({ section: "shows", limit, startIndex, sort: "az" });
}

export async function fetchAllLibrary(limit = 96): Promise<JellyfinMediaItem[]> {
  const { client, userId } = await createClientForRequest();

  const data = await client.proxy<JellyfinItemsResponse>({
    method: "GET",
    path: userItemsPath(userId),
    searchParams: {
      IncludeItemTypes: "Movie,Series",
      Recursive: "true",
      SortBy: "SortName",
      SortOrder: "Ascending",
      Limit: String(limit),
      Fields: "Overview,ProductionYear",
      ExcludeLocationTypes: "Virtual",
    },
  });

  return (data.Items ?? []).map(mapJellyfinItem);
}

export async function fetchItemById(id: string): Promise<JellyfinMediaItem | null> {
  const { client, userId } = await createClientForRequest();

  try {
    const data = await client.proxy<JellyfinItemsResponse>({
      method: "GET",
      path: userItemsPath(userId),
      searchParams: {
        Ids: id,
        Limit: "1",
        Fields: "Overview,ProductionYear",
      },
    });
    const item = data.Items?.[0];
    return item ? mapJellyfinItem(item) : null;
  } catch {
    return null;
  }
}

export async function fetchSeriesEpisodes(seriesId: string): Promise<JellyfinMediaItem[]> {
  const { client, userId } = await createClientForRequest();

  const data = await client.proxy<JellyfinItemsResponse>({
    method: "GET",
    path: userItemsPath(userId),
    searchParams: {
      ParentId: seriesId,
      IncludeItemTypes: "Episode",
      Recursive: "true",
      SortBy: "ParentIndexNumber,IndexNumber",
      SortOrder: "Ascending",
      Fields: "Overview,ProductionYear",
    },
  });

  return (data.Items ?? []).map(mapJellyfinItem);
}
