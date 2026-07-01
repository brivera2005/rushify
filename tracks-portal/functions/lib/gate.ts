export const SESSION_COOKIE = 'tracks_session';
export const SESSION_MAX_AGE_SEC = 60 * 60 * 24 * 7; // 7 days
export const PIN_TTL_SEC = 60 * 10; // 10 minutes

export interface Env {
  RUSHTRACKS_GATE_SECRET: string;
  TRACKS_PINS: KVNamespace;
}

export interface ActivePin {
  pin: string;
  expiresAt: number;
}

const ACTIVE_PIN_KEY = 'active_pin';

export function jsonResponse(body: unknown, status = 200, headers: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json', ...headers },
  });
}

export function getCookie(request: Request, name: string): string | null {
  const raw = request.headers.get('cookie');
  if (!raw) return null;
  for (const part of raw.split(';')) {
    const [key, ...rest] = part.trim().split('=');
    if (key === name) return decodeURIComponent(rest.join('='));
  }
  return null;
}

export function sessionCookie(value: string, secure: boolean): string {
  const attrs = [
    `${SESSION_COOKIE}=${encodeURIComponent(value)}`,
    'Path=/',
    'HttpOnly',
    'SameSite=Lax',
    `Max-Age=${SESSION_MAX_AGE_SEC}`,
  ];
  if (secure) attrs.push('Secure');
  return attrs.join('; ');
}

async function hmacHex(secret: string, message: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(message));
  return [...new Uint8Array(sig)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

export async function createSessionToken(secret: string): Promise<string> {
  const issuedAt = Date.now();
  const sig = await hmacHex(secret, `session:${issuedAt}`);
  return `${issuedAt}.${sig}`;
}

export async function verifySessionToken(secret: string, token: string | null): Promise<boolean> {
  if (!token) return false;
  const [issuedRaw, sig] = token.split('.');
  const issuedAt = Number(issuedRaw);
  if (!issuedRaw || !sig || !Number.isFinite(issuedAt)) return false;
  if (Date.now() - issuedAt > SESSION_MAX_AGE_SEC * 1000) return false;
  const expected = await hmacHex(secret, `session:${issuedAt}`);
  return timingSafeEqual(sig, expected);
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let out = 0;
  for (let i = 0; i < a.length; i++) out |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return out === 0;
}

export function isValidPin(pin: string): boolean {
  return /^\d{6}$/.test(pin);
}

export async function storeActivePin(env: Env, pin: string): Promise<ActivePin> {
  const expiresAt = Date.now() + PIN_TTL_SEC * 1000;
  const record: ActivePin = { pin, expiresAt };
  await env.TRACKS_PINS.put(ACTIVE_PIN_KEY, JSON.stringify(record), {
    expirationTtl: PIN_TTL_SEC,
  });
  return record;
}

export async function readActivePin(env: Env): Promise<ActivePin | null> {
  const raw = await env.TRACKS_PINS.get(ACTIVE_PIN_KEY);
  if (!raw) return null;
  try {
    const record = JSON.parse(raw) as ActivePin;
    if (!record?.pin || !record?.expiresAt) return null;
    if (Date.now() > record.expiresAt) return null;
    return record;
  } catch {
    return null;
  }
}

export function authorizeRegister(request: Request, secret: string): boolean {
  const header = request.headers.get('authorization') ?? '';
  if (header.startsWith('Bearer ')) {
    return timingSafeEqual(header.slice(7), secret);
  }
  const alt = request.headers.get('x-rushtracks-secret');
  return alt != null && timingSafeEqual(alt, secret);
}
