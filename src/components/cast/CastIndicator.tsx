"use client";

import { useCast } from "@/components/cast/CastProvider";
import { cn } from "@/lib/utils/cn";

type CastIndicatorProps = {
  className?: string;
  variant?: "overlay" | "default";
};

export function CastIndicator({ className, variant = "default" }: CastIndicatorProps) {
  const { isCasting, deviceName, stopCast } = useCast();

  if (!isCasting || !deviceName) return null;

  const overlayStyles =
    "rounded-xl border border-rush-accent/30 bg-black/60 px-3 py-2 text-sm text-rush-accent backdrop-blur-sm";
  const defaultStyles =
    "inline-flex items-center gap-2 rounded-xl border border-rush-accent/30 bg-rush-accent/10 px-3 py-1.5 text-sm text-rush-accent";

  return (
    <div className={cn(variant === "overlay" ? overlayStyles : defaultStyles, "inline-flex items-center gap-2", className)}>
      <span>Casting to {deviceName}</span>
      <button
        type="button"
        onClick={stopCast}
        className={cn(
          "ml-2 rounded-lg px-2 py-0.5 text-xs transition-colors",
          variant === "overlay"
            ? "bg-white/10 hover:bg-white/20"
            : "bg-rush-accent/20 hover:bg-rush-accent/30",
        )}
      >
        Stop
      </button>
    </div>
  );
}
