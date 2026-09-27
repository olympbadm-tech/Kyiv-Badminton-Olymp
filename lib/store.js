// Reads / writes content/site.json.
// Production: GitHub Contents API (each save is a commit → Vercel rebuilds).
// Local development only: CONTENT_STORE=local writes the file on disk.

import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

const CONTENT_PATH = 'content/site.json';

export class StoreError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

const isLocal = () => process.env.CONTENT_STORE === 'local' && !process.env.VERCEL;

export const serialize = (value) => JSON.stringify(value, null, 2) + '\n';

// ---------- GitHub ----------

function githubConfig() {
  const token = process.env.GITHUB_TOKEN;
  const repo = process.env.GITHUB_REPO;
  const branch = process.env.GITHUB_BRANCH || 'main';
  if (!token || !repo) throw new StoreError(500, 'Сервер не налаштований: немає GITHUB_TOKEN або GITHUB_REPO.');
  return { token, repo, branch };
}

async function github(method, body) {
  const { token, repo, branch } = githubConfig();
  const url = `https://api.github.com/repos/${repo}/contents/${CONTENT_PATH}` +
    (method === 'GET' ? `?ref=${encodeURIComponent(branch)}` : '');
  const res = await fetch(url, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      'User-Agent': 'kyiv-badminton-olymp-admin',
      ...(body ? { 'Content-Type': 'application/json' } : {})
    },
    body: body ? JSON.stringify({ ...body, branch }) : undefined,
    cache: 'no-store'
  });
  const data = await res.json().catch(() => ({}));
  if (res.ok) return data;
  if (res.status === 409 || (res.status === 422 && /sha/i.test(data.message || ''))) {
    throw new StoreError(409, 'conflict');
  }
  if (res.status === 401) throw new StoreError(502, 'GitHub відхилив токен (GITHUB_TOKEN недійсний або прострочений).');
  if (res.status === 403 || res.status === 404) {
    throw new StoreError(502, 'Немає доступу до репозиторію. Перевірте GITHUB_REPO і права токена (Contents: Read and write).');
  }
  throw new StoreError(502, `Помилка GitHub (${res.status}). Спробуйте ще раз.`);
}

// ---------- local file (dev only) ----------

const localFile = () => path.join(process.cwd(), CONTENT_PATH);
const gitBlobSha = (text) => {
  const buf = Buffer.from(text, 'utf8');
  return crypto.createHash('sha1').update(`blob ${buf.length}\0`).update(buf).digest('hex');
};

// ---------- public API ----------

export async function getContent() {
  if (isLocal()) {
    const text = fs.readFileSync(localFile(), 'utf8');
    return { content: JSON.parse(text), sha: gitBlobSha(text) };
  }
  const data = await github('GET');
  const text = Buffer.from(data.content || '', 'base64').toString('utf8');
  return { content: JSON.parse(text), sha: data.sha };
}

// Saves only if the file still has the given sha; otherwise throws 409.
export async function saveContent(value, sha, message) {
  const text = serialize(value);
  if (isLocal()) {
    const current = fs.readFileSync(localFile(), 'utf8');
    if (gitBlobSha(current) !== sha) throw new StoreError(409, 'conflict');
    fs.writeFileSync(localFile(), text);
    return { sha: gitBlobSha(text) };
  }
  const data = await github('PUT', {
    message,
    content: Buffer.from(text, 'utf8').toString('base64'),
    sha
  });
  return { sha: data.content.sha, commit: data.commit?.sha };
}
