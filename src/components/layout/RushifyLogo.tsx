import { cn } from "@/lib/utils/cn";

type RushifyLogoProps = {
  compact?: boolean;
  className?: string;
};

export function RushifyLogo({ compact = false, className }: RushifyLogoProps) {
  return (
    <div className={cn("flex items-center overflow-visible", compact ? "gap-2" : "gap-3", className)}>
      <svg
        aria-hidden
        viewBox="0 0 48 48"
        className={cn("shrink-0", compact ? "h-7 w-7" : "h-10 w-10")}
        fill="none"
      >
        <defs>
          <linearGradient id="rushify-gradient" x1="8" y1="8" x2="40" y2="40">
            <stop stopColor="#8b5cf6" />
            <stop offset="1" stopColor="#38bdf8" />
          </linearGradient>
        </defs>
        <rect x="4" y="4" width="40" height="40" rx="12" fill="url(#rushify-gradient)" />
        <path
          d="M18 32V16l14 8-14 8z"
          fill="#141416"
          opacity="0.92"
        />
      </svg>
      <p
        className={cn(
          "overflow-visible font-display font-semibold tracking-tight text-brand-gradient",
          compact ? "text-base leading-snug" : "text-xl leading-snug",
        )}
      >
        Rushify
      </p>
    </div>
  );
}
