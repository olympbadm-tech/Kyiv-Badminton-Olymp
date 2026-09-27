// Admin panel UI. Forms are generated from lib/schema.js, so adding a field
// to the schema is enough to make it editable here.
// Bundled by scripts/build.js (esbuild) into dist/admin/admin.js.

import { upload } from '@vercel/blob/client';
import { PALETTES, SECTIONS, validateContent, youtubeId } from '../lib/schema.js';

const $ = (id) => document.getElementById(id);
const MB = 1024 * 1024;
const UPLOAD_RULES = {
  image: { accept: 'image/jpeg,image/png,image/webp', types: ['image/jpeg', 'image/png', 'image/webp'], max: 10 * MB, label: 'JPG, PNG або WEBP до 10 МБ' },
  video: { accept: 'video/mp4', types: ['video/mp4'], max: 100 * MB, label: 'MP4 до 100 МБ' }
};

const state = {
  content: null,
  sha: null,
  savedJson: '',
  section: SECTIONS[0].key,
  errors: [],
  saving: false,
  uploads: 0,
  open: new WeakSet() // expanded list items
};

// ---------- DOM helper ----------

function h(tag, attrs = {}, ...children) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs || {})) {
    if (v == null || v === false) continue;
    if (k === 'class') el.className = v;
    else if (k.startsWith('on')) el.addEventListener(k.slice(2), v);
    else if (k in el && typeof v !== 'string') el[k] = v;
    else el.setAttribute(k, v === true ? '' : v);
  }
  for (const c of children.flat()) {
    if (c == null || c === false) continue;
    el.append(c instanceof Node ? c : document.createTextNode(String(c)));
  }
  return el;
}

// ---------- API ----------

async function api(path, options = {}) {
  let res;
  try {
    res = await fetch(path, {
      credentials: 'same-origin',
      ...options,
      headers: options.body ? { 'Content-Type': 'application/json' } : {},
      body: options.body ? JSON.stringify(options.body) : undefined
    });
  } catch {
    throw Object.assign(new Error('Немає з’єднання з сервером. Перевірте інтернет і спробуйте ще раз.'), { status: 0 });
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw Object.assign(new Error(data.error || `Помилка сервера (${res.status}).`), { status: res.status, data });
  return data;
}

// ---------- screens ----------

function show(id) {
  for (const s of ['loading', 'login', 'app']) $(s).hidden = s !== id;
}

function showLogin(note) {
  if (state.content) {
    // Session expired while editing: keep the edits, show login on top.
    $('login').classList.add('screen--overlay');
    $('login').hidden = false;
  } else {
    show('login');
  }
  $('login-note').textContent = note || 'Київ Бадмінтон Олімп';
  $('login-password').value = '';
  $('login-password').focus();
}

$('login-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const btn = $('login-submit');
  const err = $('login-error');
  const password = $('login-password').value;
  if (!password) { err.textContent = 'Введіть пароль.'; err.hidden = false; return; }
  btn.disabled = true;
  btn.textContent = 'Перевіряю…';
  err.hidden = true;
  try {
    await api('/api/login', { method: 'POST', body: { password } });
    $('login').classList.remove('screen--overlay');
    if (state.content) {
      $('login').hidden = true;
      setStatus('Ви знову увійшли. Тепер можна зберегти зміни.', 'info');
    } else {
      await loadContent();
    }
  } catch (ex) {
    err.textContent = ex.message;
    err.hidden = false;
    $('login-password').select();
  } finally {
    btn.disabled = false;
    btn.textContent = 'Увійти';
  }
});

$('logout').addEventListener('click', async () => {
  if (isDirty() && !(await confirmDialog('Є незбережені зміни. Вийти без збереження?', 'Вийти'))) return;
  try { await api('/api/logout', { method: 'POST', body: {} }); } catch { /* ignore */ }
  state.content = null;
  state.savedJson = '';
  location.reload();
});

async function loadContent() {
  show('loading');
  try {
    const data = await api('/api/content');
    state.content = data.content;
    state.sha = data.sha;
    state.savedJson = JSON.stringify(data.content);
    state.errors = [];
    state.open = new WeakSet();
    show('app');
    renderNav();
    renderSection();
    setStatus('', '');
    updateSaveState();
  } catch (e) {
    if (e.status === 401) return showLogin();
    show('login');
    $('login-error').textContent = e.message;
    $('login-error').hidden = false;
  }
}

