// Tiny DOM helpers — a hyperscript-style builder, used by every screen.

// h('div', {class:'card', style:{padding:'8px'}, onclick:fn, dataset:{id:1}}, ...children)
export function h(tag, props = {}, ...children) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(props || {})) {
    if (v == null || v === false) continue;
    if (k === 'class') el.className = v;
    else if (k === 'style' && typeof v === 'object') Object.assign(el.style, v);
    else if (k === 'dataset') Object.assign(el.dataset, v);
    else if (k === 'html') el.innerHTML = v;
    else if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2).toLowerCase(), v);
    else if (k in el && k !== 'list') { try { el[k] = v; } catch { el.setAttribute(k, v); } }
    else el.setAttribute(k, v);
  }
  for (const c of children.flat()) {
    if (c == null || c === false) continue;
    el.append(c.nodeType ? c : document.createTextNode(String(c)));
  }
  return el;
}

export function clear(node) { while (node.firstChild) node.removeChild(node.firstChild); return node; }

const SVGNS = 'http://www.w3.org/2000/svg';
// SVG element builder (createElementNS). Attrs set via setAttribute; on* are events.
export function svgEl(tag, props = {}, ...children) {
  const el = document.createElementNS(SVGNS, tag);
  for (const [k, v] of Object.entries(props || {})) {
    if (v == null || v === false) continue;
    if (k === 'style' && typeof v === 'object') Object.assign(el.style, v);
    else if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2).toLowerCase(), v);
    else el.setAttribute(k, String(v));
  }
  for (const c of children.flat()) { if (c != null && c !== false) el.append(c.nodeType ? c : document.createTextNode(String(c))); }
  return el;
}

const eur0 = new Intl.NumberFormat('el-GR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 });
const eur2 = new Intl.NumberFormat('el-GR', { style: 'currency', currency: 'EUR', minimumFractionDigits: 2, maximumFractionDigits: 2 });
export function money(n, decimals = false) { return (decimals ? eur2 : eur0).format(Number(n) || 0); }

// A styled <select>. options: [{value,label}]. onChange gets the new value.
export function select(value, options, onChange, cls = 'field') {
  const el = h('select', { class: cls, onchange: (e) => onChange(e.target.value) });
  for (const o of options) {
    el.append(h('option', { value: o.value, selected: String(o.value) === String(value) }, o.label));
  }
  el.value = value == null ? '' : value;
  return el;
}

// Signed variance label, e.g. +120 € / −80 €
export function variance(n) {
  const v = Number(n) || 0;
  const s = money(Math.abs(v));
  return v > 0 ? '+' + s : v < 0 ? '−' + s : s;
}
