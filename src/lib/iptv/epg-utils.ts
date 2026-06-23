import type { IptvChannel, IptvProgramme } from "@/types/iptv";

export const SLOT_MINUTES = 30;
export const SLOT_WIDTH_PX = 168;
export const CHANNEL_COL_WIDTH_PX = 208;
export const ROW_HEIGHT_PX = 68;
export const GUIDE_HOURS_BACK = 0.5;
export const GUIDE_HOURS_FORWARD = 2.5;

/** All XMLTV channel id aliases for an IPTV channel (Xtream stream id, tvg-id, etc.). */
export function getChannelEpgKeys(channel: IptvChannel): string[] {
  const keys = new Set<string>();
  keys.add(channel.id);
  if (channel.tvgId?.trim()) keys.add(channel.tvgId.trim());

  const xtreamMatch = channel.id.match(/^xtream-(\d+)$/i);
  if (xtreamMatch?.[1]) keys.add(xtreamMatch[1]);

  const jellyfinMatch = channel.id.match(/^jf-(.+)$/i);
  if (jellyfinMatch?.[1]) keys.add(jellyfinMatch[1]);

  return [...keys];
}

export function programmeMatchesChannel(programme: IptvProgramme, channel: IptvChannel): boolean {
  return getChannelEpgKeys(channel).includes(programme.channelId);
}

export function buildTimeSlots(
  anchor: Date,
  hoursBack: number,
  hoursForward: number,
  slotMinutes: number,
): Date[] {
  const slots: Date[] = [];
  const start = new Date(anchor);
  start.setMinutes(
    Math.floor(start.getMinutes() / slotMinutes) * slotMinutes - hoursBack * 60,
    0,
    0,
  );

  const end = new Date(anchor.getTime() + hoursForward * 60 * 60 * 1000);
  const cursor = new Date(start);

  while (cursor <= end) {
    slots.push(new Date(cursor));
    cursor.setMinutes(cursor.getMinutes() + slotMinutes);
  }

  return slots;
}

export function formatSlotLabel(date: Date): string {
  return date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

export function formatSlotDay(date: Date, now: Date): string | null {
  const isToday = date.toDateString() === now.toDateString();
  if (isToday) return null;
  return date.toLocaleDateString([], { weekday: "short", month: "short", day: "numeric" });
}

export function findProgrammeAt(
  programmes: IptvProgramme[],
  channel: IptvChannel,
  slotStart: Date,
  slotEnd: Date,
): IptvProgramme | undefined {
  return findProgrammeAtInList(programmes, slotStart, slotEnd);
}

export function findProgrammeAtInList(
  programmes: IptvProgramme[],
  slotStart: Date,
  slotEnd: Date,
): IptvProgramme | undefined {
  return programmes.find((programme) => {
    const start = new Date(programme.start).getTime();
    const stop = new Date(programme.stop).getTime();
    return start < slotEnd.getTime() && stop > slotStart.getTime();
  });
}

export function findNowNext(
  programmes: IptvProgramme[],
  channel: IptvChannel,
  now: Date,
): { now?: IptvProgramme; next?: IptvProgramme } {
  const channelProgrammes = programmes
    .filter((programme) => programmeMatchesChannel(programme, channel))
    .sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime());

  const nowMs = now.getTime();
  const current = channelProgrammes.find((programme) => {
    const start = new Date(programme.start).getTime();
    const stop = new Date(programme.stop).getTime();
    return start <= nowMs && stop > nowMs;
  });

  const next = channelProgrammes.find((programme) => new Date(programme.start).getTime() > nowMs);

  return { now: current, next };
}

export function buildProgrammeIndex(
  programmes: IptvProgramme[],
): Map<string, IptvProgramme[]> {
  const index = new Map<string, IptvProgramme[]>();
  for (const programme of programmes) {
    const existing = index.get(programme.channelId) ?? [];
    existing.push(programme);
    index.set(programme.channelId, existing);
  }
  for (const list of index.values()) {
    list.sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime());
  }
  return index;
}

/** Per-channel programme lists keyed by channel.id (merges tvg-id / stream-id aliases). */
export function buildChannelProgrammeMap(
  channels: IptvChannel[],
  programmes: IptvProgramme[],
): Map<string, IptvProgramme[]> {
  const byEpgId = buildProgrammeIndex(programmes);
  const result = new Map<string, IptvProgramme[]>();

  for (const channel of channels) {
    const seen = new Set<string>();
    const merged: IptvProgramme[] = [];

    for (const key of getChannelEpgKeys(channel)) {
      const list = byEpgId.get(key);
      if (!list) continue;
      for (const programme of list) {
        const dedupeKey = `${programme.start}:${programme.title}`;
        if (seen.has(dedupeKey)) continue;
        seen.add(dedupeKey);
        merged.push(programme);
      }
    }

    if (merged.length > 0) {
      merged.sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime());
      result.set(channel.id, merged);
    }
  }

  return result;
}

export function getNowLineOffsetPx(slots: Date[], now: Date, slotWidth: number): number | null {
  if (slots.length === 0) return null;
  const first = slots[0]!.getTime();
  const last =
    slots[slots.length - 1]!.getTime() + SLOT_MINUTES * 60 * 1000;
  const nowMs = now.getTime();
  if (nowMs < first || nowMs > last) return null;
  const minutesFromStart = (nowMs - first) / (60 * 1000);
  return (minutesFromStart / SLOT_MINUTES) * slotWidth;
}

export function groupChannels(channels: IptvChannel[]): Map<string, IptvChannel[]> {
  const groups = new Map<string, IptvChannel[]>();
  for (const channel of channels) {
    const group = channel.group?.trim() || "All channels";
    const existing = groups.get(group) ?? [];
    existing.push(channel);
    groups.set(group, existing);
  }
  return new Map(Array.from(groups.entries()).sort(([a], [b]) => a.localeCompare(b)));
}

export function filterChannels(
  channels: IptvChannel[],
  options: {
    query?: string;
    group?: string | null;
    groups?: Set<string> | null;
    excludeGroups?: Set<string> | null;
    favoriteIds?: Set<string>;
    favoritesOnly?: boolean;
  },
): IptvChannel[] {
  const query = options.query?.trim().toLowerCase();
  let result = channels;

  if (options.favoritesOnly && options.favoriteIds) {
    result = result.filter((channel) => options.favoriteIds!.has(channel.id));
  }

  if (options.excludeGroups && options.excludeGroups.size > 0) {
    result = result.filter(
      (channel) => !options.excludeGroups!.has(channel.group?.trim() || "All channels"),
    );
  }

  if (options.groups && options.groups.size > 0) {
    result = result.filter((channel) =>
      options.groups!.has(channel.group?.trim() || "All channels"),
    );
  } else if (options.group) {
    result = result.filter((channel) => (channel.group?.trim() || "All channels") === options.group);
  }

  if (query) {
    result = result.filter((channel) => {
      const haystack = `${channel.name} ${channel.channelNumber ?? ""} ${channel.group ?? ""}`.toLowerCase();
      return haystack.includes(query);
    });
  }

  return result;
}

export function formatProgrammeTime(programme: IptvProgramme): string {
  const start = new Date(programme.start);
  const stop = new Date(programme.stop);
  const fmt = (date: Date) =>
    date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  return `${fmt(start)} – ${fmt(stop)}`;
}
