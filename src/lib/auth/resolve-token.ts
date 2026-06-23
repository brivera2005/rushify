import "server-only";

import { isRushifyLocalSession } from "@/lib/auth/rushify-users";
import { getEnvOrNull } from "@/lib/config/env";
import { getSession } from "@/lib/auth/session";

export type MediaCredentials = {
  token: string;
  userId?: string;
  username?: string;
};

export async function resolveMediaCredentials(): Promise<MediaCredentials | null> {
  const session = await getSession();
  const env = getEnvOrNull();

  if (session && !isRushifyLocalSession(session)) {
    return {
      token: session.accessToken,
      userId: session.userId,
      username: session.username,
    };
  }

  if (env?.JELLYFIN_API_KEY) {
    return { token: env.JELLYFIN_API_KEY };
  }

  return null;
}
