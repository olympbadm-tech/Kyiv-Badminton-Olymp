// Minimal mustache-like renderer used by scripts/build.js.
//   {{path}}            escaped value (the only way to output data — no raw HTML)
//   {{.}}               current item (for lists of strings)
//   {{#path}}…{{/path}} list → repeat for each item; truthy value → render once
//   {{^path}}…{{/path}} render when value is empty / falsy / []
// A line that contains only a section tag is removed entirely, so the
// template keeps the same indentation as the generated HTML.

export function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

const TAG_RE = /\{\{\s*([#^/]?)\s*([\w.@-]+|\.)\s*\}\}/g;

function parse(src) {
  src = src.replace(/^[ \t]*(\{\{\s*[#^/][^}]*\}\})[ \t]*\r?\n/gm, '$1');
  const root = { children: [] };
  const stack = [root];
  let last = 0;
  let m;
  TAG_RE.lastIndex = 0;
  while ((m = TAG_RE.exec(src))) {
    const top = stack[stack.length - 1];
    if (m.index > last) top.children.push(src.slice(last, m.index));
    last = TAG_RE.lastIndex;
    const [, kind, name] = m;
    if (kind === '#' || kind === '^') {
      const node = { kind, name, children: [] };
      top.children.push(node);
      stack.push(node);
    } else if (kind === '/') {
      if (top.name !== name || stack.length === 1) throw new Error(`Template: unexpected {{/${name}}}`);
      stack.pop();
    } else {
      top.children.push({ kind: 'var', name });
    }
  }
  if (stack.length !== 1) throw new Error(`Template: unclosed {{#${stack[stack.length - 1].name}}}`);
  if (last < src.length) root.children.push(src.slice(last));
  return root;
}

function lookup(ctxStack, name) {
  if (name === '.') return ctxStack[ctxStack.length - 1];
  const parts = name.split('.');
  for (let i = ctxStack.length - 1; i >= 0; i--) {
    const ctx = ctxStack[i];
    if (ctx && typeof ctx === 'object' && parts[0] in ctx) {
      return parts.reduce((o, k) => (o == null ? undefined : o[k]), ctx);
    }
  }
  return undefined;
}

const isEmpty = (v) => !v || (Array.isArray(v) && v.length === 0);

function renderNodes(nodes, ctxStack) {
  let out = '';
  for (const node of nodes) {
    if (typeof node === 'string') { out += node; continue; }
    const value = lookup(ctxStack, node.name);
    if (node.kind === 'var') {
      if (value === undefined) throw new Error(`Template: missing value for {{${node.name}}}`);
      out += escapeHtml(value);
    } else if (node.kind === '^') {
      if (isEmpty(value)) out += renderNodes(node.children, ctxStack);
    } else if (Array.isArray(value)) {
      for (const item of value) out += renderNodes(node.children, [...ctxStack, item]);
    } else if (!isEmpty(value)) {
      out += renderNodes(node.children, typeof value === 'object' ? [...ctxStack, value] : ctxStack);
    }
  }
  return out;
}

export function render(template, data) {
  return renderNodes(parse(template).children, [data]);
}
