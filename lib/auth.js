// Password hashing (scrypt) and signed session cookies (HMAC-SHA256).
// Server-only: never import this file from admin/.

import crypto from 'node:crypto';

const COOKIE = 'kbo_admin';
const SESSION_TTL_S = 7 * 24 * 60 * 60;
const SCRYPT = { N: 32768, r: 8, p: 1, keylen: 64 };

const b64url = (buf) => Buffer.from(buf).toString('base64url');

function scrypt(password, salt, { N, r, p, keylen }) {
  return new Promise((resolve, reject) => {
    crypto.scrypt(password, salt, keylen, { N, r, p, maxmem: 128 * N * r * 2 }, (err, key) =>
      err ? reject(err) : resolve(key));
  });
}

// Format: scrypt:N:r:p:<salt base64url>:<hash base64url>
export async function hashPassword(password) {
  const salt = crypto.randomBytes(16);
  const key = await scrypt(password, salt, SCRYPT);
  return ['scrypt', SCRYPT.N, SCRYPT.r, SCRYPT.p, b64url(salt), b64url(key)].join(':');
}

export async function verifyPassword(password, stored) {
  const parts = String(stored || '').trim().split(':');
  if (parts.length !== 6 || parts[0] !== 'scrypt') return false;
  const [, N, r, p, salt, hash] = parts;
  const expected = Buffer.from(hash, 'base64url');
  const key = await scrypt(String(password), Buffer.from(salt, 'base64url'),
    { N: Number(N), r: Number(r), p: Number(p), keylen: expected.length });
  return expected.length > 0 && crypto.timingSafeEqual(key, expected);
}

function config() {
  const secret = process.env.SESSION_SECRET || '';
  const hash = process.env.ADMIN_PASSWORD_HASH || '';
  if (secret.length < 32 || !hash) {
    throw new Error('ADMIN_PASSWORD_HASH / SESSION_SECRET are not configured');
  }
  return { secret, hash };
}

const sign = (data, secret) => crypto.createHmac('sha256', secret).update(data).digest('base64url');

// Changing the password invalidates all existing sessions.
const passwordVersion = (secret, hash) => sign(`pv:${hash}`, secret).slice(0, 12);

export function createSessionCookie() {
  const { secret, hash } = config();
  const payload = b64url(JSON.stringify({
    exp: Math.floor(Date.now() / 1000) + SESSION_TTL_S,
    pv: passwordVersion(secret, hash)
  }));
  const token = `${payload}.${sign(payload, secret)}`;
  return `${COOKIE}=${token}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=${SESSION_TTL_S}`;
}

export function clearSessionCookie() {
  return `${COOKIE}=; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=0`;
}

function readCookie(req, name) {
  const header = req.headers.cookie || '';
  for (const part of header.split(';')) {
    const i = part.indexOf('=');
    if (i > -1 && part.slice(0, i).trim() === name) return part.slice(i + 1).trim();
  }
  return null;
}

export function isAuthenticated(req) {
  let cfg;
  try { cfg = config(); } catch { return false; }
  const token = readCookie(req, COOKIE);
  if (!token) return false;
  const [payload, sig] = token.split('.');
  if (!payload || !sig) return false;
  const expected = Buffer.from(sign(payload, cfg.secret));
  const given = Buffer.from(sig);
  if (expected.length !== given.length || !crypto.timingSafeEqual(expected, given)) return false;
  try {
    const data = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
    return data.exp > Date.now() / 1000 && data.pv === passwordVersion(cfg.secret, cfg.hash);
  } catch {
    return false;
  }
}

// ---- Brute-force protection ----
// Serverless instances do not share memory, so this limit is per instance.
// Together with the fixed minimum delay per attempt it makes guessing slow.
const MAX_FAILS = 5;
const LOCK_MS = 15 * 60 * 1000;
const attempts = new Map();

export function loginLockedFor(ip) {
  const a = attempts.get(ip);
  if (!a || a.until <= Date.now()) return 0;
  return a.until - Date.now();
}

export function registerLoginResult(ip, success) {
  if (success) { attempts.delete(ip); return; }
  const now = Date.now();
  let a = attempts.get(ip);
  // Start a fresh count after a lock has expired or after a quiet period.
  if (!a || (a.until && a.until <= now) || now - a.last > LOCK_MS) a = { fails: 0, until: 0, last: now };
  a.fails += 1;
  a.last = now;
  if (a.fails >= MAX_FAILS) a.until = now + LOCK_MS;
  attempts.set(ip, a);
  if (attempts.size > 5000) attempts.clear();
}
