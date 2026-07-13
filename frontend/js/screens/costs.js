import { h, money, variance, select } from '../ui.js';
import { coll } from '../state.js';
import * as store from '../state.js';
import { t, localName } from '../i18n.js';
import { categoryMap } from '../compute.js';

const GRID = '150px minmax(220px,1.4fr) 150px 100px 100px 100px 120px minmax(140px,1fr) 130px 60px 36px';
const filter = { cat: '', status: '', sort: 'category' };

function catOptions() {
  const opts = [...coll('categories')].sort((a, b) => a.sort_order - b.sort_order)
    .map((c) => ({ value: c.id, label: localName(c) }));
  return opts;
}
function taskOptions() {
  return [{ value: '', label: t('noTask') }, ...coll('tasks').map((tk) => ({ value: tk.id, label: tk.title }))];
}
const statusOptions = () => [
  { value: 'pending', label: t('statusPending') },
  { value: 'paid', label: t('statusPaid') },
];

function cellInput(row, field, opts = {}) {
  return h('input', {
    class: 'cell-input', value: row[field] ?? '', type: opts.type || 'text',
    step: opts.step, placeholder: opts.placeholder || '', style: opts.style || {},
    onchange: (e) => {
      let v = e.target.value;
      if (opts.type === 'number') v = v === '' ? 0 : Number(v);
      store.update('cost_items', row.id, { [field]: v });
    },
  });
}

function dataRow(row) {
  const v = (Number(row.actual_cost) || 0) - (Number(row.planned_cost) || 0);
  const vColor = v > 0 ? 'var(--accent)' : v < 0 ? 'var(--ok)' : 'var(--muted)';
  return h('div', { class: 'grid-row', style: { gridTemplateColumns: GRID } },
    h('div', {}, select(row.category_id, catOptions(), (val) => store.update('cost_items', row.id, { category_id: val }), 'cell-input')),
    h('div', {}, cellInput(row, 'description', { placeholder: t('descriptionPlaceholder') })),
    h('div', {}, select(row.task_id || '', taskOptions(), (val) => store.update('cost_items', row.id, { task_id: val || null }), 'cell-input')),
    h('div', { class: 'num' }, cellInput(row, 'planned_cost', { type: 'number', step: '0.01', style: { textAlign: 'right' } })),
    h('div', { class: 'num' }, cellInput(row, 'actual_cost', { type: 'number', step: '0.01', style: { textAlign: 'right' } })),
    h('div', { class: 'num tnum', style: { padding: '9px 12px', fontWeight: 700, color: vColor, fontSize: '12.5px' } }, variance(v)),
    h('div', {}, select(row.status, statusOptions(), (val) => store.update('cost_items', row.id, { status: val }), 'cell-input')),
    h('div', {}, cellInput(row, 'contractor', { placeholder: '—' })),
    h('div', {}, cellInput(row, 'date', { type: 'date' })),
    h('div', { style: { textAlign: 'center' } }, h('input', {
      type: 'checkbox', checked: !!row.has_receipt, style: { width: '16px', height: '16px', accentColor: 'var(--teal)', cursor: 'pointer' },
      onchange: (e) => store.update('cost_items', row.id, { has_receipt: e.target.checked }),
    })),
    h('div', { style: { textAlign: 'center', borderRight: 'none' } },
      h('button', { class: 'del-btn', title: t('delete'), onclick: () => store.remove('cost_items', row.id) }, '×')),
  );
}

