// Content schema for content/site.json.
// Shared by the build script, the /api functions (server-side validation)
// and the admin UI (form generation + client-side validation).
// Must stay free of Node-only imports: it is bundled into the browser.

// Colour variants that already exist in css/style.css. Do not add new ones
// here without adding the matching CSS (see OLIMP-DESIGN-SYSTEM.md).
export const PALETTES = {
  about: [
    { value: 'navy', label: 'Темно-синій', swatch: '#0e1f6e' },
    { value: 'blue', label: 'Синій', swatch: '#1c3fd6' },
    { value: 'lime', label: 'Лаймовий', swatch: '#d9f28c' },
    { value: 'yellow', label: 'Жовтий', swatch: '#ffd23f' },
    { value: 'glass', label: 'Скляний (прозорий)', swatch: 'glass' }
  ],
  schedule: [
    { value: 'blue', label: 'Синій', swatch: '#1c3fd6' },
    { value: 'lime', label: 'Лаймовий', swatch: '#d9f28c' },
    { value: 'yellow', label: 'Жовтий', swatch: '#ffd23f' },
    { value: 'outline', label: 'Білий з синьою рамкою', swatch: 'outline' }
  ],
  reviews: [
    { value: 'navy', label: 'Темно-синій', swatch: '#0e1f6e' },
    { value: 'lime', label: 'Лаймовий', swatch: '#d2ee78' },
    { value: 'blue', label: 'Синій', swatch: '#1c3fd6' },
    { value: 'green', label: 'Темно-зелений', swatch: '#13360e' }
  ],
  interesting: [
    { value: 'navy', label: 'Темно-синій', swatch: '#0e1f6e' },
    { value: 'lime', label: 'Лаймовий', swatch: '#d9f28c' },
    { value: 'yellow', label: 'Жовтий', swatch: '#ffd23f' },
    { value: 'blue', label: 'Синій', swatch: '#1c3fd6' }
  ]
};

export const INTERESTING_TYPES = ['Турнір', 'Рекорд', 'Відео', 'Історія'];

const kicker = { key: 'kicker', label: 'Надпис над заголовком', type: 'text', max: 60, hint: 'Короткий підпис, напр. «03 — Розклад».' };
const title = { key: 'title', label: 'Заголовок', type: 'text', max: 120, required: true };
const lead = { key: 'lead', label: 'Вступний текст', type: 'textarea', max: 400 };

