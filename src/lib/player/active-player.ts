type StopFn = () => void;

const registry = new Map<string, StopFn>();
let activePlayerId: string | null = null;

function pauseOrphanVideos(activeId: string): void {
  if (typeof document === "undefined") return;

  for (const video of document.querySelectorAll("video")) {
    const ownerId = video.closest("[data-rushify-player-id]")?.getAttribute("data-rushify-player-id");
    if (ownerId && ownerId !== activeId) {
      video.pause();
      video.removeAttribute("src");
      video.load();
    }
  }
}

export function registerPlayer(id: string, stop: StopFn): void {
  registry.set(id, stop);
}

export function unregisterPlayer(id: string): void {
  registry.delete(id);
  if (activePlayerId === id) {
    activePlayerId = null;
  }
}

/** Mark this player as the sole audio source and stop every other instance. */
export function claimActivePlayer(id: string): void {
  activePlayerId = id;
  stopAllExcept(id);
  pauseOrphanVideos(id);
}

export function getActivePlayerId(): string | null {
  return activePlayerId;
}

/** Pause and tear down every registered player except the given id. */
export function stopAllExcept(activeId: string): void {
  for (const [id, stop] of registry) {
    if (id !== activeId) {
      try {
        stop();
      } catch {
        // Ignore teardown errors from stale players.
      }
    }
  }
  pauseOrphanVideos(activeId);
}

export function stopAllPlayers(): void {
  for (const stop of registry.values()) {
    try {
      stop();
    } catch {
      // Ignore teardown errors.
    }
  }
}
