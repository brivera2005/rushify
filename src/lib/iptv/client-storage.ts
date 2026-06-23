"use client";

const FAVORITES_KEY = "rushify:iptv:favorites";
const LAST_CHANNEL_KEY = "rushify:iptv:last-channel";
const RECENT_CHANNELS_KEY = "rushify:iptv:recent";
const LIVE_TAB_KEY = "rushify:live:last-tab";
const ENGLISH_ONLY_KEY = "rushify-english-only";
const MAX_RECENT = 12;

export function getEnglishOnlyPreference(): boolean {
  if (typeof window === "undefined") return true;
  try {
    const raw = localStorage.getItem(ENGLISH_ONLY_KEY);
    if (raw === null) return true;
    return raw === "true";
  } catch {
    return true;
  }
}

export function setEnglishOnlyPreference(enabled: boolean): void {
  localStorage.setItem(ENGLISH_ONLY_KEY, String(enabled));
}

export function getFavoriteIds(): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = localStorage.getItem(FAVORITES_KEY);
    if (!raw) return new Set();
    const parsed = JSON.parse(raw) as unknown;
    return new Set(Array.isArray(parsed) ? (parsed as string[]) : []);
  } catch {
    return new Set();
  }
}

export function setFavoriteIds(ids: Set<string>): void {
  localStorage.setItem(FAVORITES_KEY, JSON.stringify([...ids]));
}

export function toggleFavorite(channelId: string): boolean {
  const favorites = getFavoriteIds();
  const added = !favorites.has(channelId);
  if (added) favorites.add(channelId);
  else favorites.delete(channelId);
  setFavoriteIds(favorites);
  return added;
}

export function isFavorite(channelId: string): boolean {
  return getFavoriteIds().has(channelId);
}

export function getLastWatchedChannelId(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(LAST_CHANNEL_KEY);
}

export function setLastWatchedChannelId(channelId: string): void {
  localStorage.setItem(LAST_CHANNEL_KEY, channelId);
  addRecentChannelId(channelId);
}

export function getRecentChannelIds(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(RECENT_CHANNELS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? (parsed as string[]).slice(0, MAX_RECENT) : [];
  } catch {
    return [];
  }
}

export function addRecentChannelId(channelId: string): void {
  const recent = getRecentChannelIds().filter((id) => id !== channelId);
  recent.unshift(channelId);
  localStorage.setItem(RECENT_CHANNELS_KEY, JSON.stringify(recent.slice(0, MAX_RECENT)));
}

export type LiveTab = "/live/guide" | "/live/channels";

export function getLastLiveTab(): LiveTab {
  if (typeof window === "undefined") return "/live/guide";
  const stored = localStorage.getItem(LIVE_TAB_KEY);
  if (stored === "/live/channels" || stored === "/live/guide") return stored;
  return "/live/guide";
}

export function setLastLiveTab(tab: LiveTab): void {
  localStorage.setItem(LIVE_TAB_KEY, tab);
}