export const SECTIONS = [
  {
    key: 'general', title: 'Загальне', commitName: 'загальні налаштування',
    fields: [
      { key: 'seoTitle', label: 'Назва сторінки для Google (title)', type: 'text', max: 120, required: true, hint: 'Показується у вкладці браузера та в результатах пошуку.' },
      { key: 'seoDescription', label: 'Опис для Google (description)', type: 'textarea', max: 300, required: true, hint: 'Бажано 120–160 символів.' },
      { key: 'signupUrl', label: 'Посилання «Записатися» (Telegram)', type: 'url', required: true, hint: 'Одне посилання для всіх кнопок запису на сайті: меню, головний екран, розклад, фінальний блок і футер.' }
    ]
  },
  {
    key: 'hero', title: 'Головний екран', commitName: 'головний екран',
    fields: [
      { key: 'title', label: 'Заголовок (жовта плашка)', type: 'text', max: 60, required: true },
      { key: 'subtitle', label: 'Підзаголовок (синя плашка)', type: 'text', max: 60 },
      { key: 'slogan', label: 'Слоган', type: 'text', max: 140 },
      { key: 'primaryButton', label: 'Текст жовтої кнопки (запис)', type: 'text', max: 40, required: true },
      { key: 'secondaryButton', label: 'Текст прозорої кнопки (розклад)', type: 'text', max: 40, required: true }
    ]
  },
  {
    key: 'opportunities', title: 'Бігуча стрічка', commitName: 'бігучу стрічку',
    fields: [
      { key: 'items', label: 'Пункти стрічки', type: 'stringList', itemLabel: 'Пункт', min: 1, max: 20, itemMax: 60, hint: 'Стрічка автоматично повторюється по колу — додавати дублікати не потрібно.' }
    ]
  },
  {
    key: 'about', title: 'Про клуб', commitName: 'розділ «Про клуб»',
    fields: [
      kicker, title, lead,
      {
        key: 'cards', label: 'Картки', type: 'list', itemLabel: 'Картка', summary: 'label', min: 1, max: 8,
        hint: 'Картка без числа стає широкою плашкою. На комп’ютері картки розкладені у дві колонки з легким нахилом (нахил є у перших двох карток лівої колонки та перших трьох правої).',
        fields: [
          { key: 'column', label: 'Колонка', type: 'select', required: true, options: [{ value: 'a', label: 'Ліва' }, { value: 'b', label: 'Права' }] },
          { key: 'number', label: 'Число (необов’язково)', type: 'text', max: 12 },
          { key: 'label', label: 'Підпис', type: 'text', max: 60, required: true },
          { key: 'color', label: 'Колір', type: 'color', palette: 'about', required: true }
        ]
      }
    ]
  },
  {
    key: 'schedule', title: 'Розклад', commitName: 'розклад',
    fields: [
      kicker, title, lead,
      { key: 'ctaText', label: 'Текст кнопки під розкладом', type: 'text', max: 40, required: true },
      {
        key: 'cards', label: 'Дні тренувань', type: 'list', itemLabel: 'День', summary: 'day', min: 1, max: 8,
        hint: 'Легкий нахил на комп’ютері мають перші 5 карток.',
        fields: [
          { key: 'day', label: 'День тижня', type: 'text', max: 30, required: true },
          { key: 'place', label: 'Місце', type: 'text', max: 40 },
          { key: 'name', label: 'Назва тренування', type: 'text', max: 60, required: true },
          { key: 'time', label: 'Час', type: 'text', max: 30, required: true, hint: 'Напр. 19:00–21:30' },
          { key: 'color', label: 'Колір', type: 'color', palette: 'schedule', required: true }
        ]
      }
    ]
  },
  {
    key: 'videos', title: 'Відеоблог', commitName: 'відеоблог',
    fields: [
      kicker, title, lead,
      {
        key: 'items', label: 'Відео', type: 'list', itemLabel: 'Відео', summary: 'caption', min: 1, max: 30,
        hint: 'Відео — файл MP4 (вертикальний, як у наявних), постер — картинка, яку видно до натискання «play».',
        fields: [
          { key: 'src', label: 'Відеофайл (MP4)', type: 'media', kind: 'video', required: true },
          { key: 'poster', label: 'Постер (JPG, PNG або WEBP)', type: 'media', kind: 'image', required: true },
          { key: 'caption', label: 'Підпис', type: 'text', max: 80, required: true }
        ]
      }
    ]
  },
  {
    key: 'reviews', title: 'Відгуки', commitName: 'відгуки',
    fields: [
      kicker, title, lead,
      {
        key: 'items', label: 'Відгуки', type: 'list', itemLabel: 'Відгук', summary: 'author', min: 1, max: 8,
        hint: 'Увага: колір картки також задає її місце в «розкиданій» композиції на комп’ютері. Найкраще виглядає, коли кожен колір використано один раз.',
        fields: [
          { key: 'text', label: 'Текст відгуку', type: 'textarea', max: 1200, required: true, hint: 'Порожній рядок розділяє абзаци.' },
          { key: 'author', label: 'Автор', type: 'text', max: 60, required: true },
          { key: 'color', label: 'Колір', type: 'color', palette: 'reviews', required: true }
        ]
      }
    ]
  },
  {
    key: 'location', title: 'Локація', commitName: 'локацію',
    fields: [
      kicker, title,
      { key: 'text', label: 'Текст', type: 'textarea', max: 600, required: true },
      {
        key: 'links', label: 'Кнопки-посилання на карти', type: 'list', itemLabel: 'Кнопка', summary: 'label', min: 1, max: 3,
        fields: [
          { key: 'label', label: 'Текст кнопки', type: 'text', max: 40, required: true },
          { key: 'url', label: 'Посилання', type: 'url', required: true }
        ]
      }
    ]
  },
  {
    key: 'interesting', title: 'Цікаве', commitName: 'розділ «Цікаве»',
    fields: [
      kicker, title, lead,
      {
        key: 'cards', label: 'Картки', type: 'list', itemLabel: 'Картка', summary: 'title', min: 1, max: 12,
        hint: 'Легкий нахил на комп’ютері мають перші 4 картки.',
        fields: [
          { key: 'type', label: 'Тип матеріалу', type: 'text', max: 30, suggestions: INTERESTING_TYPES, hint: 'Турнір, Рекорд, Відео, Історія або свій варіант.' },
          { key: 'date', label: 'Дата (необов’язково)', type: 'date' },
          { key: 'source', label: 'Джерело', type: 'text', max: 60 },
          { key: 'title', label: 'Заголовок', type: 'text', max: 140, required: true },
          { key: 'text', label: 'Текст', type: 'textarea', max: 600, required: true },
          { key: 'url', label: 'Посилання на матеріал', type: 'url', required: true },
          { key: 'linkText', label: 'Текст посилання', type: 'text', max: 40, required: true, hint: 'Напр. «Читати повністю →»' },
          { key: 'thumb', label: 'Обкладинка (необов’язково)', type: 'media', kind: 'image', allowYoutube: true, youtubeFrom: 'url', hint: 'Для відео з YouTube натисніть «Взяти превʼю з YouTube».' },
          { key: 'thumbLabel', label: 'Підпис обкладинки для незрячих (необов’язково)', type: 'text', max: 140, hint: 'Якщо порожньо — підпис складеться із заголовка картки.' },
          { key: 'color', label: 'Колір', type: 'color', palette: 'interesting', required: true }
        ]
      }
    ]
  },
  {
    key: 'cta', title: 'Фінальний заклик', commitName: 'фінальний заклик',
    fields: [
      { key: 'eyebrow', label: 'Надпис над заголовком', type: 'text', max: 60, hint: 'Коротка англійська фраза як декоративний акцент.' },
      { key: 'title', label: 'Заголовок', type: 'text', max: 80, required: true },
      { key: 'buttonText', label: 'Текст кнопки', type: 'text', max: 40, required: true }
    ]
  },
  {
    key: 'footer', title: 'Футер', commitName: 'футер',
    fields: [
      { key: 'instagram', label: 'Instagram', type: 'url', required: true },
      { key: 'facebook', label: 'Facebook', type: 'url', required: true },
      { key: 'note', label: 'Нижній підпис', type: 'text', max: 120 }
    ]
  }
];

