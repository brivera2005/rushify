export type IptvChannel = {
  id: string;
  name: string;
  group?: string;
  categoryId?: string;
  logoUrl?: string;
  streamUrl: string;
  /** Alternate MPEG-TS URL when HLS stalls */
  fallbackStreamUrl?: string;
  tvgId?: string;
  channelNumber?: number;
};

export type IptvProgramme = {
  channelId: string;
  title: string;
  description?: string;
  start: string;
  stop: string;
  category?: string;
};

export type IptvEpgSnapshot = {
  generatedAt: string;
  programmes: IptvProgramme[];
};

export type IptvChannelSnapshot = {
  generatedAt: string;
  channels: IptvChannel[];
};

export type IptvCacheMeta = {
  key: string;
  fetchedAt: string;
  expiresAt: string;
  staleAt: string;
  isRefreshing: boolean;
};
