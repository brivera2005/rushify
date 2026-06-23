"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { useActivePlayer } from "@/hooks/useActivePlayer";
import { cn } from "@/lib/utils/cn";

export type PlayerState = "idle" | "connecting" | "playing" | "buffering" | "error";

export type PlaybackInfo = {
  usingFallback: boolean;
  resolution?: { width: number; height: number };
  bufferSeconds: number;
};

type RushifyPlayerProps = {
  src: string;
  fallbackSrc?: string;
  poster?: string;
  title?: string;
  autoPlay?: boolean;
  live?: boolean;
  /** Higher buffer targets for LAN IPTV / VOD */
  lanOptimized?: boolean;
  playbackStatus?: string;
  className?: string;
  videoClassName?: string;
  onStateChange?: (state: PlayerState) => void;
  onPlaybackInfo?: (info: PlaybackInfo) => void;
  videoRef?: React.RefObject<HTMLVideoElement>;
  /** Custom error title (live TV: "Channel unavailable") */
  errorTitle?: string;
  /** Extra actions shown on error overlay */
  errorActions?: React.ReactNode;
  /** Label while initial connect (live TV) */
  connectingLabel?: string;
  /** Abort slow live streams after this many ms (default 8000 live). */
  connectTimeoutMs?: number;
  /** Unique id for global single-audio coordination */
  playerId?: string;
};

function isDirectTsStream(url: string): boolean {
  const lower = url.toLowerCase();
  return (
    lower.endsWith(".ts") ||
    lower.includes(".ts?") ||
    (lower.includes("/live/") && !lower.includes(".m3u8"))
  );
}

function isJellyfinDirectStream(url: string): boolean {
  return /\/api\/jellyfin\/Videos\/[^/]+\/stream/i.test(url);
}

function isHlsStream(url: string): boolean {
  const lower = url.toLowerCase();
  return (
    lower.includes(".m3u8") ||
    lower.includes("/main.m3u8") ||
    lower.includes("/master.m3u8")
  );
}

function resetVideoElement(video: HTMLVideoElement): void {
  video.pause();
  video.removeAttribute("src");
  video.load();
}

function buildHlsConfig(live: boolean, lanOptimized: boolean, connectTimeoutMs: number) {
  const manifestTimeout = live ? Math.min(5000, connectTimeoutMs) : 30_000;
  const fragTimeout = live ? connectTimeoutMs : 60_000;
  const xhrSetup = (xhr: XMLHttpRequest) => {
    xhr.withCredentials = true;
  };

  if (live) {
    return {
      enableWorker: true,
      lowLatencyMode: false,
      startLevel: 0,
      liveSyncDurationCount: 3,
      liveMaxLatencyDurationCount: 10,
      maxBufferLength: lanOptimized ? 45 : 30,
      maxMaxBufferLength: lanOptimized ? 90 : 60,
      backBufferLength: 30,
      maxBufferSize: 60 * 1000 * 1000,
      maxBufferHole: 0.5,
      nudgeOffset: 0.1,
      startFragPrefetch: true,
      manifestLoadingMaxRetry: 2,
      levelLoadingMaxRetry: 2,
      fragLoadingMaxRetry: 3,
      fragLoadingTimeOut: fragTimeout,
      manifestLoadingTimeOut: manifestTimeout,
      levelLoadingTimeOut: manifestTimeout,
      xhrSetup,
    };
  }

  return {
    enableWorker: true,
    lowLatencyMode: false,
    startFragPrefetch: true,
    maxBufferLength: lanOptimized ? 90 : 60,
    maxMaxBufferLength: lanOptimized ? 180 : 120,
    manifestLoadingMaxRetry: 4,
    levelLoadingMaxRetry: 4,
    fragLoadingMaxRetry: 6,
    xhrSetup,
  };
}

