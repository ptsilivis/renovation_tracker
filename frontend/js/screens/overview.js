import { h, money, variance } from '../ui.js';
import { coll } from '../state.js';
import * as store from '../state.js';
import { t, localName } from '../i18n.js';
import { budgetStats, taskProgress, costTotals, categoryMap } from '../compute.js';

const PHASE_COLORS = ['#1f4e5f', '#35606e', '#4d7a86', '#6d9aa2', '#8fb3b8', '#a4442f', '#c06a4f', '#7a8b52'];
const monthIdx = (s) => { const [y, m] = (s || '').split('-').map(Number); return y * 12 + (m - 1); };

// Budget is a stored setting, editable inline (all 4 members are admin).
function budgetCard(budget) {
  const input = h('input', {
    type: 'number', step: '100', value: budget, title: t('statBudget'),
    class: 'tnum', 'aria-label': t('statBudget'),
    style: {
      width: '100%', border: 'none', background: 'transparent', outline: 'none',
      font: '700 26px/1.1 Literata, serif', color: 'var(--ink)', marginTop: '4px',
      padding: '2px 4px', borderRadius: '8px', cursor: 'text',
    },
    onfocus: (e) => { e.target.style.boxShadow = 'inset 0 0 0 2px var(--teal)'; e.target.select(); },
    onblur: (e) => { e.target.style.boxShadow = 'none'; },
    onchange: (e) => {
      const v = Number(e.target.value);
      if (v >= 0 && v !== budget) store.patchSettings({ total_budget: v });
    },
  });
  return h('div', { class: 'card card-pad' },
    h('div', { class: 'stat-label' }, t('statBudget')),
    h('div', { style: { display: 'flex', alignItems: 'baseline', gap: '4px' } }, input, h('span', { style: { color: 'var(--muted2)', fontWeight: 700 } }, '€')),
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

function timeline() {
  const phases = [...coll('phases')].sort((a, b) => monthIdx(a.start) - monthIdx(b.start));
  if (!phases.length) return null;
  const min = Math.min(...phases.map((p) => monthIdx(p.start)));
  const max = Math.max(...phases.map((p) => monthIdx(p.end)));
  const span = max - min + 1;
  const months = [];
  for (let i = 0; i < span; i++) {
    const idx = min + i;
    const y = Math.floor(idx / 12), m = idx % 12;
    months.push(new Date(y, m, 1).toLocaleDateString('el-GR', { month: 'short', year: '2-digit' }));
  }
  const now = new Date();
  const todayPct = ((now.getFullYear() * 12 + now.getMonth()) - min + now.getDate() / 30) / span * 100;

  const labelsCol = h('div', { style: { width: '170px', flexShrink: 0 } });
  const barsCol = h('div', { style: { flex: '1', position: 'relative' } });
  phases.forEach((p, i) => {
    labelsCol.append(h('div', { class: 'tl-row', style: { paddingRight: '10px', overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' } }, localName(p)));
    const left = (monthIdx(p.start) - min) / span * 100;
    const width = (monthIdx(p.end) - monthIdx(p.start) + 1) / span * 100;
    barsCol.append(h('div', { class: 'tl-bar-row' },
      h('div', { class: 'tl-bar', style: { left: left + '%', width: width + '%', background: PHASE_COLORS[i % PHASE_COLORS.length] } })));
  });
  if (todayPct >= 0 && todayPct <= 100) {
    barsCol.append(h('div', { class: 'tl-today', style: { left: todayPct + '%' } },
      h('span', { style: { position: 'absolute', top: '-2px', left: '5px', fontSize: '10px', fontWeight: 700, color: 'var(--accent)', whiteSpace: 'nowrap' } }, t('today'))));
  }

  const monthsRow = h('div', { style: { display: 'flex' } },
    h('div', { style: { width: '170px', flexShrink: 0 } }),
    h('div', { style: { flex: '1', display: 'flex' } }, months.map((m) => h('div', { class: 'tl-month' }, m))));

  return h('div', { class: 'card card-pad' },
    h('h2', { style: { margin: '0 0 14px', fontSize: '14px' } }, t('timeline')),
    h('div', { class: 'tl-scroll' }, h('div', { class: 'tl-inner' }, monthsRow,
      h('div', { style: { display: 'flex' } }, labelsCol, barsCol))));
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
        h('div', { class: 'pva-bar', title: money(r.planned), style: { height: (r.planned / max * 100) + '%', background: '#d7dfe2' } }),
        h('div', { class: 'pva-bar', title: money(r.actual), style: { height: (r.actual / max * 100) + '%', background: v > 0 ? 'var(--accent)' : 'var(--teal)' } })));
  }));
  const labels = h('div', { style: { display: 'flex', gap: '10px', marginTop: '6px' } }, rows.map((r) =>
    h('div', { style: { flex: '1', minWidth: 0, textAlign: 'center' } },
      h('div', { title: r.name, style: { fontSize: '10.5px', fontWeight: 600, color: '#56666d', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' } }, r.name),
      h('div', { class: 'tnum', style: { fontSize: '10px', color: 'var(--muted2)' } }, money(r.actual)))));

  return h('div', { class: 'card card-pad' },
    h('div', { class: 'row-between', style: { marginBottom: '14px' } },
      h('h2', { style: { margin: 0, fontSize: '14px' } }, t('plannedVsActual')),
      h('div', { class: 'legend' },
        h('span', {}, h('span', { class: 'sw', style: { background: '#d7dfe2' } }), ' ' + t('planned')),
        h('span', {}, h('span', { class: 'sw', style: { background: 'var(--teal)' } }), ' ' + t('actual')))),
    bars, labels);
}

const PRIO = { high: 0, medium: 1, low: 2 };
const STATUS_STYLE = {
  done: { bg: '#e6f0ea', color: 'var(--ok)', key: 'statusDone' },
  in_progress: { bg: '#fbf1de', color: 'var(--warn)', key: 'statusInProgress' },
  pending: { bg: '#eef1f2', color: 'var(--muted)', key: 'statusPending' },
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
      h('span', { style: { fontSize: '12.5px', color: '#4f483d' } }, localName({ name_el: a.el, name_en: a.en }))))));
}

export default function render(root) {
  const { budget, spent, remaining } = budgetStats();
  const prog = taskProgress();
  const spentPct = budget ? spent / budget * 100 : 0;

  root.append(h('section', { class: 'section' },
    h('div', { class: 'stat-grid' },
      budgetCard(budget),
      statCard(t('statSpent'), money(spent), Math.round(spentPct) + '%', spentPct, spentPct > 100 ? 'var(--accent)' : 'var(--teal)', spentPct > 100 ? 'var(--accent)' : undefined),
      statCard(t('statRemaining'), money(remaining), '', 100 - spentPct, remaining < 0 ? 'var(--accent)' : 'var(--ok)', remaining < 0 ? 'var(--accent)' : undefined),
      statCard(t('statProgress'), prog.pct + '%', `${prog.done}/${prog.total}`, prog.pct, 'var(--teal)')),
    timeline(),
    h('div', { class: 'two-col' }, plannedVsActual(), h('div', { style: { display: 'flex', flexDirection: 'column', gap: '16px' } }, nextTasks(), recentActivity())),
  ));
}
