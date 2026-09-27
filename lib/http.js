// Small helpers shared by the /api functions. Plain Node req/res only,
// so the same handlers run on Vercel and in scripts/dev-server.js.

import { isAuthenticated } from './auth.js';

const MAX_BODY = 1024 * 1024; // 1 MB is plenty for site.json

export function sendJson(res, status, data, extraHeaders = {}) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('X-Robots-Tag', 'noindex, nofollow');
  for (const [k, v] of Object.entries(extraHeaders)) res.setHeader(k, v);
  res.end(JSON.stringify(data));
}

export async function readJson(req) {
  if (req.body !== undefined && req.body !== null) {
    if (typeof req.body === 'object' && !Buffer.isBuffer(req.body)) return req.body;
    return JSON.parse(String(req.body));
  }
  const chunks = [];
  let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    if (size > MAX_BODY) throw Object.assign(new Error('Body too large'), { status: 413 });
    chunks.push(chunk);
  }
  return chunks.length ? JSON.parse(Buffer.concat(chunks).toString('utf8')) : {};
}

export function clientIp(req) {
  const fwd = req.headers['x-forwarded-for'];
  if (fwd) return String(fwd).split(',')[0].trim();
  return req.headers['x-real-ip'] || req.socket?.remoteAddress || 'unknown';
}

// Rejects cross-site POSTs (defence in depth on top of SameSite=Strict).
function sameOrigin(req) {
  const origin = req.headers.origin;
  if (!origin) return true;
  const host = req.headers['x-forwarded-host'] || req.headers.host;
  try {
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}

// Returns true when the request may proceed; otherwise sends the error.
export function guard(req, res, { method, auth = true }) {
  if (req.method !== method) {
    sendJson(res, 405, { error: 'Метод не підтримується.' }, { Allow: method });
    return false;
  }
  if (method !== 'GET' && !sameOrigin(req)) {
    sendJson(res, 403, { error: 'Запит з іншого сайту заблоковано.' });
    return false;
  }
  if (auth && !isAuthenticated(req)) {
    sendJson(res, 401, { error: 'Потрібно увійти.' });
    return false;
  }
  if (method !== 'GET' && !String(req.headers['content-type'] || '').includes('application/json')) {
    sendJson(res, 415, { error: 'Очікується JSON.' });
    return false;
  }
  return true;
}

export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
