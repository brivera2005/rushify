import "server-only";

import { getEnvOrNull } from "@/lib/config/env";

export function getPublicUrl(): string {
  const env = getEnvOrNull();
  if (env?.RUSHIFY_PUBLIC_URL) {
    return env.RUSHIFY_PUBLIC_URL.replace(/\/$/, "");
  }

  const nextPublic = process.env.NEXT_PUBLIC_APP_URL;
  if (nextPublic?.trim()) {
    return nextPublic.trim().replace(/\/$/, "");
  }

  return "http://localhost:8096";
}

export function maskServerUrl(url: string | undefined): string {
  if (!url) return "Not configured";
  try {
    const parsed = new URL(url);
    const port = parsed.port ? `:${parsed.port}` : "";
    return `${parsed.protocol}//••••••${port}`;
  } catch {
    return "Configured";
  }
}