// ---------- dialogs ----------

function confirmDialog(text, okLabel = 'Так', danger = true) {
  const dialog = $('dialog');
  $('dialog-text').textContent = text;
  const actions = $('dialog-actions');
  actions.replaceChildren(
    h('button', { class: 'btn btn--ghost', value: 'cancel' }, 'Скасувати'),
    h('button', { class: `btn ${danger ? 'btn--danger' : 'btn--primary'}`, value: 'ok' }, okLabel)
  );
  return new Promise((resolve) => {
    dialog.addEventListener('close', () => resolve(dialog.returnValue === 'ok'), { once: true });
    dialog.returnValue = '';
    dialog.showModal();
  });
}

// ---------- dirty state / status ----------

const isDirty = () => state.content && JSON.stringify(state.content) !== state.savedJson;

function setStatus(text, kind) {
  const el = $('save-status');
  el.textContent = text;
  el.className = `savebar-status${kind ? ` savebar-status--${kind}` : ''}`;
}

function updateSaveState() {
  const dirty = isDirty();
  const btn = $('save');
  btn.disabled = state.saving || state.uploads > 0 || !dirty;
  btn.textContent = state.saving ? 'Зберігаю…' : 'Зберегти';
  const status = $('save-status');
  if (state.uploads > 0) {
    setStatus('Зачекайте, файл ще завантажується…', 'info');
    status.dataset.upload = '1';
    return;
  }
  if (status.dataset.upload) {
    delete status.dataset.upload;
    setStatus('', '');
  }
  if (dirty && !state.saving) {
    const cur = $('save-status');
    if (!cur.classList.contains('savebar-status--error')) setStatus('Є незбережені зміни', 'dirty');
  } else if (!dirty && $('save-status').classList.contains('savebar-status--dirty')) {
    setStatus('', '');
  }
}

function changed() {
  updateSaveState();
}

window.addEventListener('beforeunload', (e) => {
  if (isDirty()) { e.preventDefault(); e.returnValue = ''; }
});

// ---------- navigation ----------

function sectionErrorCount(key) {
  return state.errors.filter((e) => e.path.split('.')[0] === key).length;
}

function renderNav() {
  const list = $('section-list');
  const select = $('section-select');
  list.replaceChildren(...SECTIONS.map((s) => {
    const n = sectionErrorCount(s.key);
    return h('li', {},
      h('button', {
        type: 'button',
        class: `sidenav-link${s.key === state.section ? ' is-active' : ''}`,
        'aria-current': s.key === state.section ? 'page' : null,
        onclick: () => goTo(s.key)
      }, s.title, n ? h('span', { class: 'badge', title: 'Помилок у розділі' }, String(n)) : null));
  }));
  select.replaceChildren(...SECTIONS.map((s) => {
    const n = sectionErrorCount(s.key);
    return h('option', { value: s.key, selected: s.key === state.section }, s.title + (n ? ` (помилок: ${n})` : ''));
  }));
}

$('section-select').addEventListener('change', (e) => goTo(e.target.value));

function goTo(key, focusPath) {
  state.section = key;
  renderNav();
  renderSection();
  if (focusPath) {
    const el = document.querySelector(`[data-path="${CSS.escape(focusPath)}"]`);
    if (el) {
      el.closest('details')?.setAttribute('open', '');
      el.scrollIntoView({ block: 'center', behavior: 'smooth' });
      el.querySelector('input, textarea, select')?.focus({ preventScroll: true });
      return;
    }
  }
  $('main').scrollTo({ top: 0 });
  window.scrollTo({ top: 0 });
}

// ---------- section rendering ----------

function renderSection() {
  const section = SECTIONS.find((s) => s.key === state.section);
  const data = state.content[section.key];
  $('section').replaceChildren(
    h('h1', { class: 'section-heading' }, section.title),
    ...section.fields.map((f) => renderField(f, data, `${section.key}.${f.key}`))
  );
  applyErrors();
}

// Re-render after add / remove / reorder, keeping the scroll position.
function rerender() {
  const y = window.scrollY;
  const mainY = $('main').scrollTop;
  renderSection();
  window.scrollTo({ top: y });
  $('main').scrollTop = mainY;
  changed();
}