// ---------- URL / path rules ----------

const LINK_RE = /^(https?:\/\/[^\s<>"]+|#[A-Za-z][\w-]*)$/;
const LOCAL_MEDIA_RE = /^(assets|site-materials)\/(?!.*\.\.)[\w\-./ ]+\.(jpe?g|png|webp|mp4)$/i;
const BLOB_RE = /^https:\/\/[a-z0-9]+\.public\.blob\.vercel-storage\.com\/[\w\-./%]+$/i;
const YT_THUMB_RE = /^https:\/\/i\.ytimg\.com\/vi\/[\w-]{6,20}\/[\w]+\.jpg$/;
const DATE_RE = /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/;
const EXT = { image: /\.(jpe?g|png|webp)$/i, video: /\.mp4$/i };

export function isSafeLink(v) { return typeof v === 'string' && LINK_RE.test(v); }

export function isSafeMedia(v, kind, allowYoutube) {
  if (typeof v !== 'string') return false;
  if (allowYoutube && YT_THUMB_RE.test(v)) return true;
  const path = v.split('?')[0];
  if (!(LOCAL_MEDIA_RE.test(v) || BLOB_RE.test(path))) return false;
  return !kind || EXT[kind].test(path);
}

export function youtubeId(url) {
  if (typeof url !== 'string') return null;
  const m = url.match(/^https?:\/\/(?:www\.|m\.)?(?:youtube\.com\/(?:watch\?(?:.*&)?v=|shorts\/|embed\/|live\/)|youtu\.be\/)([\w-]{6,20})/);
  return m ? m[1] : null;
}

// ---------- validation ----------

const hasControlChars = (s) => /[\u0000-\u0008\u000B\u000C\u000E-\u001F]/.test(s);

function validateField(field, value, path, errors) {
  const err = (message) => errors.push({ path, label: field.label, message });
  switch (field.type) {
    case 'text':
    case 'textarea': {
      if (value == null) value = '';
      if (typeof value !== 'string') { err('Має бути текст.'); return ''; }
      if (hasControlChars(value)) { err('Містить недопустимі символи.'); return value; }
      if (field.type === 'text' && /[\r\n]/.test(value)) { err('Має бути в один рядок.'); return value; }
      if (field.required && !value.trim()) err('Поле обов’язкове.');
      if (field.max && value.length > field.max) err(`Задовго: ${value.length} із ${field.max} символів.`);
      return value;
    }
    case 'url': {
      if (value == null) value = '';
      if (typeof value !== 'string') { err('Має бути посилання.'); return ''; }
      if (!value) { if (field.required) err('Поле обов’язкове.'); return value; }
      if (!isSafeLink(value) || value.length > 2000) err('Посилання має починатися з https:// (або http://).');
      return value;
    }
    case 'media': {
      if (value == null) value = '';
      if (typeof value !== 'string') { err('Невірний файл.'); return ''; }
      if (!value) { if (field.required) err('Потрібно вибрати файл.'); return value; }
      if (!isSafeMedia(value, field.kind, field.allowYoutube)) {
        err(field.kind === 'video'
          ? 'Потрібен MP4-файл, завантажений через кнопку «Завантажити», або наявний файл сайту.'
          : 'Потрібна картинка JPG, PNG або WEBP, завантажена через кнопку «Завантажити», або наявний файл сайту.');
      }
      return value;
    }
    case 'date': {
      if (value == null) value = '';
      if (typeof value !== 'string' || (value && !DATE_RE.test(value))) err('Невірна дата.');
      return typeof value === 'string' ? value : '';
    }
    case 'color': {
      const ok = PALETTES[field.palette].some((c) => c.value === value);
      if (!ok) err('Оберіть колір зі списку.');
      return value;
    }
    case 'select': {
      if (!field.options.some((o) => o.value === value)) err('Оберіть значення зі списку.');
      return value;
    }
    case 'stringList': {
      if (!Array.isArray(value)) { err('Має бути список.'); return []; }
      if (field.min && value.length < field.min) err(`Потрібно щонайменше ${field.min}.`);
      if (field.max && value.length > field.max) err(`Не більше ${field.max} пунктів.`);
      return value.map((v, i) => validateField(
        { type: 'text', label: `${field.itemLabel} ${i + 1}`, max: field.itemMax, required: true },
        v, `${path}.${i}`, errors));
    }
    case 'list': {
      if (!Array.isArray(value)) { err('Має бути список.'); return []; }
      if (field.min && value.length < field.min) err(`Потрібно щонайменше ${field.min}.`);
      if (field.max && value.length > field.max) err(`Не більше ${field.max} елементів.`);
      return value.map((item, i) => {
        const out = {};
        const obj = item && typeof item === 'object' && !Array.isArray(item) ? item : {};
        for (const f of field.fields) {
          out[f.key] = validateField(f, obj[f.key], `${path}.${i}.${f.key}`, errors);
        }
        return out;
      });
    }
    default:
      err('Невідомий тип поля.');
      return value;
  }
}

// Returns { ok, errors, value } where value contains only known keys.
export function validateContent(content) {
  const errors = [];
  const value = {};
  if (!content || typeof content !== 'object' || Array.isArray(content)) {
    return { ok: false, errors: [{ path: '', label: '', message: 'Невірний формат контенту.' }], value };
  }
  for (const section of SECTIONS) {
    const src = content[section.key] && typeof content[section.key] === 'object' ? content[section.key] : {};
    const out = {};
    for (const f of section.fields) {
      out[f.key] = validateField(f, src[f.key], `${section.key}.${f.key}`, errors);
    }
    value[section.key] = out;
  }
  return { ok: errors.length === 0, errors, value };
}

// Human-readable list of sections that differ, for commit messages.
export function changedSections(before, after) {
  return SECTIONS
    .filter((s) => JSON.stringify(before?.[s.key] ?? null) !== JSON.stringify(after?.[s.key] ?? null))
    .map((s) => s.commitName);
}
