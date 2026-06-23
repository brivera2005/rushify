export const ACCESS_GATE_COOKIE = "rushify_gate";

const GATE_MAX_AGE_SECONDS = 60 * 60 * 24;

export function isAccessGateEnabled(): boolean {
  const pin = process.env.RUSHIFY_ACCESS_PIN?.trim();
  return Boolean(pin);
}

export function verifyAccessPin(pin: string): boolean {
  const expected = process.env.RUSHIFY_ACCESS_PIN?.trim();
  if (!expected) return true;
  return pin.trim() === expected;
}

export function buildAccessGateCookie(): {
  name: string;
  value: string;
  options: {
    httpOnly: boolean;
    secure: boolean;
    sameSite: "lax";
    path: string;
    maxAge: number;
  };
} {
  const secure =
    process.env.SESSION_COOKIE_SECURE === "true" || process.env.RUSHIFY_TLS === "true";

  return {
    name: ACCESS_GATE_COOKIE,
    value: "1",
    options: {
      httpOnly: true,
      secure,
      sameSite: "lax",
      path: "/",
      maxAge: GATE_MAX_AGE_SECONDS,
    },
  };
}

export function hasValidAccessGateCookie(value: string | undefined): boolean {
  return value === "1";
}
