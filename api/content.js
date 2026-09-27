// GET  /api/content                 → { content, sha }
// POST /api/content { content, sha } → validates and commits content/site.json
import { guard, readJson, sendJson } from '../lib/http.js';
import { changedSections, validateContent } from '../lib/schema.js';
import { getContent, saveContent, StoreError } from '../lib/store.js';

const CONFLICT = 'Контент уже змінили з іншої вкладки чи пристрою. Завантажте актуальну версію, щоб нічого не затерти.';

function fail(res, e) {
  if (e instanceof StoreError) {
    if (e.status === 409) return sendJson(res, 409, { error: CONFLICT, conflict: true });
    return sendJson(res, e.status, { error: e.message });
  }
  console.error(e);
  sendJson(res, 500, { error: 'Внутрішня помилка сервера. Спробуйте ще раз.' });
}

export default async function handler(req, res) {
  if (req.method === 'GET') {
    if (!guard(req, res, { method: 'GET' })) return;
    try {
      return sendJson(res, 200, await getContent());
    } catch (e) {
      return fail(res, e);
    }
  }

  if (!guard(req, res, { method: 'POST' })) return;
  let body;
  try {
    body = await readJson(req);
  } catch {
    return sendJson(res, 400, { error: 'Невірний формат запиту.' });
  }
  if (typeof body.sha !== 'string' || !/^[0-9a-f]{40}$/.test(body.sha)) {
    return sendJson(res, 400, { error: 'Невірний запит: немає версії файлу. Перезавантажте сторінку.' });
  }

  const { ok, errors, value } = validateContent(body.content);
  if (!ok) return sendJson(res, 400, { error: 'Є помилки в полях — виправте їх і збережіть знову.', errors });

  try {
    const current = await getContent();
    if (current.sha !== body.sha) return sendJson(res, 409, { error: CONFLICT, conflict: true });
    const changed = changedSections(current.content, value);
    if (!changed.length) return sendJson(res, 200, { sha: current.sha, unchanged: true });
    const saved = await saveContent(value, body.sha, `admin: оновлено ${changed.join(', ')}`);
    sendJson(res, 200, { sha: saved.sha, changed });
  } catch (e) {
    fail(res, e);
  }
}
