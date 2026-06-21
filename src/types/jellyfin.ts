export type JellyfinItemKind = "Movie" | "Series" | "Episode" | "Music" | "Unknown";

export type JellyfinMediaItem = {
  id: string;
  name: string;
  kind: JellyfinItemKind;
  overview?: string;
  imageUrl?: string;
  progressPercent?: number;
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
};