function applyErrors() {
  document.querySelectorAll('.field.has-error').forEach((el) => el.classList.remove('has-error'));
  document.querySelectorAll('.field-error').forEach((el) => el.remove());
  for (const e of state.errors) {
    const el = document.querySelector(`[data-path="${CSS.escape(e.path)}"]`);
    if (!el) continue;
    el.classList.add('has-error');
    el.append(h('p', { class: 'field-error' }, e.message));
  }
}

function clearFieldError(path) {
  const before = state.errors.length;
  state.errors = state.errors.filter((e) => e.path !== path);
  if (state.errors.length !== before) {
    const el = document.querySelector(`[data-path="${CSS.escape(path)}"]`);
    el?.classList.remove('has-error');
    el?.querySelector('.field-error')?.remove();
    renderNav();
    renderErrorsPanel();
  }
}

function fieldWrap(field, path, ...children) {
  return h('div', { class: 'field', 'data-path': path },
    h('label', { class: 'field-label', for: `f-${path}` }, field.label, field.required ? h('span', { class: 'req', title: 'Обов’язкове поле' }, ' *') : null),
    ...children,
    field.hint ? h('p', { class: 'field-hint' }, field.hint) : null);
}

function counter(field, input) {
  if (!field.max) return null;
  const el = h('span', { class: 'counter' });
  const update = () => {
    el.textContent = `${input.value.length}/${field.max}`;
    el.classList.toggle('is-over', input.value.length > field.max);
  };
  input.addEventListener('input', update);
  update();
  return el;
}

function bindInput(input, obj, key, path, transform = (v) => v) {
  input.addEventListener('input', () => {
    obj[key] = transform(input.value);
    clearFieldError(path);
    changed();
  });
}

