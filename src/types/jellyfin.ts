export type JellyfinItemKind = "Movie" | "Series" | "Episode" | "Music" | "Unknown";

export type JellyfinMediaItem = {
  id: string;
  name: string;
  kind: JellyfinItemKind;
  overview?: string;
  imageTag?: string;
  backdropImageTag?: string;
  progressPercent?: number;
  year?: number;
  seriesName?: string;
  seasonNumber?: number;
  episodeNumber?: number;
  genres?: string[];
  dateCreated?: string;
  premiereDate?: string;
};

export type LibraryBrowseSort = "recent" | "az" | "release";

export type LibraryBrowseFilters = {
  section: "movies" | "shows";
  startIndex?: number;
  limit?: number;
  sort?: LibraryBrowseSort;
  genre?: string;
  yearMin?: number;
  yearMax?: number;
  search?: string;
};

export type LibraryItemsPage = {
  items: JellyfinMediaItem[];
  totalCount: number;
  startIndex: number;
  limit: number;
};

export type JellyfinLibrary = {
  id: string;
  name: string;
  collectionType?: string;
};

export type JellyfinContinueWatchingItem = JellyfinMediaItem & {
  lastPlayedDate?: string;
};

export type JellyfinProxyRequest = {
  method: "GET" | "POST" | "PUT" | "DELETE";
  path: string;
  searchParams?: Record<string, string>;
  body?: unknown;
  headers?: Record<string, string>;
};

export type LibrarySection =
  | "resume"
  | "recent"
  | "recent-movies"
  | "recent-shows"
  | "movies"
  | "shows"
  | "all";

export type LibraryItemsResponse = {
  items: JellyfinMediaItem[];
  section: LibrarySection;
};

export type AuthUser = {
  id: string;
  username: string;
  role?: "admin" | "user";
};
