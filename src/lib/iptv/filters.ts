import type { IptvChannel, IptvChannelSnapshot, IptvEpgSnapshot } from "@/types/iptv";

import { getChannelEpgKeys } from "@/lib/iptv/epg-utils";

/** Xtream-style region prefix before | (e.g. US| ESPN, UK| BBC). */
const ENGLISH_REGION_PREFIXES = new Set(["us", "uk", "ca", "au", "ie", "nz", "en"]);

const US_REGION_PREFIXES = new Set(["us", "usa"]);

const BLOCKED_REGION_PREFIXES = new Set([
  "es",
  "mx",
  "fr",
  "de",
  "it",
  "pt",
  "br",
  "ar",
  "in",
  "pk",
  "bd",
  "tr",
  "kr",
  "cn",
  "jp",
  "ru",
  "pl",
  "nl",
  "be",
  "gr",
  "ro",
  "hu",
  "cz",
  "sk",
  "bg",
  "hr",
  "rs",
  "ua",
  "il",
  "sa",
  "ae",
  "eg",
  "ma",
  "ph",
  "id",
  "vn",
  "th",
  "tw",
  "hk",
  "sg",
  "my",
  "lat",
  "exyu",
  "al",
  "ba",
  "mk",
  "me",
  "si",
  "lv",
  "lt",
  "ee",
  "fi",
  "se",
  "no",
  "dk",
  "is",
  "at",
  "ch",
  "lb",
  "sy",
  "iq",
  "ir",
  "af",
  "np",
  "lk",
]);

/** Non-US English regions blocked when IPTV_US_ONLY is enabled. */
const US_BLOCKED_REGION_PREFIXES = new Set([
  ...BLOCKED_REGION_PREFIXES,
  "uk",
  "ie",
  "ar",
  "ca",
  "can",
  "au",
  "nz",
  "en",
]);

/** Category names that strongly indicate English-language content. */
const CATEGORY_ALLOWLIST = [
  "english",
  "en -",
  "en|",
  "| en",
  "| english",
  "uk |",
  "uk|",
  "us |",
  "us|",
  "ca |",
  "ca|",
  "canada |",
  "canada|",
  "australia |",
  "australia|",
  "ireland |",
  "ireland|",
  "new zealand |",
  "new zealand|",
  "international | english",
];

/** Category or channel names that indicate non-English content. */
const CATEGORY_BLOCKLIST = [
  "spanish",
  "latino",
  "latam",
  "espanol",
  "español",
  "francais",
  "français",
  "french",
  "france",
  "german",
  "deutsch",
  "arabic",
  "hindi",
  "tamil",
  "telugu",
  "malayalam",
  "bengali",
  "punjabi",
  "marathi",
  "gujarati",
  "brazil",
  "brasil",
  "portuguese",
  "portugues",
  "italian",
  "italiano",
  "polish",
  "polski",
  "turkish",
  "korean",
  "chinese",
  "mandarin",
  "cantonese",
  "vietnamese",
  "thai",
  "indonesia",
  "indonesian",
  "philippines",
  "filipino",
  "tagalog",
  "russian",
  "ukraine",
  "ukrainian",
  "romania",
  "romanian",
  "hungary",
  "hungarian",
  "czech",
  "slovak",
  "bulgarian",
  "serbian",
  "croatian",
  "greek",
  "hebrew",
  "persian",
  "farsi",
  "urdu",
  "india |",
  "| india",
  "pakistan",
  "bangladesh",
  "sri lanka",
  "nepal",
  "caribbean | spanish",
  "exyu",
  "balkan",
  " | es ",
  "es |",
  "| es",
  "arab",
  "bein",
  "turkiye",
  "türkiye",
  "mundo",
  "latina",
  "castellano",
  "portugal |",
  "| portugal",
  "israel |",
  "africa | french",
  "africa | arabic",
  "24/7 spanish",
  "24/7 arabic",
  "nordic |",
  "scandinavia",
  "sweden",
  "norway",
  "denmark",
  "finland",
  "netherlands",
  "dutch",
  "belgium | french",
  "mexico |",
  "argentina |",
  "colombia |",
  "chile |",
  "peru |",
  "venezuela |",
];

