"use client";

import { useCallback } from "react";

import { type CastMediaRequest, useCast } from "@/components/cast/CastProvider";
import { cn } from "@/lib/utils/cn";

type CastButtonProps = {
  media: CastMediaRequest | null;
  variant?: "overlay" | "default";
  className?: string;
  label?: string;
};

function CastIcon({ active }: { active?: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      className={cn("h-4 w-4", active ? "fill-rush-accent" : "fill-current")}
    >
      <path d="M1 18v3h3c0-1.66-1.34-3-3-3zm0-4v2c2.76 0 5 2.24 5 5h2c0-3.87-3.13-7-7-7zm0-4v2c4.97 0 9 4.03 9 9h2c0-6.08-4.93-11-11-11zm20-7H3c-1.1 0-2 .9-2 2v3h2V5h18v14h-7v2h7c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2z" />
    </svg>
  );
}

export function CastButton({ media, variant = "default", className, label }: CastButtonProps) {
  const { isAvailable, isCasting, isLoading, startCast, stopCast } = useCast();

  const handleClick = useCallback(async () => {
    if (isCasting) {
      stopCast();
      return;
    }
    if (!media) return;
    await startCast(media);
  }, [isCasting, media, startCast, stopCast]);

  if (!isAvailable) return null;

  const overlayStyles =
    "rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-sm backdrop-blur-sm transition-colors hover:bg-rush-accent/20";
  const defaultStyles =
    "inline-flex items-center gap-2 rounded-xl border border-rush-border bg-rush-surface px-3 py-2 text-sm text-rush-muted transition-colors hover:border-rush-accent/40 hover:text-rush-foreground";

  return (
    <button
      type="button"
      onClick={() => void handleClick()}
      disabled={!media && !isCasting}
      aria-label={isCasting ? "Stop casting" : "Cast to TV"}
      className={cn(
        variant === "overlay" ? overlayStyles : defaultStyles,
        isCasting && "border-rush-accent/50 text-rush-accent",
        (isLoading || (!media && !isCasting)) && "opacity-60",
        className,
      )}
    >
      <CastIcon active={isCasting} />
      {label && <span>{label}</span>}
    </button>
  );
}
