"use client";

import { cn } from "@/lib/utils/cn";

type EnglishOnlyToggleProps = {
  enabled: boolean;
  onChange: (enabled: boolean) => void;
  totalChannels?: number;
  filteredChannels?: number;
  className?: string;
};

export function EnglishOnlyToggle({
  enabled,
  onChange,
  totalChannels,
  filteredChannels,
  className,
}: EnglishOnlyToggleProps) {
  const countLabel =
    enabled && totalChannels != null && filteredChannels != null
      ? filteredChannels === totalChannels
        ? `Showing ${filteredChannels.toLocaleString()} English channels`
        : `Showing ${filteredChannels.toLocaleString()} English channels of ${totalChannels.toLocaleString()}`
      : totalChannels != null
        ? `${totalChannels.toLocaleString()} channels`
        : null;

  return (
    <label
      className={cn(
        "flex cursor-pointer items-center gap-2 rounded-xl border border-rush-border bg-rush-surface/80 px-3 py-2 text-sm",
        className,
      )}
    >
      <input
        type="checkbox"
        checked={enabled}
        onChange={(event) => onChange(event.target.checked)}
        className="size-4 rounded border-rush-border accent-rush-accent"
      />
      <span className="text-rush-foreground">English only</span>
      {countLabel ? <span className="text-xs text-rush-muted">· {countLabel}</span> : null}
    </label>
  );
}