export default function render(root) {
  const rebuild = () => { root.replaceChildren(); build(); };
  function build() {
    const cats = categoryMap();
    let rows = [...coll('cost_items')];
    if (filter.cat) rows = rows.filter((r) => r.category_id === filter.cat);
    if (filter.status) rows = rows.filter((r) => r.status === filter.status);
    if (filter.sort === 'category') rows.sort((a, b) => (cats.get(a.category_id)?.sort_order || 0) - (cats.get(b.category_id)?.sort_order || 0));
    else if (filter.sort === 'variance') rows.sort((a, b) => (b.actual_cost - b.planned_cost) - (a.actual_cost - a.planned_cost));
    else if (filter.sort === 'actual') rows.sort((a, b) => b.actual_cost - a.actual_cost);

    const header = h('div', { class: 'row-between' },
      h('h1', { class: 'page-title', style: { flex: 1 } }, t('navCosts')),
      h('div', { style: { display: 'flex', gap: '8px', flexWrap: 'wrap' } },
        select(filter.cat, [{ value: '', label: t('filterAllCats') }, ...catOptions()], (v) => { filter.cat = v; rebuild(); }, 'btn-ghost'),
        select(filter.status, [{ value: '', label: t('filterAllStatus') }, ...statusOptions()], (v) => { filter.status = v; rebuild(); }, 'btn-ghost'),
        select(filter.sort, [{ value: 'category', label: t('colCategory') }, { value: 'variance', label: t('colVariance') }, { value: 'actual', label: t('colActual') }], (v) => { filter.sort = v; rebuild(); }, 'btn-ghost')));

    const head = h('div', { class: 'grid-head', style: { gridTemplateColumns: GRID } },
      ...[t('colCategory'), t('colDescription'), t('colTaskLink')].map((x) => h('div', {}, x)),
      ...[t('colPlanned'), t('colActual'), t('colVariance')].map((x) => h('div', { class: 'num' }, x)),
      h('div', {}, t('colStatus')), h('div', {}, t('colContractor')), h('div', {}, t('colDate')),
      h('div', { style: { textAlign: 'center' } }, t('colReceipt')), h('div', {}));

    // totals by category + grand
    const byCat = new Map();
    let gp = 0, ga = 0;
    for (const r of rows) {
      const c = byCat.get(r.category_id) || { p: 0, a: 0 };
      c.p += Number(r.planned_cost) || 0; c.a += Number(r.actual_cost) || 0;
      byCat.set(r.category_id, c); gp += Number(r.planned_cost) || 0; ga += Number(r.actual_cost) || 0;
    }
    const totalRow = (name, p, a, bold) => h('div', { style: { display: 'grid', gridTemplateColumns: 'minmax(300px,2fr) 100px 100px 100px', borderBottom: '1px solid #eef0f3', background: bold ? '#f0f2f5' : '#fff' } },
      h('div', { style: { padding: '8px 12px', fontWeight: bold ? 700 : 600 } }, name),
      h('div', { class: 'num tnum', style: { padding: '8px 12px', fontWeight: bold ? 700 : 500 } }, money(p)),
      h('div', { class: 'num tnum', style: { padding: '8px 12px', fontWeight: bold ? 700 : 500 } }, money(a)),
      h('div', { class: 'num tnum', style: { padding: '8px 12px', fontWeight: 700, color: (a - p) > 0 ? 'var(--accent)' : 'var(--ok)' } }, variance(a - p)));

    const totals = h('div', {}, [...byCat.entries()].map(([id, c]) => totalRow(localName(cats.get(id)) || '—', c.p, c.a, false)),
      totalRow(t('total'), gp, ga, true));

    const addBtn = h('div', { style: { padding: '8px 12px', borderBottom: '1px solid var(--line2)' } },
      h('button', { class: 'btn-dashed', onclick: () => store.create('cost_items', { category_id: (coll('categories')[0] || {}).id, description: '', planned_cost: 0, actual_cost: 0, status: 'pending' }) }, '+ ' + t('addRow')));

    root.append(h('section', { class: 'section' },
      header,
      h('div', { class: 'hint' }, t('gridHint')),
      h('div', { class: 'card' }, h('div', { class: 'grid-scroll' },
        h('div', { style: { minWidth: '1340px' } }, head, ...rows.map(dataRow), addBtn, totals)))));
  }
  build();
}