/** Channel name signals for English content (checked after blocklist). */
const CHANNEL_NAME_ALLOWLIST = [
  "english",
  " en ",
  " uk ",
  " us ",
  " usa ",
  " bbc ",
  " itv ",
  " sky ",
  " cnn ",
  " msnbc ",
  " fox news",
  " abc ",
  " nbc ",
  " cbs ",
  " hbo ",
  " discovery",
  " national geographic",
];

const US_CATEGORY_ALLOWLIST = [
  "us |",
  "us|",
  "usa |",
  "usa|",
  "united states |",
  "united states|",
  "| united states",
];

/** US channel name signals (checked after blocklist). */
const US_CHANNEL_NAME_ALLOWLIST = [
  " us ",
  " usa ",
  " fox news",
  " cnn ",
  " msnbc ",
  " abc ",
  " nbc ",
  " cbs ",
  " hbo ",
  " espn ",
  " discovery",
  " national geographic",
  " usa network",
];

/** Region hints used when category/name is otherwise ambiguous. */
const US_REGION_SIGNALS = ["united states", " usa ", " us "];

/** Region hints used when category/name is otherwise ambiguous. */
const ENGLISH_REGION_SIGNALS = [
  "english",
  " uk ",
  " us ",
  " usa ",
  "canada",
  "australia",
  "ireland",
  "new zealand",
  "united kingdom",
  "united states",
];

