"use client";

import Script from "next/script";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import { CAST_RECEIVER_APP_ID, toAbsoluteClientUrl } from "@/lib/cast/client-config";
import { useToastOptional } from "@/components/ui/Toast";
import type { StreamQuality } from "@/lib/jellyfin/stream";

export type CastMediaRequest = {
  kind: "iptv" | "vod";
  id: string;
  title: string;
  subtitle?: string;
  posterUrl?: string;
  contentType?: string;
  quality?: StreamQuality;
};

type CastContextValue = {
  isAvailable: boolean;
  isCasting: boolean;
  deviceName: string | null;
  isLoading: boolean;
  error: string | null;
  startCast: (media: CastMediaRequest) => Promise<void>;
  stopCast: () => void;
};

const CastReactContext = createContext<CastContextValue | null>(null);

const CAST_SCRIPT =
  "https://www.gstatic.com/cv/js/sender/v1/cast_sender.js?loadCastFramework=1";

async function requestCastToken(
  kind: "iptv" | "vod",
  id: string,
  quality?: StreamQuality,
): Promise<{
  streamUrl: string;
  contentType: string;
}> {
  const response = await fetch("/api/cast/token", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ kind, id, quality }),
  });

  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as { error?: string } | null;
    throw new Error(payload?.error ?? "Unable to prepare cast stream");
  }

  return (await response.json()) as { streamUrl: string; contentType: string };
}

export function CastProvider({ children }: { children: React.ReactNode }) {
  const toast = useToastOptional();
  const [sdkReady, setSdkReady] = useState(false);
  const [castState, setCastState] = useState<cast.framework.CastState | null>(null);
  const [deviceName, setDeviceName] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const initRef = useRef(false);

  useEffect(() => {
    window.__onGCastApiAvailable = (isAvailable) => {
      if (isAvailable) setSdkReady(true);
    };
    if (window.cast?.framework) setSdkReady(true);
  }, []);

  useEffect(() => {
    if (!sdkReady || initRef.current || !window.cast?.framework) return;
    initRef.current = true;

    const context = window.cast.framework.CastContext.getInstance();
    context.setOptions({
      receiverApplicationId: CAST_RECEIVER_APP_ID,
      autoJoinPolicy: chrome.cast.AutoJoinPolicy.ORIGIN_SCOPED,
    });

    const onCastStateChanged = (event: { castState?: cast.framework.CastState }) => {
      if (event.castState !== undefined) setCastState(event.castState);
    };

    const onSessionStateChanged = (event: { sessionState?: cast.framework.SessionState }) => {
      const session = context.getCurrentSession();
      if (
        event.sessionState === cast.framework.SessionState.SESSION_STARTED ||
        event.sessionState === cast.framework.SessionState.SESSION_RESUMED
      ) {
        setDeviceName(session?.getCastDevice().friendlyName ?? null);
      } else if (
        event.sessionState === cast.framework.SessionState.SESSION_ENDED ||
        event.sessionState === cast.framework.SessionState.NO_SESSION
      ) {
        setDeviceName(null);
      }
    };

    context.addEventListener(
      cast.framework.CastContextEventType.CAST_STATE_CHANGED,
      onCastStateChanged,
    );
    context.addEventListener(
      cast.framework.CastContextEventType.SESSION_STATE_CHANGED,
      onSessionStateChanged,
    );
    setCastState(context.getCastState());

    return () => {
      context.removeEventListener(
        cast.framework.CastContextEventType.CAST_STATE_CHANGED,
        onCastStateChanged,
      );
      context.removeEventListener(
        cast.framework.CastContextEventType.SESSION_STATE_CHANGED,
        onSessionStateChanged,
      );
    };
  }, [sdkReady]);

  const loadMediaOnSession = useCallback(async (media: CastMediaRequest) => {
    const context = window.cast?.framework.CastContext.getInstance();
    if (!context) throw new Error("Cast is not available");

    let session = context.getCurrentSession();
    if (!session) {
      session = await context.requestSession();
    }

    const { streamUrl, contentType } = await requestCastToken(
      media.kind,
      media.id,
      media.quality,
    );
    const mediaInfo = new cast.framework.messages.MediaInfo(
      streamUrl,
      media.contentType ?? contentType ?? "application/x-mpegURL",
    );
    mediaInfo.streamType =
      media.kind === "iptv"
        ? cast.framework.messages.StreamType.LIVE
        : cast.framework.messages.StreamType.BUFFERED;

    const metadata = new cast.framework.messages.GenericMediaMetadata();
    metadata.title = media.title;
    if (media.subtitle) metadata.subtitle = media.subtitle;
    if (media.posterUrl) {
      metadata.images = [new cast.framework.messages.Image(toAbsoluteClientUrl(media.posterUrl))];
    }
    mediaInfo.metadata = metadata;

    const request = new cast.framework.messages.LoadRequest(mediaInfo);
    await session.loadMedia(request);
    setDeviceName(session.getCastDevice().friendlyName ?? null);
  }, []);

  const startCast = useCallback(
    async (media: CastMediaRequest) => {
      if (!sdkReady || !window.cast?.framework) {
        setError("Google Cast is not available in this browser");
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        const maxAttempts = 3;
        let lastError: unknown;

        for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
          try {
            await loadMediaOnSession(media);
            return;
          } catch (castError) {
            lastError = castError;
            if (attempt < maxAttempts) {
              await new Promise((resolve) => setTimeout(resolve, attempt * 800));
            }
          }
        }

        const message =
          lastError instanceof Error ? lastError.message : "Unable to start casting";
        setError(message);
        toast?.toast(message, "error");
        throw lastError;
      } finally {
        setIsLoading(false);
      }
    },
    [loadMediaOnSession, sdkReady, toast],
  );

  const stopCast = useCallback(() => {
    const context = window.cast?.framework.CastContext.getInstance();
    context?.endCurrentSession(true);
    setDeviceName(null);
    setError(null);
  }, []);

  const value = useMemo<CastContextValue>(() => {
    const noDevices = "NO_DEVICES_AVAILABLE";
    const connected = "CONNECTED";

    return {
      isAvailable: sdkReady && castState !== null && castState !== noDevices,
      isCasting: sdkReady && castState === connected,
      deviceName,
      isLoading,
      error,
      startCast,
      stopCast,
    };
  }, [sdkReady, castState, deviceName, isLoading, error, startCast, stopCast]);

  return (
    <CastReactContext.Provider value={value}>
      <Script src={CAST_SCRIPT} strategy="afterInteractive" />
      {children}
    </CastReactContext.Provider>
  );
}

export function useCast(): CastContextValue {
  const context = useContext(CastReactContext);
  if (!context) {
    throw new Error("useCast must be used within CastProvider");
  }
  return context;
}

export function useCastOptional(): CastContextValue | null {
  return useContext(CastReactContext);
}
