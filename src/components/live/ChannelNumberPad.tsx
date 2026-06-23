"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { cn } from "@/lib/utils/cn";
import type { IptvChannel } from "@/types/iptv";

import { findChannelByNumber } from "./VirtualChannelList";

type ChannelNumberPadProps = {
  channels: IptvChannel[];
  onTuneChannel: (channel: IptvChannel) => void;
  enabled?: boolean;
};

const DIGIT_TIMEOUT_MS = 2500;
const MAX_DIGITS = 5;

export function ChannelNumberPad({ channels, onTuneChannel, enabled = true }: ChannelNumberPadProps) {
  const [digits, setDigits] = useState("");
  const [visible, setVisible] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout>>();

  const clearDigits = useCallback(() => {
    setDigits("");
    setVisible(false);
    if (timerRef.current) clearTimeout(timerRef.current);
  }, []);

  const commitDigits = useCallback(
    (value: string) => {
      const channel = findChannelByNumber(channels, value);
      if (channel) onTuneChannel(channel);
      clearDigits();
    },
    [channels, onTuneChannel, clearDigits],
  );

  useEffect(() => {
    if (!enabled) return;

    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.tagName === "SELECT" ||
          target.isContentEditable)
      ) {
        return;
      }

      if (/^[0-9]$/.test(event.key)) {
        event.preventDefault();
        setVisible(true);
        setDigits((current) => {
          const next = (current + event.key).slice(-MAX_DIGITS);
          if (timerRef.current) clearTimeout(timerRef.current);
          timerRef.current = setTimeout(() => commitDigits(next), DIGIT_TIMEOUT_MS);
          return next;
        });
        return;
      }

      if (event.key === "Enter" && digits.length > 0) {
        event.preventDefault();
        commitDigits(digits);
        return;
      }

      if (event.key === "Escape" && digits.length > 0) {
        event.preventDefault();
        clearDigits();
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [enabled, digits, commitDigits, clearDigits]);

  if (!visible || !digits) return null;

  return (
    <div
      className={cn(
        "pointer-events-none fixed bottom-24 left-1/2 z-50 -translate-x-1/2",
        "rounded-2xl border border-rush-accent/40 bg-black/85 px-8 py-4 shadow-glow backdrop-blur-md",
      )}
      role="status"
      aria-live="polite"
    >
      <p className="text-center text-xs uppercase tracking-[0.3em] text-rush-muted">Channel</p>
      <p className="mt-1 text-center text-4xl font-semibold tabular-nums text-rush-foreground">
        {digits}
      </p>
    </div>
  );
}
