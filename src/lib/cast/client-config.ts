export const CAST_RECEIVER_APP_ID =
  process.env.NEXT_PUBLIC_GOOGLE_CAST_APP_ID ?? "CC1AD845";

export function getClientPublicAppUrl(): string {
  const configured = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "");
  if (configured) return configured;
  if (typeof window !== "undefined") return window.location.origin;
  return "http://localhost:3000";
}

export function toAbsoluteClientUrl(path: string): string {
  if (path.startsWith("http://") || path.startsWith("https://")) return path;
  const base = getClientPublicAppUrl();
  return `${base}${path.startsWith("/") ? path : `/${path}`}`;
}