function renderField(field, obj, path) {
  const id = `f-${path}`;
  switch (field.type) {
    case 'text': {
      const listId = field.suggestions ? `${id}-list` : null;
      const input = h('input', { class: 'input', type: 'text', id, value: obj[field.key] ?? '', list: listId, autocomplete: 'off' });
      bindInput(input, obj, field.key, path, (v) => v.replace(/[\r\n]+/g, ' '));
      return fieldWrap(field, path,
        h('div', { class: 'input-row' }, input, counter(field, input)),
        listId ? h('datalist', { id: listId }, field.suggestions.map((s) => h('option', { value: s }))) : null);
    }
    case 'textarea': {
      const input = h('textarea', { class: 'input textarea', id, rows: 3 });
      input.value = obj[field.key] ?? '';
      const grow = () => { input.style.height = 'auto'; input.style.height = `${input.scrollHeight + 2}px`; };
      input.addEventListener('input', grow);
      requestAnimationFrame(grow);
      bindInput(input, obj, field.key, path);
      return fieldWrap(field, path, input, h('div', { class: 'input-meta' }, counter(field, input)));
    }
    case 'url': {
      const input = h('input', { class: 'input', type: 'url', inputmode: 'url', id, value: obj[field.key] ?? '', placeholder: 'https://', autocomplete: 'off', spellcheck: 'false' });
      bindInput(input, obj, field.key, path, (v) => v.trim());
      const open = h('a', { class: 'btn btn--ghost btn--small', target: '_blank', rel: 'noopener', title: 'Відкрити посилання в новій вкладці' }, 'Перевірити ↗');
      const sync = () => { open.href = /^https?:\/\//.test(input.value) ? input.value : '#'; };
      input.addEventListener('input', sync);
      sync();
      return fieldWrap(field, path, h('div', { class: 'input-row' }, input, open));
    }
    case 'date': {
      const input = h('input', { class: 'input input--date', type: 'date', id, value: obj[field.key] ?? '' });
      bindInput(input, obj, field.key, path);
      const clear = h('button', {
        type: 'button', class: 'btn btn--ghost btn--small',
        onclick: () => { input.value = ''; obj[field.key] = ''; clearFieldError(path); changed(); }
      }, 'Без дати');
      return fieldWrap(field, path, h('div', { class: 'input-row' }, input, clear));
    }
    case 'select': {
      const select = h('select', { class: 'input', id },
        field.options.map((o) => h('option', { value: o.value, selected: obj[field.key] === o.value }, o.label)));
      select.addEventListener('change', () => { obj[field.key] = select.value; clearFieldError(path); changed(); });
      return fieldWrap(field, path, select);
    }
    case 'color': {
      const name = `c-${path}`;
      const group = h('div', { class: 'swatches', role: 'radiogroup', id },
        PALETTES[field.palette].map((c) => h('label', { class: 'swatch' },
          h('input', {
            type: 'radio', name, value: c.value, checked: obj[field.key] === c.value,
            onchange: () => { obj[field.key] = c.value; clearFieldError(path); changed(); }
          }),
          h('span', { class: `swatch-chip swatch-chip--${c.swatch.startsWith('#') ? 'solid' : c.swatch}`, style: c.swatch.startsWith('#') ? `background:${c.swatch}` : null }),
          h('span', { class: 'swatch-label' }, c.label))));
      return fieldWrap(field, path, group);
    }
    case 'media':
      return renderMedia(field, obj, path);
    case 'stringList':
      return renderStringList(field, obj, path);
    case 'list':
      return renderList(field, obj, path);
    default:
      return h('p', {}, `Невідомий тип поля: ${field.type}`);
  }
}

// ---------- media ----------

const mediaSrc = (v) => (/^https?:\/\//.test(v) ? v : `/${v}`);

function renderMedia(field, obj, path) {
  const rule = UPLOAD_RULES[field.kind];
  const preview = h('div', { class: `media-preview media-preview--${field.kind}` });
  const input = h('input', { class: 'input', type: 'text', id: `f-${path}`, value: obj[field.key] ?? '', spellcheck: 'false', placeholder: field.kind === 'video' ? 'Файл ще не вибрано' : 'Картинку ще не вибрано' });
  const progress = h('div', { class: 'progress', hidden: true }, h('div', { class: 'progress-bar' }));
  const status = h('p', { class: 'field-hint upload-status', hidden: true });

  const drawPreview = () => {
    const v = obj[field.key];
    if (!v) { preview.replaceChildren(h('span', { class: 'media-empty' }, 'Немає файлу')); return; }
    preview.replaceChildren(field.kind === 'video'
      ? h('video', { src: mediaSrc(v), preload: 'metadata', muted: true, playsinline: true, controls: true })
      : h('img', { src: mediaSrc(v), alt: 'Попередній перегляд', loading: 'lazy', onerror: (e) => { e.target.replaceWith(h('span', { class: 'media-empty' }, 'Не вдалося показати картинку')); } }));
  };

  input.addEventListener('change', drawPreview);
  bindInput(input, obj, field.key, path, (v) => v.trim());

  const fileInput = h('input', { type: 'file', accept: rule.accept, hidden: true });
  fileInput.addEventListener('change', async () => {
    const file = fileInput.files[0];
    fileInput.value = '';
    if (!file) return;
    status.hidden = false;
    status.classList.remove('is-error');
    if (!rule.types.includes(file.type)) {
      status.textContent = `Цей тип файлу не підходить. Потрібно: ${rule.label}.`;
      status.classList.add('is-error');
      return;
    }
    if (file.size > rule.max) {
      status.textContent = `Файл завеликий (${(file.size / MB).toFixed(1)} МБ). Максимум: ${rule.label}.`;
      status.classList.add('is-error');
      return;
    }
    await doUpload(file, field.kind, { progress, status, uploadBtn }, (url) => {
      obj[field.key] = url;
      input.value = url;
      clearFieldError(path);
      drawPreview();
      changed();
    });
  });

  const uploadBtn = h('button', { type: 'button', class: 'btn btn--primary btn--small', onclick: () => fileInput.click() },
    field.kind === 'video' ? 'Завантажити відео' : 'Завантажити картинку');

  const buttons = [uploadBtn];
  if (field.allowYoutube && field.youtubeFrom) {
    buttons.push(h('button', {
      type: 'button', class: 'btn btn--ghost btn--small',
      onclick: () => {
        const id = youtubeId(obj[field.youtubeFrom]);
        status.hidden = false;
        if (!id) {
          status.textContent = 'У полі «Посилання на матеріал» немає посилання на YouTube.';
          status.classList.add('is-error');
          return;
        }
        status.classList.remove('is-error');
        status.textContent = 'Превʼю взято з YouTube.';
        obj[field.key] = `https://i.ytimg.com/vi/${id}/hqdefault.jpg`;
        input.value = obj[field.key];
        clearFieldError(path);
        drawPreview();
        changed();
      }
    }, 'Взяти превʼю з YouTube'));
  }
  if (!field.required) {
    buttons.push(h('button', {
      type: 'button', class: 'btn btn--ghost btn--small',
      onclick: () => { obj[field.key] = ''; input.value = ''; drawPreview(); clearFieldError(path); changed(); }
    }, 'Прибрати'));
  }

  drawPreview();
  return fieldWrap(field, path,
    h('div', { class: 'media' }, preview,
      h('div', { class: 'media-controls' },
        h('div', { class: 'btn-row' }, buttons, fileInput),
        progress, status,
        h('details', { class: 'media-path' }, h('summary', {}, 'Шлях до файлу'), input))));
}

function uploadName(file, kind) {
  const ext = (file.name.match(/\.(jpe?g|png|webp|mp4)$/i)?.[1] || (kind === 'video' ? 'mp4' : 'jpg')).toLowerCase();
  const base = file.name.replace(/\.[^.]+$/, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40);
  const date = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  return `uploads/${kind}-${date}${base ? `-${base}` : ''}.${ext}`;
}

async function doUpload(file, kind, ui, onDone) {
  const bar = ui.progress.firstChild;
  state.uploads++;
  updateSaveState();
  ui.uploadBtn.disabled = true;
  ui.progress.hidden = false;
  bar.style.width = '0%';
  ui.status.textContent = 'Завантаження… 0%';
  try {
    const blob = await upload(uploadName(file, kind), file, {
      access: 'public',
      handleUploadUrl: '/api/upload-token',
      contentType: file.type,
      multipart: file.size > 8 * MB,
      onUploadProgress: ({ percentage }) => {
        bar.style.width = `${percentage}%`;
        ui.status.textContent = `Завантаження… ${Math.round(percentage)}%`;
      }
    });
    ui.status.textContent = 'Файл завантажено. Не забудьте натиснути «Зберегти».';
    onDone(blob.url);
  } catch (e) {
    const msg = String(e?.message || '');
    ui.status.classList.add('is-error');
    if (/401|увійти/i.test(msg)) {
      ui.status.textContent = 'Сесія закінчилась. Увійдіть знову і повторіть завантаження.';
      showLogin('Сесія закінчилась — увійдіть знову. Ваші зміни не втрачено.');
    } else if (/503|не підключене/i.test(msg)) {
      ui.status.textContent = 'Сховище файлів ще не підключене на сервері (Vercel Blob).';
    } else {
      ui.status.textContent = `Не вдалося завантажити файл. ${msg ? `(${msg})` : 'Спробуйте ще раз.'}`;
    }
  } finally {
    state.uploads--;
    ui.uploadBtn.disabled = false;
    ui.progress.hidden = true;
    updateSaveState();
  }
}

// ---------- lists ----------

function moveItem(arr, from, to, path) {
  if (to < 0 || to >= arr.length) return;
  const [item] = arr.splice(from, 1);
  arr.splice(to, 0, item);
  shiftErrors(path, (i) => (i === from ? to : i === to ? from : i));
}

// Keep error markers attached to the right items after reordering / deleting.
function shiftErrors(listPath, mapIndex) {
  const prefix = `${listPath}.`;
  state.errors = state.errors.flatMap((e) => {
    if (!e.path.startsWith(prefix)) return [e];
    const [idx, ...rest] = e.path.slice(prefix.length).split('.');
    const next = mapIndex(Number(idx));
    return next == null ? [] : [{ ...e, path: [listPath, next, ...rest].join('.') }];
  });
  renderNav();
  renderErrorsPanel();
}

function itemActions(arr, i, path, label, onDelete) {
  const stop = (fn) => (e) => { e.preventDefault(); e.stopPropagation(); fn(); };
  return h('div', { class: 'item-actions' },
    h('button', { type: 'button', class: 'icon-btn', title: 'Перемістити вище', 'aria-label': `Перемістити вище: ${label}`, disabled: i === 0, onclick: stop(() => { moveItem(arr, i, i - 1, path); rerender(); }) }, '↑'),
    h('button', { type: 'button', class: 'icon-btn', title: 'Перемістити нижче', 'aria-label': `Перемістити нижче: ${label}`, disabled: i === arr.length - 1, onclick: stop(() => { moveItem(arr, i, i + 1, path); rerender(); }) }, '↓'),
    h('button', { type: 'button', class: 'icon-btn icon-btn--danger', title: 'Видалити', 'aria-label': `Видалити: ${label}`, onclick: stop(onDelete) }, '✕'));
}

function deleteAt(arr, i, path) {
  arr.splice(i, 1);
  shiftErrors(path, (idx) => (idx === i ? null : idx > i ? idx - 1 : idx));
  rerender();
}

function renderStringList(field, obj, path) {
  const arr = obj[field.key];
  const rows = arr.map((value, i) => {
    const p = `${path}.${i}`;
    const input = h('input', { class: 'input', type: 'text', value, 'aria-label': `${field.itemLabel} ${i + 1}` });
    input.addEventListener('input', () => { arr[i] = input.value.replace(/[\r\n]+/g, ' '); clearFieldError(p); changed(); });
    return h('div', { class: 'field string-row', 'data-path': p },
      h('div', { class: 'input-row' },
        h('span', { class: 'row-num' }, `${i + 1}.`),
        input,
        itemActions(arr, i, path, value || `${field.itemLabel} ${i + 1}`, async () => {
          if (await confirmDialog(`Видалити пункт «${value || i + 1}»?`, 'Видалити')) deleteAt(arr, i, path);
        })));
  });
  return h('div', { class: 'field list-field', 'data-path': path },
    h('p', { class: 'field-label' }, field.label),
    field.hint ? h('p', { class: 'field-hint' }, field.hint) : null,
    h('div', { class: 'string-list' }, rows),
    h('button', {
      type: 'button', class: 'btn btn--add', disabled: field.max && arr.length >= field.max,
      onclick: () => {
        arr.push('');
        rerender();
        const inputs = document.querySelectorAll('.string-row input');
        inputs[inputs.length - 1]?.focus();
      }
    }, `+ Додати ${field.itemLabel.toLowerCase()}`));
}

function newItem(field) {
  const item = {};
  for (const f of field.fields) {
    if (f.type === 'color') item[f.key] = PALETTES[f.palette][0].value;
    else if (f.type === 'select') item[f.key] = f.options[f.options.length - 1].value;
    else item[f.key] = '';
  }
  return item;
}

function renderList(field, obj, path) {
  const arr = obj[field.key];
  const items = arr.map((item, i) => {
    const p = `${path}.${i}`;
    const summaryText = () => (item[field.summary] || '').trim() || '(без назви)';
    const title = h('span', { class: 'item-title' }, summaryText());
    const details = h('details', { class: 'item', open: state.open.has(item) },
      h('summary', { class: 'item-summary' },
        h('span', { class: 'item-num' }, `${field.itemLabel} ${i + 1}`),
        title,
        itemActions(arr, i, path, summaryText(), async () => {
          if (await confirmDialog(`Видалити «${summaryText()}»? Це можна скасувати, лише не зберігаючи зміни.`, 'Видалити')) deleteAt(arr, i, path);
        })),
      h('div', { class: 'item-body' }, field.fields.map((f) => renderField(f, item, `${p}.${f.key}`))));
    details.addEventListener('toggle', () => { if (details.open) state.open.add(item); else state.open.delete(item); });
    details.addEventListener('input', () => { title.textContent = summaryText(); });
    return details;
  });
  return h('div', { class: 'field list-field', 'data-path': path },
    h('p', { class: 'field-label' }, field.label, h('span', { class: 'muted' }, ` · ${arr.length}`)),
    field.hint ? h('p', { class: 'field-hint' }, field.hint) : null,
    h('div', { class: 'items' }, items),
    h('button', {
      type: 'button', class: 'btn btn--add', disabled: field.max && arr.length >= field.max,
      onclick: () => {
        const item = newItem(field);
        arr.push(item);
        state.open.add(item);
        rerender();
        const all = document.querySelectorAll(`[data-path="${CSS.escape(path)}"] .item`);
        const last = all[all.length - 1];
        last?.scrollIntoView({ block: 'center', behavior: 'smooth' });
        last?.querySelector('input, textarea')?.focus({ preventScroll: true });
      }
    }, `+ Додати ${field.itemLabel.toLowerCase()}`));
}

// ---------- errors panel ----------

function sectionTitle(key) {
  return SECTIONS.find((s) => s.key === key)?.title || key;
}

function describe(path) {
  const parts = path.split('.');
  const section = SECTIONS.find((s) => s.key === parts[0]);
  let fields = section?.fields || [];
  const out = [section?.title || parts[0]];
  for (let i = 1; i < parts.length; i++) {
    const f = fields.find((x) => x.key === parts[i]);
    if (f) {
      out.push(f.label);
      if (f.type === 'list' && parts[i + 1] != null) { out.push(`${f.itemLabel} ${Number(parts[i + 1]) + 1}`); i++; fields = f.fields; }
      else if (f.type === 'stringList' && parts[i + 1] != null) { out.push(`${f.itemLabel} ${Number(parts[i + 1]) + 1}`); i++; }
    }
  }
  return out;
}

function renderErrorsPanel() {
  const panel = $('errors-panel');
  if (!state.errors.length) { panel.hidden = true; return; }
  panel.hidden = false;
  panel.replaceChildren(...[
    h('p', { class: 'errors-title' }, `Не збережено: виправте ${state.errors.length === 1 ? 'помилку' : `помилки (${state.errors.length})`}.`),
    h('ul', {}, state.errors.slice(0, 12).map((e) => {
      const where = describe(e.path);
      return h('li', {}, h('button', { type: 'button', class: 'link-btn', onclick: () => goTo(e.path.split('.')[0], e.path) },
        `${where.join(' → ')}: ${e.message}`));
    })),
    state.errors.length > 12 ? h('p', { class: 'muted' }, `…та ще ${state.errors.length - 12}`) : null
  ].filter(Boolean));
}

// ---------- save ----------

async function save() {
  if (state.saving || !isDirty()) return;
  const { ok, errors } = validateContent(state.content);
  state.errors = errors;
  renderNav();
  applyErrors();
  renderErrorsPanel();
  if (!ok) {
    setStatus('Не збережено — є помилки в полях.', 'error');
    const first = errors[0];
    goTo(first.path.split('.')[0], first.path);
    return;
  }

  state.saving = true;
  updateSaveState();
  setStatus('Зберігаю…', 'info');
  const snapshot = JSON.stringify(state.content);
  try {
    const res = await api('/api/content', { method: 'POST', body: { content: state.content, sha: state.sha } });
    state.sha = res.sha;
    state.savedJson = snapshot;
    setStatus(res.unchanged ? 'Змін немає — зберігати нічого.' : 'Збережено. Сайт оновиться приблизно за 1–2 хвилини.', 'ok');
  } catch (e) {
    if (e.status === 401) {
      setStatus('Сесія закінчилась. Увійдіть знову — зміни не втрачено.', 'error');
      showLogin('Сесія закінчилась — увійдіть знову. Ваші зміни не втрачено.');
    } else if (e.status === 409) {
      setStatus(e.message, 'error');
      conflict(e.message);
    } else if (e.status === 400 && e.data?.errors) {
      state.errors = e.data.errors;
      renderNav();
      applyErrors();
      renderErrorsPanel();
      setStatus(e.message, 'error');
    } else {
      setStatus(`Не збережено. ${e.message}`, 'error');
    }
  } finally {
    state.saving = false;
    updateSaveState();
  }
}

async function conflict(message) {
  const reload = await confirmDialog(
    `${message}\n\nЯкщо завантажити актуальну версію, ваші незбережені зміни в цій вкладці буде втрачено. Можна спершу переписати їх собі.`,
    'Завантажити актуальну версію');
  if (reload) {
    state.savedJson = JSON.stringify(state.content); // suppress the leave warning
    await loadContent();
    setStatus('Завантажено актуальну версію.', 'info');
  }
}

$('save').addEventListener('click', save);
document.addEventListener('keydown', (e) => {
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's' && state.content) {
    e.preventDefault();
    save();
  }
});

loadContent();
