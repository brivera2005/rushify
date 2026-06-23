export type ClientCapabilities = {
  hevc: boolean;
  h264: boolean;
  av1: boolean;
  ac3: boolean;
  eac3: boolean;
  dts: boolean;
  truehd: boolean;
  /** Android TV / set-top boxes — still try direct, cap transcode at 1080p */
  preferTranscode: boolean;
};

const DEFAULT_CAPABILITIES: ClientCapabilities = {
  hevc: false,
  h264: true,
  av1: false,
  ac3: false,
  eac3: false,
  dts: false,
  truehd: false,
  preferTranscode: false,
};

export function detectClientCapabilities(): ClientCapabilities {
  if (typeof document === "undefined") {
    return DEFAULT_CAPABILITIES;
  }

  const video = document.createElement("video");
  const hevc =
    video.canPlayType('video/mp4; codecs="hvc1.1.6.L93.B0"') !== "" ||
    video.canPlayType('video/mp4; codecs="hev1.1.6.L93.B0"') !== "";
  const h264 = video.canPlayType('video/mp4; codecs="avc1.42E01E"') !== "";
  const av1 = video.canPlayType('video/mp4; codecs="av01.0.08M.08"') !== "";
  const ac3 = video.canPlayType('audio/mp4; codecs="ac-3"') !== "";
  const eac3 = video.canPlayType('audio/mp4; codecs="ec-3"') !== "";
  const dts = video.canPlayType('audio/mp4; codecs="mp4a.40.2"') !== "" && /dts/i.test(navigator.userAgent);
  const truehd = eac3;

  const ua = navigator.userAgent;
  const preferTranscode =
    /android.*tv|aft[bm]|bravia|shield|tivo|hbbtv|crkey|googletv|smart-tv|smarttv/i.test(ua) ||
    (/android/i.test(ua) && !/mobile/i.test(ua));

  return { hevc, h264, av1, ac3, eac3, dts, truehd, preferTranscode };
}
