// POST /api/upload-token → short-lived token for a direct browser → Vercel Blob upload
// (function bodies on Vercel are limited to 4.5 MB, so files never pass through here).
import { handleUpload } from '@vercel/blob/client';
import { guard, readJson, sendJson } from '../lib/http.js';

const MB = 1024 * 1024;
const RULES = {
  image: { types: ['image/jpeg', 'image/png', 'image/webp'], max: 10 * MB },
  video: { types: ['video/mp4'], max: 100 * MB }
};
const NAME_RE = /^uploads\/[a-z0-9][a-z0-9._-]{0,100}\.(jpe?g|png|webp|mp4)$/i;

export default async function handler(req, res) {
  if (!guard(req, res, { method: 'POST' })) return;
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    return sendJson(res, 503, { error: 'Сховище файлів (Vercel Blob) ще не підключене до проєкту.' });
  }

  let body;
  try {
    body = await readJson(req);
  } catch {
    return sendJson(res, 400, { error: 'Невірний формат запиту.' });
  }
  // Only token requests are accepted; upload-completed callbacks are not used.
  if (body?.type !== 'blob.generate-client-token') {
    return sendJson(res, 400, { error: 'Невірний тип запиту.' });
  }

  try {
    const result = await handleUpload({
      body,
      request: req,
      onBeforeGenerateToken: async (pathname) => {
        const m = NAME_RE.exec(String(pathname));
        if (!m) throw new Error('Invalid file name');
        const rule = m[1].toLowerCase() === 'mp4' ? RULES.video : RULES.image;
        return { allowedContentTypes: rule.types, maximumSizeInBytes: rule.max, addRandomSuffix: true };
      }
    });
    sendJson(res, 200, result);
  } catch {
    sendJson(res, 400, { error: 'Недопустимий файл. Можна JPG, PNG, WEBP (до 10 МБ) або MP4 (до 100 МБ).' });
  }
}
