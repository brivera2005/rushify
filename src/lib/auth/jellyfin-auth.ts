import "server-only";

import { isAdminRole } from "@/lib/auth/rushify-users";
import type { SessionData } from "@/lib/auth/session";
import { resolveJellyfinServerUrl } from "@/lib/jellyfin/discovery";

const CLIENT_HEADERS = {
  Accept: "application/json",
  "Content-Type": "application/json",
  "X-Emby-Authorization":
    'MediaBrowser Client="Rushify", Device="Rushify Web", DeviceId="rushify-web", Version="1.0.0"',
};

type AuthenticateResponse = {
  AccessToken: string;
  User: {
    Id: string;
    Name: string;
  };
};

export async function authenticateWithMediaServer(
  username: string,
  password: string,
): Promise<SessionData> {
  const serverUrl = await resolveJellyfinServerUrl();
  if (!serverUrl) {
    throw new Error("Rushify is temporarily unavailable");
  }

  const response = await fetch(`${serverUrl}/Users/authenticatebyname`, {
    method: "POST",
    headers: CLIENT_HEADERS,
    body: JSON.stringify({ Username: username, Pw: password }),
    cache: "no-store",
  });

  if (!response.ok) {
    if (response.status === 401 || response.status === 403) {
      throw new Error("Invalid username or password");
    }
    throw new Error("Unable to sign in right now");
  }

  const data = (await response.json()) as AuthenticateResponse;

  return {
    accessToken: data.AccessToken,
    userId: data.User.Id,
    username: data.User.Name,
  };
}

export async function validateSession(session: SessionData): Promise<boolean> {
  if (isAdminRole(session)) {
    return true;
  }

  const serverUrl = await resolveJellyfinServerUrl();
  if (!serverUrl) return false;

  try {
    const response = await fetch(`${serverUrl}/Users/${session.userId}`, {
      headers: {
        Accept: "application/json",
        "X-Emby-Token": session.accessToken,
      },
      cache: "no-store",
    });
    return response.ok;
  } catch {
    return false;
  }
}
