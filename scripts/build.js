// Builds the static site into dist/:
//   content/site.json + templates/index.html → dist/index.html
//   css, js, assets, site-materials          → copied as is
//   admin/                                   → dist/admin (admin.js bundled with esbuild)
// Run: npm run build

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { build as esbuild } from 'esbuild';
import { validateContent, youtubeId } from '../lib/schema.js';
import { render } from '../lib/template.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DIST = path.join(ROOT, 'dist');
const STATIC_DIRS = ['css', 'js', 'assets', 'site-materials'];

function fail(message) {
  console.error(`\n✖ Build failed: ${message}\n`);
  process.exit(1);
}

function loadContent() {
  const file = path.join(ROOT, 'content', 'site.json');
  let raw;
  try {
    raw = JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch (e) {
    fail(`content/site.json is not valid JSON (${e.message})`);
  }
  const { ok, errors, value } = validateContent(raw);
  if (!ok) {
    fail('content/site.json does not match the schema:\n' +
      errors.map((e) => `  - ${e.path}: ${e.message}`).join('\n'));
  }
  return value;
}

const paragraphs = (text) => text.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean);

function formatDate(iso) {
  const [y, m, d] = iso.split('-');
  return `${d}.${m}.${y}`;
}

// Adds the derived values the template needs (columns, paragraphs, dates…).
function toViewModel(c) {
  return {
    ...c,
    about: {
      ...c.about,
      columns: ['a', 'b']
        .map((id) => ({ id, cards: c.about.cards.filter((card) => card.column === id) }))
        .filter((col) => col.cards.length)
    },
    reviews: {
      ...c.reviews,
      items: c.reviews.items.map((r) => ({ ...r, paragraphs: paragraphs(r.text) }))
    },
    location: { ...c.location, paragraphs: paragraphs(c.location.text) },
    interesting: {
      ...c.interesting,
      cards: c.interesting.cards.map((card) => {
        const isVideo = Boolean(youtubeId(card.url));
        return {
          ...card,
          showSep: Boolean(card.type && card.date),
          dateDisplay: card.date ? formatDate(card.date) : '',
          isVideo,
          thumbAria: card.thumbLabel ||
            (isVideo ? `Дивитися відео «${card.title}» на YouTube` : `Відкрити: ${card.title}`)
        };
      })
    }
  };
}

async function main() {
  const started = Date.now();
  const content = loadContent();
  const template = fs.readFileSync(path.join(ROOT, 'templates', 'index.html'), 'utf8');
  const html = render(template, toViewModel(content));

  fs.rmSync(DIST, { recursive: true, force: true });
  fs.mkdirSync(DIST, { recursive: true });
  fs.writeFileSync(path.join(DIST, 'index.html'), html);

  for (const dir of STATIC_DIRS) {
    fs.cpSync(path.join(ROOT, dir), path.join(DIST, dir), { recursive: true });
  }
  fs.copyFileSync(path.join(ROOT, 'robots.txt'), path.join(DIST, 'robots.txt'));

  const adminOut = path.join(DIST, 'admin');
  fs.mkdirSync(adminOut, { recursive: true });
  fs.copyFileSync(path.join(ROOT, 'admin', 'index.html'), path.join(adminOut, 'index.html'));
  fs.copyFileSync(path.join(ROOT, 'admin', 'admin.css'), path.join(adminOut, 'admin.css'));
  await esbuild({
    entryPoints: [path.join(ROOT, 'admin', 'admin.js')],
    outfile: path.join(adminOut, 'admin.js'),
    bundle: true,
    format: 'iife',
    platform: 'browser',
    target: ['es2019'],
    minify: true,
    legalComments: 'none',
    logLevel: 'warning'
  });

  console.log(`✓ Built dist/ in ${Date.now() - started} ms`);
}

main().catch((e) => fail(e.stack || e.message));