function normalize(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

function padded(text: string): string {
  return ` ${normalize(text)} `;
}

function matchesAny(haystack: string, patterns: string[]): boolean {
  return patterns.some((pattern) => haystack.includes(pattern));
}

function hasEnglishRegionSignal(text: string): boolean {
  const paddedText = padded(text);
  return ENGLISH_REGION_SIGNALS.some((signal) => paddedText.includes(signal));
}

function hasUsRegionSignal(text: string): boolean {
  const paddedText = padded(text);
  return US_REGION_SIGNALS.some((signal) => paddedText.includes(signal));
}

function getCategoryRegionPrefix(categoryName: string): string | null {
  const normalized = normalize(categoryName);
  const match = normalized.match(/^([a-z0-9]{2,8})\s*\|/);
  return match?.[1] ?? null;
}

export function isEnglishCategory(categoryName: string | undefined | null): boolean {
  if (!categoryName?.trim()) return false;

  const normalized = normalize(categoryName);
  const paddedCategory = padded(categoryName);

  if (matchesAny(paddedCategory, CATEGORY_BLOCKLIST.map((p) => ` ${p} `))) return false;
  if (matchesAny(paddedCategory, CATEGORY_ALLOWLIST.map((p) => ` ${p} `))) return true;
  if (matchesAny(normalized, CATEGORY_ALLOWLIST)) return true;

  const prefix = getCategoryRegionPrefix(categoryName);
  if (prefix) {
    if (BLOCKED_REGION_PREFIXES.has(prefix)) return false;
    if (ENGLISH_REGION_PREFIXES.has(prefix)) return true;
  }

  return hasEnglishRegionSignal(categoryName);
}

export function isEnglishChannel(
  channel: Pick<IptvChannel, "name" | "group">,
  categoryName?: string,
): boolean {
  const category = categoryName ?? channel.group;
  const namePadded = padded(channel.name);

  if (matchesAny(namePadded, CATEGORY_BLOCKLIST.map((p) => ` ${p} `))) return false;
  if (matchesAny(namePadded, CHANNEL_NAME_ALLOWLIST.map((p) => ` ${p} `))) return true;
  if (/\benglish\b/.test(normalize(channel.name))) return true;

  if (category) {
    if (isEnglishCategory(category)) return true;
    const categoryPadded = padded(category);
    if (matchesAny(categoryPadded, CATEGORY_BLOCKLIST.map((p) => ` ${p} `))) return false;
    if (hasEnglishRegionSignal(category)) return true;
  }

  return false;
}

export function isUsCategory(categoryName: string | undefined | null): boolean {
  if (!categoryName?.trim()) return false;

  const normalized = normalize(categoryName);
  const paddedCategory = padded(categoryName);

  if (matchesAny(paddedCategory, CATEGORY_BLOCKLIST.map((p) => ` ${p} `))) return false;
  if (matchesAny(paddedCategory, US_CATEGORY_ALLOWLIST.map((p) => ` ${p} `))) return true;
  if (matchesAny(normalized, US_CATEGORY_ALLOWLIST)) return true;

  const prefix = getCategoryRegionPrefix(categoryName);
  if (prefix) {
    if (US_BLOCKED_REGION_PREFIXES.has(prefix)) return false;
    if (US_REGION_PREFIXES.has(prefix)) return true;
  }

  return hasUsRegionSignal(categoryName);
}

export function isUsChannel(
  channel: Pick<IptvChannel, "name" | "group">,
  categoryName?: string,
): boolean {
  const category = categoryName ?? channel.group;
  const namePadded = padded(channel.name);

  if (matchesAny(namePadded, CATEGORY_BLOCKLIST.map((p) => ` ${p} `))) return false;
  if (matchesAny(namePadded, US_CHANNEL_NAME_ALLOWLIST.map((p) => ` ${p} `))) return true;

  if (category) {
    if (isUsCategory(category)) return true;
    const categoryPadded = padded(category);
    if (matchesAny(categoryPadded, CATEGORY_BLOCKLIST.map((p) => ` ${p} `))) return false;
    if (hasUsRegionSignal(category)) return true;
  }

  const namePrefix = getCategoryRegionPrefix(channel.name);
  if (namePrefix) {
    if (US_BLOCKED_REGION_PREFIXES.has(namePrefix)) return false;
    if (US_REGION_PREFIXES.has(namePrefix)) return true;
  }

  return false;
}

export type RegionFilterMode = "none" | "english" | "us";

export function filterChannelsByMode(channels: IptvChannel[], mode: RegionFilterMode): IptvChannel[] {
  if (mode === "us") return channels.filter((channel) => isUsChannel(channel));
  if (mode === "english") return channels.filter((channel) => isEnglishChannel(channel));
  return channels;
}

export function filterEnglishChannels(channels: IptvChannel[]): IptvChannel[] {
  return filterChannelsByMode(channels, "english");
}

export function filterUsChannels(channels: IptvChannel[]): IptvChannel[] {
  return filterChannelsByMode(channels, "us");
}

export function filterChannelSnapshot(
  snapshot: IptvChannelSnapshot,
  mode: RegionFilterMode = "english",
): IptvChannelSnapshot {
  return {
    ...snapshot,
    channels: filterChannelsByMode(snapshot.channels, mode),
  };
}

export function filterEpgForChannels(
  epg: IptvEpgSnapshot,
  channels: IptvChannel[],
): IptvEpgSnapshot {
  const allowedIds = new Set<string>();
  for (const channel of channels) {
    for (const key of getChannelEpgKeys(channel)) {
      allowedIds.add(key);
    }
  }

  return {
    ...epg,
    programmes: epg.programmes.filter((programme) => allowedIds.has(programme.channelId)),
  };
}

/** Keep programmes overlapping a time window to shrink guide API payloads. */
export function trimEpgByTimeWindow(
  epg: IptvEpgSnapshot,
  hoursBack: number,
  hoursForward: number,
  anchor = new Date(),
): IptvEpgSnapshot {
  const windowStart = anchor.getTime() - hoursBack * 60 * 60 * 1000;
  const windowEnd = anchor.getTime() + hoursForward * 60 * 60 * 1000;

  return {
    ...epg,
    programmes: epg.programmes.filter((programme) => {
      const start = new Date(programme.start).getTime();
      const stop = new Date(programme.stop).getTime();
      if (Number.isNaN(start) || Number.isNaN(stop)) return false;
      return stop >= windowStart && start <= windowEnd;
    }),
  };
}

export function resolveEnglishOnlyFilter(
  searchParam: string | null,
  envDefault: boolean,
): boolean {
  if (envDefault) return true;
  if (searchParam === "true") return true;
  if (searchParam === "false") return false;
  return envDefault;
}

export function resolveUsOnlyFilter(searchParam: string | null, envDefault: boolean): boolean {
  if (envDefault) return true;
  if (searchParam === "true") return true;
  if (searchParam === "false") return false;
  return envDefault;
}

export function resolveRegionFilter(
  searchParams: { usOnly?: string | null; englishOnly?: string | null },
  env: { IPTV_US_ONLY: boolean; IPTV_ENGLISH_ONLY: boolean },
): RegionFilterMode {
  if (resolveUsOnlyFilter(searchParams.usOnly ?? null, env.IPTV_US_ONLY)) return "us";
  if (resolveEnglishOnlyFilter(searchParams.englishOnly ?? null, env.IPTV_ENGLISH_ONLY)) {
    return "english";
  }
  return "none";
}
