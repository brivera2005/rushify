import { cn } from "@/lib/utils/cn";

type RushifyLogoProps = {
  compact?: boolean;
  className?: string;
};

export function RushifyLogo({ compact = false, className }: RushifyLogoProps) {
  return (
    <div className={cn("flex items-center gap-3", className)}>
      <svg
        aria-hidden
        viewBox="0 0 48 48"
        className={cn("text-rush-accent", compact ? "h-8 w-8" : "h-10 w-10")}
        fill="none"
      >
        <defs>
          <linearGradient id="rushify-gradient" x1="8" y1="8" x2="40" y2="40">
            <stop stopColor="#7C5CFF" />
            <stop offset="1" stopColor="#2FD4FF" />
          </linearGradient>
        </defs>
        <rect x="4" y="4" width="40" height="40" rx="12" fill="url(#rushify-gradient)" />
        <path
          d="M18 32V16l14 8-14 8z"
          fill="#0B0D14"
          opacity="0.92"
        />
      </svg>
      {!compact && (
        <div>
          <p className="text-xl font-semibold tracking-[0.18em] text-rush-foreground">
            RUSHIFY
          </p>
          <p className="text-xs uppercase tracking-[0.35em] text-rush-muted">
            Premium Media
          </p>
        </div>
      )}
    </div>
  );
}
