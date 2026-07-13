import { h, money, variance } from '../ui.js';
import { coll } from '../state.js';
import * as store from '../state.js';
import { t, localName } from '../i18n.js';
import { budgetStats, taskProgress, costTotals, categoryMap } from '../compute.js';
import { gantt } from '../gantt.js';

// Budget is a stored setting. Shown formatted like every other figure; click to
// edit the raw number in place (all 4 members are admin).
function budgetCard(budget) {
  const display = h('div', { class: 'stat-value tnum', style: { cursor: 'pointer' }, title: t('editHint') }, money(budget));
  display.addEventListener('click', () => {
    const input = h('input', {
      type: 'number', step: '100', value: budget, class: 'tnum', 'aria-label': t('statBudget'),
      style: { width: '100%', border: 'none', background: 'transparent', outline: 'none',
        font: '700 26px/1.1 Commissioner, sans-serif', color: 'var(--ink)', padding: '0 2px', borderRadius: '8px', boxShadow: 'inset 0 0 0 2px var(--teal)' },
    });
    const commit = () => {
      const v = Number(input.value);
      if (v >= 0 && v !== budget) store.patchSettings({ total_budget: v });  // triggers re-render
      else input.replaceWith(display);
    };
    input.addEventListener('blur', commit);
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') input.blur();
      else if (e.key === 'Escape') { input.value = budget; input.blur(); }
    });
    display.replaceWith(input); input.focus(); input.select();
  });
  return h('div', { class: 'card card-pad' },
    h('div', { class: 'stat-label' }, t('statBudget')),
    display,
    h('div', { class: 'stat-sub' }, t('editHint')),
    h('div', { class: 'bar-track' }, h('div', { class: 'bar-fill', style: { width: '100%', background: 'var(--teal)' } })),
  );
}

function statCard(label, value, sub, pct, barColor, valueColor) {
  return h('div', { class: 'card card-pad' },
    h('div', { class: 'stat-label' }, label),
    h('div', { class: 'stat-value tnum', style: { color: valueColor || 'var(--ink)' } }, value),
    h('div', { class: 'stat-sub' }, sub),
    h('div', { class: 'bar-track' }, h('div', { class: 'bar-fill', style: { width: Math.min(100, Math.max(0, pct)) + '%', background: barColor } })),
  );
}

