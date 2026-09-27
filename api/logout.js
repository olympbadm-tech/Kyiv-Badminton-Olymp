// POST /api/logout → clears the session cookie.
import { clearSessionCookie } from '../lib/auth.js';
import { guard, sendJson } from '../lib/http.js';

export default function handler(req, res) {
  if (!guard(req, res, { method: 'POST', auth: false })) return;
  sendJson(res, 200, { ok: true }, { 'Set-Cookie': clearSessionCookie() });
}
