import {
  authorizeRegister,
  createSessionToken,
  isValidPin,
  jsonResponse,
  sessionCookie,
  storeActivePin,
  verifyPin,
  type Env,
} from '../lib/gate';

interface RegisterBody {
  pin?: string;
}

interface VerifyBody {
  pin?: string;
}

export const onRequestPost: PagesFunction<Env> = async (context) => {
  const { request, env } = context;
  const secret = env.RUSHTRACKS_GATE_SECRET;
  if (!secret) {
    return jsonResponse({ error: 'Gate not configured' }, 503);
  }

  let body: RegisterBody & VerifyBody = {};
  try {
    body = (await request.json()) as RegisterBody & VerifyBody;
  } catch {
    return jsonResponse({ error: 'Invalid JSON body' }, 400);
  }

  const secure = new URL(request.url).protocol === 'https:';

  if (authorizeRegister(request, secret)) {
    const pin = String(body.pin ?? '').trim();
    if (!isValidPin(pin)) {
      return jsonResponse({ error: 'PIN must be 6 digits' }, 400);
    }
    const record = await storeActivePin(env, pin);
    return jsonResponse({ ok: true, pin: record.pin, expiresAt: record.expiresAt });
  }

  const pin = String(body.pin ?? '').trim();
  if (!isValidPin(pin)) {
    return jsonResponse({ error: 'Enter the 6-digit PIN from your TV' }, 400);
  }

  if (!(await verifyPin(env, pin))) {
    return jsonResponse({ error: 'PIN expired or incorrect. Open QR on your TV again.' }, 401);
  }

  const token = await createSessionToken(secret);
  return jsonResponse(
    { ok: true, redirect: '/' },
    200,
    { 'set-cookie': sessionCookie(token, secure) },
  );
};
