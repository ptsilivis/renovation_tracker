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

export default function render(root) {
  const { budget, spent, remaining } = budgetStats();
  const prog = taskProgress();
  const spentPct = budget ? spent / budget * 100 : 0;

  root.append(h('section', { class: 'section' },
    gettingStarted(),
    h('div', { class: 'stat-grid' },
      budgetCard(budget),
      statCard(t('statSpent'), money(spent), Math.round(spentPct) + '%', spentPct, spentPct > 100 ? 'var(--accent)' : 'var(--teal)', spentPct > 100 ? 'var(--accent)' : undefined),
      statCard(t('statRemaining'), money(remaining), '', 100 - spentPct, remaining < 0 ? 'var(--accent)' : 'var(--ok)', remaining < 0 ? 'var(--accent)' : undefined),
      statCard(t('statProgress'), prog.pct + '%', `${prog.done}/${prog.total}`, prog.pct, 'var(--teal)')),
    gantt(),
    h('div', { class: 'two-col' }, plannedVsActual(), h('div', { style: { display: 'flex', flexDirection: 'column', gap: '16px' } }, nextTasks(), recentActivity())),
  ));
}
