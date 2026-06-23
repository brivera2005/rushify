export function getPublicAppUrl(requestOrigin?: string): string {
  const configured = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "");
  if (configured) return configured;
  if (requestOrigin) return requestOrigin.replace(/\/$/, "");
  return "http://localhost:3000";
}

export function toAbsolutePublicUrl(path: string, requestOrigin?: string): string {
  if (path.startsWith("http://") || path.startsWith("https://")) return path;
  const base = getPublicAppUrl(requestOrigin);
  return `${base}${path.startsWith("/") ? path : `/${path}`}`;
}
