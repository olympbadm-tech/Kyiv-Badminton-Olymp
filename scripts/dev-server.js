// Local preview without a Vercel account: serves dist/ and runs the /api handlers.
// Run: npm run dev   (reads .env; with CONTENT_STORE=local saves go to content/site.json
// and the site is rebuilt automatically).

import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DIST = path.join(ROOT, 'dist');
const PORT = Number(process.env.PORT) || 3000;
const API = new Set(['login', 'logout', 'content', 'upload-token']);
const TYPES = {
  '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
  '.webp': 'image/webp', '.svg': 'image/svg+xml', '.mp4': 'video/mp4', '.txt': 'text/plain; charset=utf-8'
};

// Minimal .env loader (KEY=value per line, # comments).
const envFile = path.join(ROOT, '.env');
if (fs.existsSync(envFile)) {
  for (const line of fs.readFileSync(envFile, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/);
    if (m && !line.trim().startsWith('#') && process.env[m[1]] === undefined) {
      process.env[m[1]] = m[2].replace(/^(['"])(.*)\1$/, '$2');
    }
  }
}
process.chdir(ROOT);

function serveStatic(req, res, pathname) {
  let file = path.normalize(path.join(DIST, decodeURIComponent(pathname)));
  if (!file.startsWith(DIST)) { res.statusCode = 403; return res.end(); }
  if (fs.existsSync(file) && fs.statSync(file).isDirectory()) file = path.join(file, 'index.html');
  if (!fs.existsSync(file)) { res.statusCode = 404; return res.end('Not found'); }

  const stat = fs.statSync(file);
  const type = TYPES[path.extname(file).toLowerCase()] || 'application/octet-stream';
  const range = req.headers.range && /bytes=(\d*)-(\d*)/.exec(req.headers.range);
  res.setHeader('Content-Type', type);
  res.setHeader('Accept-Ranges', 'bytes');
  if (pathname.startsWith('/admin')) res.setHeader('X-Robots-Tag', 'noindex, nofollow');
  if (range) {
    const start = range[1] ? Number(range[1]) : 0;
    const end = range[2] ? Number(range[2]) : stat.size - 1;
    res.statusCode = 206;
    res.setHeader('Content-Range', `bytes ${start}-${end}/${stat.size}`);
    res.setHeader('Content-Length', end - start + 1);
    return fs.createReadStream(file, { start, end }).pipe(res);
  }
  res.setHeader('Content-Length', stat.size);
  fs.createReadStream(file).pipe(res);
}

http.createServer(async (req, res) => {
  const { pathname } = new URL(req.url, `http://${req.headers.host}`);
  const api = pathname.match(/^\/api\/([\w-]+)$/);
  if (!api) return serveStatic(req, res, pathname);
  if (!API.has(api[1])) { res.statusCode = 404; return res.end(); }
  try {
    const mod = await import(pathToFileURL(path.join(ROOT, 'api', `${api[1]}.js`)).href);
    await mod.default(req, res);
    if (api[1] === 'content' && req.method === 'POST' && res.statusCode === 200 &&
        process.env.CONTENT_STORE === 'local') {
      execFileSync(process.execPath, ['scripts/build.js'], { stdio: 'inherit' });
    }
  } catch (e) {
    console.error(e);
    if (!res.headersSent) { res.statusCode = 500; res.end('{"error":"dev server error"}'); }
  }
}).listen(PORT, () => {
  console.log(`Local preview: http://localhost:${PORT}   admin: http://localhost:${PORT}/admin/`);
});