export function RushifyPlayer({
  src,
  fallbackSrc,
  poster,
  title,
  autoPlay = true,
  live = false,
  lanOptimized = false,
  playbackStatus,
  className,
  videoClassName,
  onStateChange,
  onPlaybackInfo,
  videoRef: externalRef,
  errorTitle,
  errorActions,
  connectingLabel,
  connectTimeoutMs,
  playerId,
}: RushifyPlayerProps) {
  const resolvedConnectTimeout = connectTimeoutMs ?? (live ? 6000 : 30_000);
  const internalRef = useRef<HTMLVideoElement>(null);
  const videoRef = externalRef ?? internalRef;
  const hlsRef = useRef<{ destroy: () => void } | null>(null);
  const hasStartedPlaybackRef = useRef(false);
  const [state, setState] = useState<PlayerState>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [activeSrc, setActiveSrc] = useState(src);
  const usingFallbackRef = useRef(false);
  const [bufferHealth, setBufferHealth] = useState(0);
  const [retryKey, setRetryKey] = useState(0);
  const triedFallbackRef = useRef(false);
  const timeoutRetriedRef = useRef(false);
  const [connectElapsedMs, setConnectElapsedMs] = useState(0);
  const hasStartedPlayingRef = useRef(false);

  const stopPlayback = useCallback(() => {
    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }
    const video = videoRef.current;
    if (video) {
      resetVideoElement(video);
    }
  }, [videoRef]);

  const { playerId: activePlayerId, claimActive } = useActivePlayer(stopPlayback, playerId);

  const updateState = useCallback(
    (next: PlayerState) => {
      setState(next);
      onStateChange?.(next);
    },
    [onStateChange],
  );

  const reportPlaybackInfo = useCallback(
    (video: HTMLVideoElement, fallback: boolean) => {
      const buffered = video.buffered;
      let bufferSeconds = 0;
      if (buffered.length > 0) {
        bufferSeconds = Math.max(0, buffered.end(buffered.length - 1) - video.currentTime);
      }

      setBufferHealth(bufferSeconds);
      onPlaybackInfo?.({
        usingFallback: fallback,
        resolution:
          video.videoWidth > 0
            ? { width: video.videoWidth, height: video.videoHeight }
            : undefined,
        bufferSeconds,
      });
    },
    [onPlaybackInfo],
  );

  useEffect(() => {
    setActiveSrc(src);
    usingFallbackRef.current = false;
    triedFallbackRef.current = false;
    timeoutRetriedRef.current = false;
    hasStartedPlaybackRef.current = false;
    setErrorMessage(null);
    hasStartedPlayingRef.current = false;
    setConnectElapsedMs(0);
  }, [src]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !activeSrc) return;

    let cancelled = false;

    claimActive();
    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }
    resetVideoElement(video);

    hasStartedPlaybackRef.current = false;
    updateState("connecting");
    setErrorMessage(null);
    hasStartedPlayingRef.current = false;
    setConnectElapsedMs(0);

    const connectStartedAt = Date.now();
    const connectTimer = window.setInterval(() => {
      if (hasStartedPlayingRef.current || cancelled) return;
      const elapsed = Date.now() - connectStartedAt;
      setConnectElapsedMs(elapsed);
      if (live && elapsed >= resolvedConnectTimeout) {
        if (!timeoutRetriedRef.current) {
          timeoutRetriedRef.current = true;
          setErrorMessage(null);
          setRetryKey((key) => key + 1);
          return;
        }
        setErrorMessage("This channel isn't responding. Try another.");
        updateState("error");
      }
    }, 250);

    async function attachPlayer() {
      if (!video || cancelled) return;

      const directTs = isDirectTsStream(activeSrc);

      if (directTs) {
        if (cancelled) return;
        claimActive();
        video.src = activeSrc;
        if (autoPlay) void video.play().catch(() => undefined);
        return;
      }

      const isHls = isHlsStream(activeSrc) || live;

      if (!isHls && !isJellyfinDirectStream(activeSrc) && video.canPlayType("video/mp4")) {
        if (cancelled) return;
        claimActive();
        video.src = activeSrc;
        if (autoPlay) void video.play().catch(() => undefined);
        return;
      }

      if (video.canPlayType("application/vnd.apple.mpegurl") && isHls && !live) {
        if (cancelled) return;
        claimActive();
        video.src = activeSrc;
        if (autoPlay) void video.play().catch(() => undefined);
        return;
      }

      try {
        const HlsModule = await import("hls.js");
        if (cancelled) return;

        if (!HlsModule.default.isSupported()) {
          video.src = activeSrc;
          if (autoPlay) void video.play().catch(() => undefined);
          return;
        }

        if (hlsRef.current) {
          hlsRef.current.destroy();
          hlsRef.current = null;
        }

        const instance = new HlsModule.default(
          buildHlsConfig(live, lanOptimized, resolvedConnectTimeout),
        );
        hlsRef.current = instance;
        instance.loadSource(activeSrc);
        instance.attachMedia(video);

        instance.on(HlsModule.default.Events.MANIFEST_PARSED, () => {
          if (cancelled) return;
          claimActive();
          if (!hasStartedPlaybackRef.current) {
            updateState("connecting");
          }
          if (autoPlay) void video.play().catch(() => undefined);
        });

        instance.on(HlsModule.default.Events.FRAG_LOADING, () => {
          if (cancelled || hasStartedPlaybackRef.current) return;
          updateState("connecting");
        });

        instance.on(HlsModule.default.Events.ERROR, (_, data) => {
          if (!data.fatal) return;

          const detail = data.details ?? data.type ?? "Unknown playback error";
          setErrorMessage(String(detail));

          if (
            fallbackSrc &&
            !triedFallbackRef.current &&
            activeSrc !== fallbackSrc
          ) {
            triedFallbackRef.current = true;
            usingFallbackRef.current = true;
            instance.destroy();
            hlsRef.current = null;
            resetVideoElement(video);
            setActiveSrc(fallbackSrc);
            setErrorMessage(null);
            updateState("connecting");
            return;
          }

          if (data.type === HlsModule.default.ErrorTypes.NETWORK_ERROR) {
            instance.startLoad();
            return;
          }

          if (data.type === HlsModule.default.ErrorTypes.MEDIA_ERROR) {
            instance.recoverMediaError();
            return;
          }

          updateState("error");
        });
      } catch (error) {
        if (cancelled) return;
        const message = error instanceof Error ? error.message : "Failed to initialize player";
        setErrorMessage(message);
        video.src = activeSrc;
        updateState("error");
      }
    }

    void attachPlayer();

    const onPlaying = () => {
      hasStartedPlaybackRef.current = true;
      hasStartedPlayingRef.current = true;
      updateState("playing");
    };
    const onWaiting = () => {
      updateState(hasStartedPlaybackRef.current ? "buffering" : "connecting");
    };
    const onError = () => {
      if (
        fallbackSrc &&
        !triedFallbackRef.current &&
        activeSrc !== fallbackSrc
      ) {
        triedFallbackRef.current = true;
        usingFallbackRef.current = true;
        setActiveSrc(fallbackSrc);
        setErrorMessage(null);
        updateState("connecting");
        return;
      }

      const mediaError = video.error;
      const code = mediaError?.code;
      const messages: Record<number, string> = {
        1: "Playback aborted",
        2: "Network error. Check your connection",
        3: "Decode error. Switching to transcoded stream",
        4: isJellyfinDirectStream(activeSrc)
          ? "Direct stream not supported in browser. Switching to HLS transcode"
          : "Format not supported. Try a different quality",
      };
      setErrorMessage(messages[code ?? 0] ?? "Video playback failed");
      updateState("error");
    };
    const onCanPlay = () => {
      reportPlaybackInfo(video, usingFallbackRef.current);
      if (video.paused && !hasStartedPlaybackRef.current) {
        updateState("connecting");
      } else if (!video.paused) {
        updateState("playing");
      }
    };
    const onLoadedMetadata = () => reportPlaybackInfo(video, usingFallbackRef.current);

    video.addEventListener("playing", onPlaying);
    video.addEventListener("waiting", onWaiting);
    video.addEventListener("error", onError);
    video.addEventListener("canplay", onCanPlay);
    video.addEventListener("loadedmetadata", onLoadedMetadata);

    const bufferTimer = setInterval(() => {
      if (!video.paused && !video.ended) {
        reportPlaybackInfo(video, usingFallbackRef.current);
      }
    }, 2000);

    return () => {
      cancelled = true;
      window.clearInterval(connectTimer);
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
      resetVideoElement(video);
      clearInterval(bufferTimer);
      video.removeEventListener("playing", onPlaying);
      video.removeEventListener("waiting", onWaiting);
      video.removeEventListener("error", onError);
      video.removeEventListener("canplay", onCanPlay);
      video.removeEventListener("loadedmetadata", onLoadedMetadata);
    };
  }, [
    activeSrc,
    autoPlay,
    live,
    lanOptimized,
    retryKey,
    resolvedConnectTimeout,
    videoRef,
    updateState,
    fallbackSrc,
    reportPlaybackInfo,
    claimActive,
  ]);

  const handleRetry = () => {
    triedFallbackRef.current = false;
    timeoutRetriedRef.current = false;
    usingFallbackRef.current = false;
    setActiveSrc(src);
    setErrorMessage(null);
    hasStartedPlaybackRef.current = false;
    updateState("connecting");
    setRetryKey((key) => key + 1);
  };

  const isStalled = state === "connecting" || state === "buffering";
  const bufferPercent = Math.min(100, Math.round((bufferHealth / 30) * 100));
  const connectProgress = Math.min(
    100,
    Math.round((connectElapsedMs / resolvedConnectTimeout) * 100),
  );
  const stallLabel =
    state === "buffering"
      ? "Buffering…"
      : live
        ? (connectingLabel ?? "Buffering…")
        : "Loading…";

  return (
    <div
      data-rushify-player-id={activePlayerId}
      className={cn(
        "relative overflow-hidden rounded-2xl border border-rush-border bg-black shadow-glow",
        className,
      )}
    >
      <video
        ref={videoRef}
        className={cn(
          "aspect-video w-full bg-black transition-opacity duration-200",
          isStalled && "rushify-video-stalled pointer-events-none opacity-0",
          videoClassName,
        )}
        controls
        playsInline
        poster={poster}
        tabIndex={0}
        title={title}
      />

      {playbackStatus && state !== "error" && (
        <div className="pointer-events-none absolute left-3 top-3 flex items-center gap-2">
          <span className="rounded-lg border border-white/10 bg-black/60 px-2.5 py-1 text-xs font-medium text-white/90 backdrop-blur-sm">
            {playbackStatus}
          </span>
        </div>
      )}

      {state === "playing" && bufferHealth > 0 && (
        <div className="pointer-events-none absolute bottom-14 right-3 hidden sm:block">
          <div className="rounded-lg border border-white/10 bg-black/50 px-2 py-1 backdrop-blur-sm">
            <div className="flex items-center gap-2">
              <span className="text-[10px] uppercase tracking-wide text-white/60">Buffer</span>
              <div className="h-1.5 w-16 overflow-hidden rounded-full bg-white/20">
                <div
                  className="h-full rounded-full bg-rush-accent transition-all duration-500"
                  style={{ width: `${bufferPercent}%` }}
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {isStalled && (
        <div
          className="pointer-events-none absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 bg-black"
          aria-live="polite"
          aria-busy="true"
        >
          <div
            className="h-8 w-8 animate-spin rounded-full border-2 border-rush-accent/30 border-t-rush-accent"
            aria-hidden
          />
          <p className="text-sm text-rush-muted">{stallLabel}</p>
          {live && connectElapsedMs > 0 && (
            <div className="w-40 overflow-hidden rounded-full bg-white/15">
              <div
                className="h-1 rounded-full bg-rush-accent transition-all duration-300"
                style={{ width: `${connectProgress}%` }}
              />
            </div>
          )}
        </div>
      )}

      {state === "error" && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-black/80 px-6 text-center">
          <p className="text-sm font-medium text-rush-foreground">
            {errorTitle ?? "Playback interrupted"}
          </p>
          {errorMessage && (
            <p className="max-w-md text-xs text-rush-muted">{errorMessage}</p>
          )}
          <div className="flex flex-wrap items-center justify-center gap-2">
            <button
              type="button"
              onClick={handleRetry}
              className="rounded-xl bg-rush-accent px-4 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-rush-accent"
            >
              Try again
            </button>
            {errorActions}
          </div>
        </div>
      )}
    </div>
  );
}

export async function enterPictureInPicture(video: HTMLVideoElement): Promise<void> {
  if (!document.pictureInPictureEnabled || video.disablePictureInPicture) return;
  if (document.pictureInPictureElement) {
    await document.exitPictureInPicture();
  } else {
    await video.requestPictureInPicture();
  }
}

export async function toggleFullscreen(container: HTMLElement): Promise<void> {
  if (document.fullscreenElement) {
    await document.exitFullscreen();
  } else {
    await container.requestFullscreen();
  }
}

/** @deprecated Use RushifyPlayer */
export { RushifyPlayer as HlsPlayer };
