import {
  getCookie,
  SESSION_COOKIE,
  verifySessionToken,
  type Env,
} from './lib/gate';

const PUBLIC_PREFIXES = ['/gate', '/api/', '/_astro/', '/tracks.json', '/favicon.ico'];

function isPublicPath(pathname: string): boolean {
  if (PUBLIC_PREFIXES.some((p) => pathname === p || pathname.startsWith(p))) return true;
  if (pathname.endsWith('.css') || pathname.endsWith('.js') || pathname.endsWith('.woff2')) {
    return true;
  }
  return false;
}

export const onRequest: PagesFunction<Env> = async (context) => {
  const { request, env, next } = context;
  const url = new URL(request.url);

  if (isPublicPath(url.pathname)) {
    return next();
  }

  const secret = env.RUSHTRACKS_GATE_SECRET;
  if (!secret) {
    return next();
  }

  const token = getCookie(request, SESSION_COOKIE);
  if (await verifySessionToken(secret, token)) {
    return next();
  }

  const gate = new URL('/gate', url.origin);
  gate.searchParams.set('next', url.pathname + url.search);
  return Response.redirect(gate.toString(), 302);
};
