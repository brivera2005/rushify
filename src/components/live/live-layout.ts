import type { CSSProperties } from "react";

/** Category sidebar width — must match `.live-guide-grid` / `.live-channels-grid` in globals.css. */
export const CATEGORY_SIDEBAR_WIDTH_PX = 360;

/** Guide player panel width on xl breakpoints. */
export const GUIDE_PLAYER_PANEL_WIDTH_PX = 340;

/** Sets CSS variables consumed by live TV grid layout classes. */
export function liveLayoutVars(): CSSProperties {
  return {
    ["--live-sidebar-width" as string]: `${CATEGORY_SIDEBAR_WIDTH_PX}px`,
    ["--live-player-width" as string]: `${GUIDE_PLAYER_PANEL_WIDTH_PX}px`,
  };
}
