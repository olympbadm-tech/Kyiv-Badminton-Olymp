// POST /api/login  { password }  → sets the session cookie.
import { createSessionCookie, loginLockedFor, registerLoginResult, verifyPassword } from '../lib/auth.js';
import { clientIp, guard, readJson, sendJson, sleep } from '../lib/http.js';

const MIN_RESPONSE_MS = 1000; // every attempt takes at least a second

export default async function handler(req, res) {
  const started = Date.now();
  const pad = () => sleep(Math.max(0, MIN_RESPONSE_MS - (Date.now() - started)));
  if (!guard(req, res, { method: 'POST', auth: false })) return;

  if (!process.env.ADMIN_PASSWORD_HASH || (process.env.SESSION_SECRET || '').length < 32) {
    return sendJson(res, 500, { error: 'Адмінку ще не налаштовано: на сервері немає ADMIN_PASSWORD_HASH або SESSION_SECRET.' });
  }

  const ip = clientIp(req);
  const locked = loginLockedFor(ip);
  if (locked) {
    await pad();
    return sendJson(res, 429, { error: `Забагато невдалих спроб. Спробуйте через ${Math.ceil(locked / 60000)} хв.` });
  }

  let password = '';
  try {
    const body = await readJson(req);
    if (typeof body.password === 'string' && body.password.length <= 200) password = body.password;
  } catch {
    // treated as a wrong password below
  }

  const ok = password ? await verifyPassword(password, process.env.ADMIN_PASSWORD_HASH).catch(() => false) : false;
  registerLoginResult(ip, ok);
  await pad();

  if (!ok) return sendJson(res, 401, { error: 'Невірний пароль.' });
  sendJson(res, 200, { ok: true }, { 'Set-Cookie': createSessionCookie() });
}
