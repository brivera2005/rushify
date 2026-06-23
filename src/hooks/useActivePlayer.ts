"use client";

import { useCallback, useEffect, useId, useRef } from "react";

import {
  claimActivePlayer,
  registerPlayer,
  unregisterPlayer,
} from "@/lib/player/active-player";

export function useActivePlayer(stop: () => void, explicitId?: string) {
  const autoId = useId();
  const idRef = useRef(explicitId ?? autoId);

  useEffect(() => {
    const id = idRef.current;
    registerPlayer(id, stop);
    return () => unregisterPlayer(id);
  }, [stop]);

  const claimActive = useCallback(() => {
    claimActivePlayer(idRef.current);
  }, []);

  return { playerId: idRef.current, claimActive };
}
