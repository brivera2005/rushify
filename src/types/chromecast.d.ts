declare namespace chrome.cast {
  enum AutoJoinPolicy {
    ORIGIN_SCOPED = "origin_scoped",
  }

  enum SessionState {
    NO_SESSION = "NO_SESSION",
    SESSION_STARTING = "SESSION_STARTING",
    SESSION_STARTED = "SESSION_STARTED",
    SESSION_ENDING = "SESSION_ENDING",
    SESSION_ENDED = "SESSION_ENDED",
    SESSION_RESUMED = "SESSION_RESUMED",
  }

  interface Session {
    getSessionId(): string;
    getCastDevice(): { friendlyName: string };
  }
}

declare namespace cast.framework {
  enum CastState {
    NO_DEVICES_AVAILABLE = "NO_DEVICES_AVAILABLE",
    NOT_CONNECTED = "NOT_CONNECTED",
    CONNECTING = "CONNECTING",
    CONNECTED = "CONNECTED",
  }

  enum CastContextEventType {
    CAST_STATE_CHANGED = "caststatechanged",
    SESSION_STATE_CHANGED = "sessionstatechanged",
  }

  enum SessionState {
    NO_SESSION = "NO_SESSION",
    SESSION_STARTING = "SESSION_STARTING",
    SESSION_STARTED = "SESSION_STARTED",
    SESSION_ENDING = "SESSION_ENDING",
    SESSION_ENDED = "SESSION_ENDED",
    SESSION_RESUMED = "SESSION_RESUMED",
  }

  enum RemotePlayerEventType {
    IS_CONNECTED_CHANGED = "isConnectedChanged",
    PLAYER_STATE_CHANGED = "playerStateChanged",
  }

  enum PlayerState {
    IDLE = "IDLE",
    PLAYING = "PLAYING",
    PAUSED = "PAUSED",
    BUFFERING = "BUFFERING",
  }

  namespace messages {
    class Image {
      constructor(url: string);
    }

    class GenericMediaMetadata {
      title?: string;
      subtitle?: string;
      images?: Image[];
    }

    class MediaInfo {
      constructor(contentId: string, contentType: string);
      metadata?: GenericMediaMetadata;
      streamType?: messages.StreamType | string;
    }

    class LoadRequest {
      constructor(mediaInfo: MediaInfo);
    }

    enum StreamType {
      BUFFERED = "BUFFERED",
      LIVE = "LIVE",
    }
  }

  class CastContext {
    static getInstance(): CastContext;
    setOptions(options: {
      receiverApplicationId: string;
      autoJoinPolicy: chrome.cast.AutoJoinPolicy;
    }): void;
    getCastState(): CastState;
    getCurrentSession(): CastSession | null;
    requestSession(): Promise<CastSession>;
    addEventListener(
      type: CastContextEventType,
      handler: (event: { castState?: CastState; sessionState?: SessionState }) => void,
    ): void;
    removeEventListener(
      type: CastContextEventType,
      handler: (event: { castState?: CastState; sessionState?: SessionState }) => void,
    ): void;
    endCurrentSession(stopCasting: boolean): void;
  }

  class CastSession {
    loadMedia(request: messages.LoadRequest): Promise<void>;
    getCastDevice(): { friendlyName: string };
  }

  class RemotePlayer {
    isConnected: boolean;
    playerState: PlayerState;
    displayName: string;
  }

  class RemotePlayerController {
    constructor(player: RemotePlayer);
    addEventListener(
      type: RemotePlayerEventType,
      handler: (event: { field: string; value: unknown }) => void,
    ): void;
    removeEventListener(
      type: RemotePlayerEventType,
      handler: (event: { field: string; value: unknown }) => void,
    ): void;
    stop(): void;
  }
}

interface Window {
  cast?: typeof cast;
  __onGCastApiAvailable?: (isAvailable: boolean) => void;
}
