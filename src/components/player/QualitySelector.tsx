"use client";

import { cn } from "@/lib/utils/cn";
import { STREAM_QUALITY_OPTIONS, type StreamQuality } from "@/lib/jellyfin/stream";

type QualitySelectorProps = {
  value: StreamQuality;
  onChange: (quality: StreamQuality) => void;
  className?: string;
};

export function QualitySelector({ value, onChange, className }: QualitySelectorProps) {
  return (
    <div
      className={cn(
        "flex flex-wrap items-center gap-1 rounded-xl border border-rush-border/80 bg-rush-surface/90 p-1 backdrop-blur-sm",
        className,
      )}
      role="radiogroup"
      aria-label="Playback quality"
    >
      {STREAM_QUALITY_OPTIONS.map((option) => (
        <button
          key={option.value}
          type="button"
          role="radio"
          aria-checked={value === option.value}
          onClick={() => onChange(option.value)}
          className={cn(
            "rounded-lg px-3 py-1.5 text-xs font-medium transition-colors",
            value === option.value
              ? "bg-rush-accent text-white shadow-sm"
              : "text-rush-muted hover:bg-rush-surface hover:text-rush-foreground",
          )}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
