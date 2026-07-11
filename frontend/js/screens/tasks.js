import { h, money, select } from '../ui.js';
import { coll } from '../state.js';
import * as store from '../state.js';
import { t, localName } from '../i18n.js';
import { taskCost } from '../compute.js';

const GRID = 'minmax(220px,1.4fr) 150px 110px minmax(140px,1fr) minmax(140px,1fr) minmax(150px,1fr) 120px 36px';
const statusOptions = () => [
  { value: 'pending', label: t('statusPending') },
  { value: 'in_progress', label: t('statusInProgress') },
  { value: 'done', label: t('statusDone') },
];
const prioOptions = () => [
  { value: 'high', label: t('prioHigh') },
  { value: 'medium', label: t('prioMedium') },
  { value: 'low', label: t('prioLow') },
];
const ui = { catManagerOpen: false, newCat: '' };

function cellInput(row, field) {
  return h('input', {
    class: 'cell-input', value: row[field] ?? '', placeholder: '—',
    style: field === 'title' ? { fontWeight: 600 } : { fontSize: '12.5px', color: '#56666d' },
    onchange: (e) => store.update('tasks', row.id, { [field]: e.target.value }),
  });
}

function taskRow(row) {
  const cost = taskCost(row.id);
  return h('div', { class: 'grid-row', style: { gridTemplateColumns: GRID } },
    h('div', { style: { borderRight: 'none' } }, cellInput(row, 'title')),
    h('div', { style: { borderRight: 'none', padding: '4px 8px' } }, select(row.status, statusOptions(), (v) => store.update('tasks', row.id, { status: v }), 'cell-input')),
    h('div', { style: { borderRight: 'none', padding: '4px 8px' } }, select(row.priority, prioOptions(), (v) => store.update('tasks', row.id, { priority: v }), 'cell-input')),
    h('div', { style: { borderRight: 'none' } }, cellInput(row, 'dependency_note')),
    h('div', { style: { borderRight: 'none' } }, cellInput(row, 'contractor')),
    h('div', { style: { borderRight: 'none' } }, cellInput(row, 'notes')),
    h('div', { class: 'tnum', style: { borderRight: 'none', padding: '9px 12px', fontSize: '12px', color: 'var(--muted)', whiteSpace: 'nowrap' } }, cost ? money(cost) : '—'),
    h('div', { style: { borderRight: 'none', textAlign: 'center' } },
      h('button', { class: 'del-btn', title: t('delete'), onclick: () => store.remove('tasks', row.id) }, '×')),
  );
}

function categoryManager(rebuild) {
  const cats = [...coll('categories')].sort((a, b) => a.sort_order - b.sort_order);
  const usage = (id) => coll('tasks').filter((tk) => tk.category_id === id).length;
  const rows = cats.map((c) => h('div', { style: { display: 'flex', gap: '8px', alignItems: 'center' } },
    h('input', { class: 'field', type: 'number', value: c.sort_order, style: { width: '56px', padding: '7px 9px' }, onchange: (e) => store.update('categories', c.id, { sort_order: Number(e.target.value) }) }),
    h('input', { class: 'field', value: c.name_el, style: { flex: 1, maxWidth: '340px', padding: '7px 10px' }, onchange: (e) => store.update('categories', c.id, { name_el: e.target.value }) }),
    h('span', { style: { fontSize: '11px', color: 'var(--muted2)', flex: 1 } }, usage(c.id) + '×'),
    h('button', { class: 'del-btn', title: t('delete'), onclick: () => store.remove('categories', c.id) }, '×')));
  const newInput = h('input', { class: 'field', placeholder: t('newCategoryPlaceholder'), style: { flex: 1, maxWidth: '340px', padding: '7px 10px' }, value: ui.newCat, oninput: (e) => { ui.newCat = e.target.value; } });
  return h('div', { style: { background: 'var(--panel)', border: '1px solid var(--chip-line)', borderRadius: '14px', padding: '16px 18px' } },
    h('div', { class: 'stat-label', style: { color: '#35606e', marginBottom: '10px' } }, t('categoriesTitle')),
    h('div', { style: { display: 'flex', flexDirection: 'column', gap: '6px' } }, rows),
    h('div', { style: { display: 'flex', gap: '8px', marginTop: '12px' } }, newInput,
      h('button', { class: 'btn', style: { padding: '7px 16px', borderRadius: '8px' }, onclick: () => {
        const name = ui.newCat.trim(); if (!name) return;
        const max = Math.max(0, ...coll('categories').map((c) => c.sort_order));
        ui.newCat = ''; store.create('categories', { name_el: name, sort_order: max + 1 });
      } }, t('add'))));
}

export default function render(root) {
  const rebuild = () => { root.replaceChildren(); build(); };
  function build() {
    const cats = [...coll('categories')].sort((a, b) => a.sort_order - b.sort_order);
    const header = h('div', { class: 'row-between' },
      h('h1', { class: 'page-title' }, t('navTasks')),
      h('button', { class: 'btn-ghost', onclick: () => { ui.catManagerOpen = !ui.catManagerOpen; rebuild(); } }, t('manageCategories')));

    const groups = cats.map((c) => {
      const tasks = coll('tasks').filter((tk) => tk.category_id === c.id);
      const head = h('div', { class: 'group-hd' },
        h('h2', { style: { margin: 0, fontSize: '14px' } }, localName(c)),
        h('span', { class: 'count-pill' }, tasks.length),
        h('span', { style: { flex: 1 } }),
        h('button', { class: 'btn-dashed', onclick: () => store.create('tasks', { category_id: c.id, title: '', status: 'pending', priority: 'medium' }) }, '+ ' + t('addTask')));
      const gridHead = h('div', { class: 'grid-head', style: { gridTemplateColumns: GRID, background: 'transparent', borderBottom: '1px solid var(--line2)' } },
        ...[t('colTitle'), t('colStatus'), t('colPriority'), t('colDependency'), t('colContractor'), t('colNotes'), t('colCosts')].map((x) => h('div', {}, x)), h('div', {}));
      return h('div', { class: 'card', style: { overflow: 'hidden' } }, head,
        h('div', { class: 'grid-scroll' }, h('div', { style: { minWidth: '1040px' } }, gridHead, ...tasks.map(taskRow))));
    });

    root.append(h('section', { class: 'section' }, header,
      ui.catManagerOpen ? categoryManager(rebuild) : null, ...groups));
  }
  build();
}
