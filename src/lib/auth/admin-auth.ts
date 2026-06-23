import "server-only";

import { isAdminRole } from "@/lib/auth/rushify-users";
import type { SessionData } from "@/lib/auth/session";

export const ADMIN_USER_ID = "rushify-admin";
export const ADMIN_ACCESS_TOKEN = "rushify-admin";

/** @deprecated Use isAdminRole from rushify-users */
export function isAdminSession(session: SessionData): boolean {
  return isAdminRole(session);
}
