export type RushifyNavItem = {
  label: string;
  href: string;
  icon: "home" | "live" | "library" | "settings";
};

export type DashboardSection = {
  id: string;
  title: string;
  description: string;
};

export type HealthStatus = {
  status: "ok" | "degraded" | "error";
  service: "rushify";
  timestamp: string;
  checks: {
    jellyfin: "unknown" | "ok" | "error";
    iptv: "unknown" | "ok" | "error";
  };
};