function plannedVsActual() {
  const cats = categoryMap();
  const { byCat } = costTotals();
  const rows = [...byCat.entries()].map(([id, v]) => ({ name: localName(cats.get(id)) || '—', ...v }))
    .filter((r) => r.planned || r.actual).sort((a, b) => b.actual - a.actual);
  const max = Math.max(1, ...rows.map((r) => Math.max(r.planned, r.actual)));

  const bars = h('div', { class: 'pva' }, rows.map((r) => {
    const v = r.actual - r.planned;
    const vColor = v > 0 ? 'var(--accent)' : v < 0 ? 'var(--ok)' : 'var(--muted)';
    return h('div', { class: 'pva-col' },
      h('span', { class: 'tnum', style: { fontSize: '10.5px', fontWeight: 700, color: vColor } }, variance(v)),
      h('div', { class: 'pva-bars' },
        h('div', { class: 'pva-bar', title: money(r.planned), style: { height: (r.planned / max * 100) + '%', background: '#d7dde4' } }),
        h('div', { class: 'pva-bar', title: money(r.actual), style: { height: (r.actual / max * 100) + '%', background: v > 0 ? 'var(--accent)' : 'var(--teal)' } })));
  }));
  const labels = h('div', { style: { display: 'flex', gap: '10px', marginTop: '6px' } }, rows.map((r) =>
    h('div', { style: { flex: '1', minWidth: 0, textAlign: 'center' } },
      h('div', { title: r.name, style: { fontSize: '10.5px', fontWeight: 600, color: '#56606c', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' } }, r.name),
      h('div', { class: 'tnum', style: { fontSize: '10px', color: 'var(--muted2)' } }, money(r.actual)))));

  return h('div', { class: 'card card-pad' },
    h('div', { class: 'row-between', style: { marginBottom: '14px' } },
      h('h2', { style: { margin: 0, fontSize: '14px' } }, t('plannedVsActual')),
      h('div', { class: 'legend' },
        h('span', {}, h('span', { class: 'sw', style: { background: '#d7dde4' } }), ' ' + t('planned')),
        h('span', {}, h('span', { class: 'sw', style: { background: 'var(--teal)' } }), ' ' + t('actual')))),
    bars, labels);
}

const PRIO = { high: 0, medium: 1, low: 2 };
// Blueprint palette is monochrome-blue — status reads via tint, not hue.
const STATUS_STYLE = {
  done: { bg: '#e6ecf9', color: 'var(--teal)', key: 'statusDone' },
  in_progress: { bg: '#e6ecf9', color: 'var(--teal)', key: 'statusInProgress' },
  pending: { bg: 'var(--soft-bg)', color: 'var(--soft-ink)', key: 'statusPending' },
};

function nextTasks() {
  const rows = coll('tasks').filter((tk) => tk.status !== 'done')
    .sort((a, b) => (PRIO[a.priority] ?? 3) - (PRIO[b.priority] ?? 3)).slice(0, 5);
  return h('div', { class: 'card card-pad' },
    h('h2', { style: { margin: '0 0 12px', fontSize: '14px' } }, t('nextTasks')),
    h('div', {}, rows.map((tk) => {
      const s = STATUS_STYLE[tk.status] || STATUS_STYLE.pending;
      return h('div', { style: { display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 10px' } },
        h('span', { style: { width: '9px', height: '9px', borderRadius: '999px', background: s.color, flexShrink: 0 } }),
        h('div', { style: { flex: 1, minWidth: 0 } },
          h('div', { style: { fontSize: '13px', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' } }, tk.title),
          h('div', { style: { fontSize: '11px', color: 'var(--muted2)' } }, tk.contractor || tk.dependency_note || '')),
        h('span', { class: 'pill', style: { background: s.bg, color: s.color } }, t(s.key)));
    })));
}

function recentActivity() {
  const rows = coll('activity').slice(0, 6);
  return h('div', { class: 'card card-pad' },
    h('h2', { style: { margin: '0 0 12px', fontSize: '14px' } }, t('recentActivity')),
    h('div', {}, rows.map((a) => h('div', { style: { display: 'flex', gap: '10px', alignItems: 'baseline', marginBottom: '10px' } },
      h('span', { class: 'tnum', style: { fontSize: '11px', color: 'var(--muted2)', width: '52px', flexShrink: 0 } },
        new Date(a.ts).toLocaleDateString('el-GR', { day: '2-digit', month: '2-digit' })),
      h('span', { style: { fontSize: '12.5px', color: '#454b55' } }, localName({ name_el: a.el, name_en: a.en }))))));
}

// A dismissible "getting started" checklist, shown on a fresh project until the
// budget is set (or the user dismisses it). Nudges the key first steps.
function gettingStarted() {
  const s = store.settings();
  const key = 'rh_onboard_' + store.state.projectId;
  if (localStorage.getItem(key) === '1' || Number(s.total_budget) > 0) return null;

  const items = [
    { done: Number(s.total_budget) > 0, text: t('obSetBudget') },
    { done: !!s.project_start, text: t('obSetTimeline') },
    { done: coll('cost_items').some((c) => Number(c.planned_cost) > 0 || Number(c.actual_cost) > 0), text: t('obAddCosts') },
  ];
  const dismiss = h('button', { class: 'icon-btn', title: t('obDismiss'),
    onclick: () => { localStorage.setItem(key, '1'); store.rerender(); } }, '✕');

  return h('div', { class: 'card card-pad onboard' },
    h('div', { class: 'row-between' },
      h('h2', { style: { margin: 0, fontSize: '15px' } }, t('obTitle')), dismiss),
    h('div', { class: 'onboard-intro muted' }, t('obIntro')),
    h('ul', { class: 'onboard-list' }, items.map((it) =>
      h('li', { class: it.done ? 'done' : '' },
        h('span', { class: 'onboard-check' }, it.done ? '✓' : '○'), it.text))),
  );
}

// The four budget/progress stat cards, as one widget.
function statsWidget() {
  const { budget, spent, remaining } = budgetStats();
  const prog = taskProgress();
  const spentPct = budget ? spent / budget * 100 : 0;
  return h('div', { class: 'stat-grid' },
    budgetCard(budget),
    statCard(t('statSpent'), money(spent), Math.round(spentPct) + '%', spentPct, spentPct > 100 ? 'var(--accent)' : 'var(--teal)', spentPct > 100 ? 'var(--accent)' : undefined),
    statCard(t('statRemaining'), money(remaining), '', 100 - spentPct, remaining < 0 ? 'var(--accent)' : 'var(--ok)', remaining < 0 ? 'var(--accent)' : undefined),
    statCard(t('statProgress'), prog.pct + '%', `${prog.done}/${prog.total}`, prog.pct, 'var(--teal)'));
}

// ── extra widgets (all derived from the existing snapshot) ──────────────────
function taskSummary() {
  const tasks = coll('tasks');
  const c = { pending: 0, in_progress: 0, done: 0 };
  for (const tk of tasks) c[tk.status] = (c[tk.status] || 0) + 1;
  const pct = tasks.length ? Math.round((c.done / tasks.length) * 100) : 0;
  const line = (label, n, color) => h('div', { style: { display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 0' } },
    h('span', { style: { width: '8px', height: '8px', borderRadius: '999px', background: color, flexShrink: 0 } }),
    h('span', { style: { fontSize: '13px', flex: 1 } }, label),
    h('span', { class: 'tnum', style: { fontWeight: 700 } }, n));
  return h('div', { class: 'card card-pad' },
    h('h2', { style: { margin: '0 0 6px', fontSize: '14px' } }, t('wTaskSummary')),
    line(t('statusInProgress'), c.in_progress, 'var(--warn)'),
    line(t('statusPending'), c.pending, 'var(--muted2)'),
    line(t('statusDone'), c.done, 'var(--teal)'),
    h('div', { class: 'bar-track', style: { marginTop: '8px' } }, h('div', { class: 'bar-fill', style: { width: pct + '%', background: 'var(--teal)' } })));
}

function costByCategory() {
  const cats = categoryMap();
  const { byCat } = costTotals();
  const rows = [...byCat.entries()].map(([id, v]) => ({ name: localName(cats.get(id)) || '—', actual: v.actual }))
    .filter((r) => r.actual).sort((a, b) => b.actual - a.actual).slice(0, 6);
  const max = Math.max(1, ...rows.map((r) => r.actual));
  return h('div', { class: 'card card-pad' },
    h('h2', { style: { margin: '0 0 12px', fontSize: '14px' } }, t('wCostByCat')),
    h('div', { style: { display: 'flex', flexDirection: 'column', gap: '10px' } }, rows.length ? rows.map((r) =>
      h('div', {},
        h('div', { style: { display: 'flex', justifyContent: 'space-between', gap: '8px', fontSize: '12.5px', marginBottom: '3px' } },
          h('span', { style: { overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' } }, r.name),
          h('span', { class: 'tnum', style: { fontWeight: 700 } }, money(r.actual))),
        h('div', { class: 'bar-track' }, h('div', { class: 'bar-fill', style: { width: (r.actual / max * 100) + '%', background: 'var(--teal)' } })))) : h('div', { class: 'stat-sub' }, '—')));
}

function recentCosts() {
  const rows = coll('cost_items').filter((c) => c.status === 'paid').slice()
    .sort((a, b) => (b.date || '').localeCompare(a.date || '')).slice(0, 6);
  return h('div', { class: 'card card-pad' },
    h('h2', { style: { margin: '0 0 8px', fontSize: '14px' } }, t('wRecentCosts')),
    h('div', {}, rows.length ? rows.map((c) => h('div', { style: { display: 'flex', alignItems: 'baseline', gap: '10px', padding: '6px 0', borderBottom: '1px dashed var(--line)' } },
      h('span', { class: 'tnum', style: { fontSize: '11px', color: 'var(--muted2)', width: '44px', flexShrink: 0 } }, c.date ? c.date.slice(8, 10) + '/' + c.date.slice(5, 7) : '—'),
      h('span', { style: { flex: 1, minWidth: 0, fontSize: '13px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' } }, c.description || '—'),
      h('span', { class: 'tnum', style: { fontWeight: 700, whiteSpace: 'nowrap' } }, money(c.actual_cost)))) : h('div', { class: 'stat-sub' }, '—')));
}

function contractors() {
  const m = new Map();
  for (const c of coll('cost_items')) {
    const k = (c.contractor || '').trim();
    if (k) m.set(k, (m.get(k) || 0) + (Number(c.actual_cost) || 0));
  }
  const rows = [...m.entries()].map(([name, total]) => ({ name, total })).sort((a, b) => b.total - a.total).slice(0, 6);
  return h('div', { class: 'card card-pad' },
    h('h2', { style: { margin: '0 0 8px', fontSize: '14px' } }, t('wContractors')),
    h('div', {}, rows.length ? rows.map((r) => h('div', { style: { display: 'flex', justifyContent: 'space-between', gap: '8px', padding: '6px 0', borderBottom: '1px dashed var(--line)', fontSize: '13px' } },
      h('span', { style: { overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' } }, r.name),
      h('span', { class: 'tnum', style: { fontWeight: 700, whiteSpace: 'nowrap' } }, money(r.total)))) : h('div', { class: 'stat-sub' }, '—')));
}

// ── widget catalogue + layout model ─────────────────────────────────────────
// `name` is an i18n key (shown in the add tray). The layout is rows of 1–2 ids:
// a lone widget spans full width, two share a row as left/right halves.
const CATALOG = {
  stats: { name: 'wStats', el: statsWidget },
  timeline: { name: 'timeline', el: gantt },
  planned: { name: 'plannedVsActual', el: plannedVsActual },
  tasks: { name: 'nextTasks', el: nextTasks },
  taskSummary: { name: 'wTaskSummary', el: taskSummary },
  costByCat: { name: 'wCostByCat', el: costByCategory },
  recentCosts: { name: 'wRecentCosts', el: recentCosts },
  contractors: { name: 'wContractors', el: contractors },
  activity: { name: 'recentActivity', el: recentActivity },
};
const DEFAULT_LAYOUT = [['stats'], ['timeline'], ['planned', 'tasks']];

// Normalise persisted layout: keep known ids, drop dupes/empties, cap rows at 2.
function normalizeLayout(saved) {
  let rows = (Array.isArray(saved) && saved.every((r) => Array.isArray(r)))
    ? saved.map((r) => r.filter((id) => id in CATALOG))
    : null;
  if (!rows) rows = DEFAULT_LAYOUT.map((r) => [...r]);
  const seen = new Set(); const out = [];
  for (const r of rows) {
    const nr = [];
    for (const id of r) if (!seen.has(id) && nr.length < 2) { seen.add(id); nr.push(id); }
    if (nr.length) out.push(nr);
  }
  return out.length ? out : DEFAULT_LAYOUT.map((r) => [...r]);
}

// Pure: apply a drop action to the layout. `half` places into a single-widget
// row's chosen side; `row` inserts a new full-width row before an anchor / at end.
function applyDrop(rows, dragId, action) {
  const next = rows.map((r) => r.filter((x) => x !== dragId)).filter((r) => r.length);
  if (action.kind === 'half') {
    const idx = next.findIndex((r) => r.includes(action.targetId));
    if (idx < 0) { next.push([dragId]); return next; }
    next[idx] = action.side === 'left' ? [dragId, action.targetId] : [action.targetId, dragId];
  } else {
    if (action.anchor === 'end') next.push([dragId]);
    else {
      const idx = next.findIndex((r) => r.includes(action.anchor));
      if (idx < 0) next.push([dragId]); else next.splice(idx, 0, [dragId]);
    }
  }
  return next;
}

let configuring = false; // persists across mutation re-renders (module-level)

export default function render(root) {
  const KEY = 'rh_dashv2_' + store.state.projectId;
  const load = () => { try { return normalizeLayout(JSON.parse(localStorage.getItem(KEY))); } catch { return normalizeLayout(null); } };
  const save = (rows) => localStorage.setItem(KEY, JSON.stringify(rows));

  function build() {
    const rows = load();
    const grid = h('div', { class: 'dash-grid' + (configuring ? ' configuring' : '') });

    // Pointer-drag with highlighted drop slots (only in configure mode).
    const attachDrag = (grip, widget, id) => {
      grip.addEventListener('pointerdown', (e) => {
        e.preventDefault();
        const cur = load();
        const gr = grid.getBoundingClientRect();
        const rowEls = [...grid.querySelectorAll('.dash-row')];
        const slots = [];
        rowEls.forEach((rEl, i) => {
          const rr = rEl.getBoundingClientRect();
          const anchor = (cur[i] || []).find((x) => x !== id) || 'end';
          slots.push({ kind: 'row', anchor, rect: { left: 0, top: rr.top - gr.top - 10, width: gr.width, height: 20 } });
          if ((cur[i] || []).length === 1 && cur[i][0] !== id) {
            const hw = rr.width / 2;
            slots.push({ kind: 'half', targetId: cur[i][0], side: 'left', rect: { left: rr.left - gr.left, top: rr.top - gr.top, width: hw, height: rr.height } });
            slots.push({ kind: 'half', targetId: cur[i][0], side: 'right', rect: { left: rr.left - gr.left + hw, top: rr.top - gr.top, width: hw, height: rr.height } });
          }
        });
        const lastEl = rowEls[rowEls.length - 1];
        if (lastEl) { const rr = lastEl.getBoundingClientRect(); slots.push({ kind: 'row', anchor: 'end', rect: { left: 0, top: rr.bottom - gr.top - 10, width: gr.width, height: 20 } }); }

        const overlay = h('div', { class: 'dash-slots' });
        const slotEls = slots.map((s) => h('div', { class: 'dash-slot ' + s.kind, style: { left: s.rect.left + 'px', top: s.rect.top + 'px', width: s.rect.width + 'px', height: s.rect.height + 'px' } }));
        slotEls.forEach((el) => overlay.append(el));
        grid.append(overlay);
        widget.classList.add('dragging');

        const x0 = e.clientX, y0 = e.clientY; let hot = -1;
        const move = (ev) => {
          widget.style.transform = `translate(${ev.clientX - x0}px, ${ev.clientY - y0}px)`;
          const px = ev.clientX - gr.left, py = ev.clientY - gr.top;
          let best = -1, bd = Infinity;
          slots.forEach((s, idx) => {
            const r = s.rect;
            const inside = px >= r.left && px <= r.left + r.width && py >= r.top && py <= r.top + r.height;
            const d = inside ? -1 : Math.hypot(px - (r.left + r.width / 2), py - (r.top + r.height / 2));
            if (d < bd) { bd = d; best = idx; }
          });
          if (best !== hot) { if (hot >= 0) slotEls[hot].classList.remove('hot'); hot = best; if (hot >= 0) slotEls[hot].classList.add('hot'); }
        };
        const up = () => {
          document.removeEventListener('pointermove', move);
          document.removeEventListener('pointerup', up);
          widget.classList.remove('dragging'); widget.style.transform = ''; overlay.remove();
          if (hot >= 0) { save(applyDrop(cur, id, slots[hot])); }
          build();
        };
        document.addEventListener('pointermove', move);
        document.addEventListener('pointerup', up);
      });
    };

    const removeWidget = (id) => { save(load().map((r) => r.filter((x) => x !== id)).filter((r) => r.length)); build(); };

    rows.forEach((row) => {
      const rowEl = h('div', { class: 'dash-row' });
      row.forEach((id) => {
        const w = CATALOG[id]; if (!w) return;
        const grip = configuring ? h('span', { class: 'dash-grip', title: t('dragReorder') }, '⠿') : null;
        const tools = configuring ? h('div', { class: 'dash-tools' }, grip,
          h('button', { class: 'del-btn dash-remove', type: 'button', title: t('delete'), onclick: (e) => { e.stopPropagation(); removeWidget(id); } }, '×')) : null;
        const widget = h('div', { class: 'dash-widget' + (row.length === 1 ? ' full' : ''), dataset: { id } }, tools, w.el());
        if (grip) attachDrag(grip, widget, id);
        rowEl.append(widget);
      });
      grid.append(rowEl);
    });

    // Add tray: widgets not currently placed.
    const placed = new Set(rows.flat());
    const available = Object.keys(CATALOG).filter((id) => !placed.has(id));
    const addTray = h('div', { class: 'dash-add' },
      h('div', { class: 'stat-label', style: { marginBottom: '8px' } }, t('dashAddWidget')),
      available.length
        ? h('div', { style: { display: 'flex', gap: '8px', flexWrap: 'wrap' } }, available.map((id) =>
            h('button', { class: 'chip', type: 'button', onclick: () => { const r = load(); r.push([id]); save(r); build(); } }, '+ ' + t(CATALOG[id].name))))
        : h('div', { class: 'stat-sub' }, '—'));

    const configBtn = h('button', {
      class: configuring ? 'btn' : 'btn-ghost', type: 'button',
      onclick: () => { configuring = !configuring; build(); },
    }, configuring ? t('dashDone') : ('⚙ ' + t('dashConfigure')));
    const header = h('div', { class: 'row-between' },
      h('h1', { class: 'page-title', style: { fontSize: '20px' } }, t('navOverview')), configBtn);

    root.replaceChildren(h('section', { class: 'section' },
      gettingStarted(),
      header,
      configuring ? h('div', { class: 'hint dash-hint' }, t('dashDropHint')) : null,
      grid,
      configuring ? addTray : null));
  }

  build();
}
