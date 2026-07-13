// Phone shell — a mobile-first layout that swaps in below 760px (app.js gates it).
// Structure ported from the "RenoHub Phone" design: 5 tabs (Home / Tasks /
// Timeline / Costs / Album), a bottom nav with a center + FAB, and a quick-add
// bottom sheet. Reads the same snapshot as the desktop screens and shares the
// Blueprint theme tokens (css/styles.css :root) with them for one brand.
import { h, money } from './ui.js';
import { coll, settings, currentProject, clearProject, setLang, state } from './state.js';
import * as store from './state.js';
import { t, localName } from './i18n.js';
import { api } from './api.js';
import { openPasswordModal } from './password.js';

// Local UI state — kept module-level so it survives the full re-renders that
// mutations trigger (write → refetch → renderApp → renderMobile).
const mob = { tab: 'home', sheet: null, account: false }; // sheet: null|menu|expense|task|measure|idea
let _root = null;
const paint = () => { if (_root) renderMobile(_root); };

const go = (tab) => { mob.tab = tab; paint(); };

// ── derived data ───────────────────────────────────────────────────────────
const MONTHS_SHORT = ['Ιαν', 'Φεβ', 'Μαρ', 'Απρ', 'Μάι', 'Ιουν', 'Ιουλ', 'Αύγ', 'Σεπ', 'Οκτ', 'Νοέ', 'Δεκ'];
const monthYm = (ym) => { if (!ym) return ''; const [y, m] = ym.split('-').map(Number); return MONTHS_SHORT[m - 1] + ' ' + String(y).slice(2); };
const parseYM = (ym) => { const [y, m] = ym.split('-').map(Number); return new Date(y, m - 1, 1); };
const endOfYM = (ym) => { const [y, m] = ym.split('-').map(Number); return new Date(y, m, 0, 23, 59); };
const eur = (n) => Math.round(Number(n) || 0).toLocaleString('el-GR');
const catName = (id) => { const c = coll('categories').find((x) => x.id === id); return c ? localName(c) : ''; };
const roomName = (id) => { const r = coll('rooms').find((x) => x.id === id); return r ? r.name : ''; };
const dim = (cm) => (Number(cm) / 100).toLocaleString('el-GR', { maximumFractionDigits: 2 });
// Parse a Greek-formatted number: dot = thousands separator, comma = decimal
// (e.g. "1.234,50" → 1234.5). Falls back to plain float when there's no comma.
function parseNum(s) {
  const raw = String(s == null ? '' : s).trim();
  if (!raw) return NaN;
  return parseFloat(raw.includes(',') ? raw.replace(/\./g, '').replace(',', '.') : raw);
}

const TASK_ORDER = { in_progress: 0, pending: 1, done: 2 };

function derive() {
  const budget = Number(settings().total_budget) || 0;
  const costs = coll('cost_items');
  const spent = costs.reduce((a, c) => a + (Number(c.actual_cost) || 0), 0);
  const pct = budget ? Math.min(100, Math.round((spent / budget) * 100)) : 0;
  const now = new Date();
  const ymNow = now.toISOString().slice(0, 7);
  const monthSpent = costs.filter((c) => (c.date || '').startsWith(ymNow)).reduce((a, c) => a + (Number(c.actual_cost) || 0), 0);
  const paid = costs.filter((c) => c.status === 'paid');
  const paidPlanned = paid.reduce((a, c) => a + (Number(c.planned_cost) || 0), 0);
  const diff = spent - paidPlanned;
  const deltaText = (diff <= 0 ? '−' + eur(-diff) : '+' + eur(diff)) + ' € ' + t('mVsPlan');

  const tasks = coll('tasks');
  const done = tasks.filter((tk) => tk.status === 'done').length;
  const prog = tasks.filter((tk) => tk.status === 'in_progress').length;
  const taskPct = tasks.length ? Math.round((done / tasks.length) * 100) : 0;

  const phasesRaw = coll('phases').map((p) => {
    const isDone = endOfYM(p.end) < now;
    const isCurrent = !isDone && parseYM(p.start) <= now;
    return { p, isDone, isCurrent };
  });
  const current = phasesRaw.find((x) => x.isCurrent) || phasesRaw.find((x) => !x.isDone) || phasesRaw[0];

  return { budget, spent, pct, now, monthSpent, deltaText, tasks, done, prog, taskPct, phasesRaw, current, paid };
}

// ── small view helpers ─────────────────────────────────────────────────────
const card = (...kids) => h('div', { class: 'm-card' }, ...kids);
const eyebrow = (text, color) => h('div', { class: 'm-eyebrow', style: color ? { color } : {} }, text);

function statusDot(status) {
  const color = status === 'in_progress' ? 'var(--teal)' : 'var(--muted2)';
  return h('span', { style: { width: '8px', height: '8px', borderRadius: '999px', background: color, flexShrink: 0 } });
}
function statusPill(status) {
  if (status === 'done') return h('span', { class: 'm-pill', style: { color: 'var(--ink)', background: 'var(--line2)' } }, t('statusDone'));
  if (status === 'in_progress') return h('span', { class: 'm-pill m-pill-teal' }, t('statusInProgress'));
  return h('span', { class: 'm-pill', style: { color: 'var(--muted)', background: 'var(--panel)' } }, t('statusPending'));
}
const taskSub = (tk) => [catName(tk.category_id), tk.contractor, tk.dependency_note].filter(Boolean).join(' · ');

// ── HOME ───────────────────────────────────────────────────────────────────
function homeScreen(d) {
  const proj = currentProject();
  const projName = proj ? proj.name : '';

  const header = h('div', { class: 'm-home-hd', onclick: () => { mob.account = true; paint(); } },
    h('div', { class: 'm-logo' }, (projName[0] || 'R').toUpperCase()),
    h('div', { style: { flex: 1, minWidth: 0 } },
      h('div', { style: { fontWeight: 800, fontSize: '17px', lineHeight: 1.1 } }, t('appTitle')),
      h('div', { style: { fontSize: '11.5px', color: 'var(--muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' } }, projName)),
    h('span', { class: 'm-avatar' }, (state.user && state.user.display_name ? state.user.display_name[0] : '·').toUpperCase()));

  const hero = h('div', { class: 'm-hero' },
    h('div', { class: 'm-row-between' },
      eyebrow(t('mSpent'), 'var(--hero-sub)'),
      h('span', { class: 'tnum', style: { fontSize: '11px', color: 'var(--hero-sub)' } }, d.pct + '%')),
    h('div', { style: { display: 'flex', alignItems: 'baseline', gap: '8px', marginTop: '6px' } },
      h('div', { class: 'tnum', style: { fontWeight: 700, fontSize: '28px' } }, eur(d.spent) + ' €'),
      h('div', { style: { fontSize: '12.5px', color: 'var(--hero-sub)' } }, '/ ' + eur(d.budget) + ' €')),
    h('div', { class: 'm-hero-track' }, h('div', { class: 'm-hero-fill', style: { width: d.pct + '%' } })),
    h('div', { class: 'm-row-between', style: { marginTop: '8px', fontSize: '11.5px', color: 'var(--hero-sub)' } },
      h('span', {}, t('mThisMonth') + ': ', h('span', { class: 'tnum', style: { fontWeight: 700, color: '#fff' } }, eur(d.monthSpent) + ' €')),
      h('span', { style: { fontWeight: 600 } }, d.deltaText)));

  const phase = d.current;
  const phaseCard = h('div', { class: 'm-card m-phase', onclick: () => go('timeline') },
    h('div', { class: 'm-row-between' },
      eyebrow(t('mCurrentPhase'), 'var(--teal)'),
      phase ? h('span', { class: 'm-pill m-pill-teal' }, t('mUntil') + ' ' + monthYm(phase.p.end)) : null),
    h('div', { style: { fontWeight: 700, fontSize: '15px', marginTop: '5px' } }, phase ? localName(phase.p) : '—'),
    h('div', { style: { display: 'flex', alignItems: 'center', gap: '10px', marginTop: '8px' } },
      h('div', { class: 'm-bar' }, h('div', { class: 'm-bar-fill', style: { width: d.taskPct + '%' } })),
      h('span', { class: 'tnum', style: { fontSize: '11px', fontWeight: 700, color: 'var(--muted)' } }, d.taskPct + '%')),
    h('div', { class: 'm-row-between m-phase-foot' },
      h('span', { style: { fontSize: '12.5px', fontWeight: 700, color: 'var(--teal)' } }, t('mFullTimeline')),
      h('span', { style: { fontSize: '16px', fontWeight: 700, color: 'var(--teal)', lineHeight: 1 } }, '›')));

  const nextRows = d.tasks.filter((tk) => tk.status !== 'done')
    .sort((a, b) => TASK_ORDER[a.status] - TASK_ORDER[b.status]).slice(0, 3);
  const nextCard = card(
    h('div', { class: 'm-row-between', style: { marginBottom: '6px' } },
      eyebrow(t('mNextTasks')),
      h('span', { onclick: () => go('tasks'), style: { fontSize: '11.5px', fontWeight: 600, color: 'var(--teal)' } }, t('mAll'))),
    ...nextRows.map((tk) => h('div', { class: 'm-list-row' },
      statusDot(tk.status),
      h('div', { style: { flex: 1, minWidth: 0 } },
        h('div', { class: 'm-ellip', style: { fontSize: '13px', fontWeight: 600 } }, tk.title),
        h('div', { class: 'm-ellip', style: { fontSize: '11px', color: 'var(--muted2)' } }, taskSub(tk))),
      statusPill(tk.status))));

  const activity = coll('activity').slice(0, 4);
  const actCard = activity.length ? card(
    eyebrow(t('recentActivity')),
    ...activity.map((a) => {
      const dt = new Date(a.ts);
      const dText = String(dt.getDate()).padStart(2, '0') + '/' + String(dt.getMonth() + 1).padStart(2, '0');
      return h('div', { class: 'm-act-row' },
        h('span', { class: 'tnum', style: { fontSize: '10px', color: 'var(--muted2)', flexShrink: 0, width: '40px' } }, dText),
        h('span', { style: { fontSize: '12.5px', lineHeight: 1.4 } }, localName({ name_el: a.el, name_en: a.en })));
    })) : null;

  return h('div', { class: 'm-screen' }, header, hero, phaseCard, nextCard, actCard);
}

// ── TASKS ──────────────────────────────────────────────────────────────────
function tasksScreen(d) {
  const cats = [...coll('categories')].sort((a, b) => a.sort_order - b.sort_order);
  const groups = cats.map((c) => {
    const items = coll('tasks').filter((tk) => tk.category_id === c.id)
      .sort((a, b) => TASK_ORDER[a.status] - TASK_ORDER[b.status]);
    if (!items.length) return null;
    return h('div', { class: 'm-group' }, eyebrow(localName(c)),
      ...items.map((tk) => h('div', { class: 'm-task' },
        toggleCircle(tk),
        h('div', { style: { flex: 1, minWidth: 0 } },
          h('div', { class: tk.status === 'done' ? 'm-task-title done' : 'm-task-title' }, tk.title),
          h('div', { class: 'm-ellip', style: { fontSize: '11.5px', color: 'var(--muted2)', marginTop: '2px' } }, taskSub(tk))),
        statusPill(tk.status))));
  }).filter(Boolean);

  return h('div', { class: 'm-screen' },
    h('div', { class: 'm-title' }, t('navTasks')),
    h('div', { class: 'm-sub' }, `${d.tasks.length} · ${d.prog} ${t('statusInProgress').toLowerCase()} · ${d.done} ${t('statusDone').toLowerCase()}`),
    ...groups);
}

function toggleCircle(tk) {
  const next = tk.status === 'pending' ? 'in_progress' : tk.status === 'in_progress' ? 'done' : 'pending';
  const onclick = () => store.update('tasks', tk.id, { status: next });
  if (tk.status === 'done') return h('span', { class: 'm-circle done', onclick }, '✓');
  if (tk.status === 'in_progress') return h('span', { class: 'm-circle prog', onclick }, h('span', { class: 'm-circle-dot' }));
  return h('span', { class: 'm-circle', onclick });
}

// ── TIMELINE ───────────────────────────────────────────────────────────────
function timelineScreen(d) {
  const phases = coll('phases');
  const range = phases.length ? monthYm(phases[0].start) + ' — ' + monthYm(phases[phases.length - 1].end) : '';
  const rows = d.phasesRaw.map((x, i) => {
    const notLast = i < d.phasesRaw.length - 1;
    let marker, body;
    if (x.isCurrent) {
      marker = h('span', { class: 'm-tl-dot current' });
      body = h('div', { class: 'm-tl-card current' },
        h('div', { class: 'm-row-between' },
          h('span', { style: { fontWeight: 800, fontSize: '14.5px' } }, localName(x.p)),
          h('span', { class: 'm-pill m-pill-solid' }, t('mNow'))),
        h('div', { class: 'tnum', style: { fontSize: '11.5px', color: 'var(--muted)', marginTop: '3px' } }, monthYm(x.p.start) + ' → ' + monthYm(x.p.end)),
        h('div', { style: { fontSize: '11.5px', color: 'var(--muted)', marginTop: '6px' } },
          `${d.prog} ${t('statusInProgress').toLowerCase()} · ${d.taskPct}%`));
    } else if (x.isDone) {
      marker = h('span', { class: 'm-tl-dot done' }, '✓');
      body = h('div', { class: 'm-tl-card', style: { opacity: 0.75 } },
        h('div', { class: 'm-row-between' },
          h('span', { style: { fontWeight: 700, fontSize: '13.5px', color: 'var(--muted2)' } }, localName(x.p)),
          h('span', { class: 'tnum', style: { fontSize: '10.5px', color: 'var(--muted2)' } }, monthYm(x.p.start) + ' → ' + monthYm(x.p.end))),
        h('div', { style: { fontSize: '11px', color: 'var(--muted)', fontWeight: 600, marginTop: '2px' } }, t('mCompleted')));
    } else {
      marker = h('span', { class: 'm-tl-dot future' });
      body = h('div', { class: 'm-tl-card' },
        h('div', { class: 'm-row-between' },
          h('span', { style: { fontWeight: 700, fontSize: '13.5px' } }, localName(x.p)),
          h('span', { class: 'tnum', style: { fontSize: '10.5px', color: 'var(--muted2)' } }, monthYm(x.p.start) + ' → ' + monthYm(x.p.end))));
    }
    return h('div', { class: 'm-tl-row' },
      h('div', { class: 'm-tl-rail' }, marker, notLast ? h('span', { class: 'm-tl-line' }) : null),
      h('div', { style: { flex: 1, paddingBottom: '14px' } }, body));
  });

  return h('div', { class: 'm-screen' },
    h('div', { class: 'm-row-between', style: { paddingTop: '4px' } },
      h('div', { style: { display: 'flex', alignItems: 'baseline', gap: '10px' } },
        h('span', { onclick: () => go('home'), style: { fontSize: '15px', fontWeight: 700, color: 'var(--teal)' } }, '‹'),
        h('div', { class: 'm-title', style: { padding: 0 } }, t('timeline'))),
      h('span', { class: 'tnum', style: { fontSize: '11px', color: 'var(--muted)' } }, range)),
    h('div', {}, ...rows));
}

// ── COSTS ──────────────────────────────────────────────────────────────────
function costsScreen(d) {
  const costs = coll('cost_items');
  const paid = d.paid.slice().sort((a, b) => (b.date || '').localeCompare(a.date || ''));
  const pending = costs.filter((c) => c.status !== 'paid');
  const pendingTotal = pending.reduce((a, c) => a + (Number(c.planned_cost) || 0), 0);

  const total = h('div', { class: 'm-hero' },
    eyebrow(t('mProjectTotal'), 'var(--hero-sub)'),
    h('div', { style: { display: 'flex', alignItems: 'baseline', gap: '8px', marginTop: '4px' } },
      h('span', { class: 'tnum', style: { fontWeight: 700, fontSize: '26px' } }, eur(d.spent) + ' €'),
      h('span', { style: { fontSize: '12px', color: 'var(--hero-sub)' } }, '/ ' + eur(d.budget) + ' €'),
      h('span', { style: { flex: 1 } }),
      h('span', { style: { fontSize: '12px', fontWeight: 700 } }, d.deltaText)),
    h('div', { class: 'm-hero-track' }, h('div', { class: 'm-hero-fill', style: { width: d.pct + '%' } })));

  const paidList = h('div', { class: 'm-card m-flush' }, ...paid.map((c) => h('div', { class: 'm-cost-row' },
    h('span', { class: 'tnum', style: { fontSize: '10.5px', color: 'var(--muted2)', width: '44px', flexShrink: 0 } }, c.date ? c.date.slice(8, 10) + '/' + c.date.slice(5, 7) : '—'),
    h('div', { style: { flex: 1, minWidth: 0 } },
      h('div', { class: 'm-ellip', style: { fontWeight: 600, fontSize: '13.5px' } }, c.description),
      h('div', { class: 'm-ellip', style: { fontSize: '11px', color: 'var(--muted2)' } }, [catName(c.category_id), c.has_receipt ? t('mReceipt') + ' ✓' : null].filter(Boolean).join(' · '))),
    h('span', { class: 'tnum', style: { fontWeight: 700, fontSize: '14px', whiteSpace: 'nowrap' } }, eur(c.actual_cost) + ' €'))));

  const pendingList = pending.length ? h('div', { class: 'm-card m-flush' }, ...pending.map((c) => h('div', { class: 'm-cost-row' },
    h('span', { style: { width: '8px', height: '8px', borderRadius: '999px', background: 'var(--line)', flexShrink: 0 } }),
    h('div', { style: { flex: 1, minWidth: 0 } },
      h('div', { class: 'm-ellip', style: { fontWeight: 600, fontSize: '13.5px', color: 'var(--muted)' } }, c.description),
      h('div', { class: 'm-ellip', style: { fontSize: '11px', color: 'var(--muted2)' } }, [catName(c.category_id), c.contractor].filter(Boolean).join(' · '))),
    h('span', { class: 'tnum', style: { fontWeight: 600, fontSize: '13px', color: 'var(--muted2)', whiteSpace: 'nowrap' } }, eur(c.planned_cost) + ' €')))) : null;

  return h('div', { class: 'm-screen' },
    h('div', { class: 'm-title' }, t('mCosts')),
    total,
    eyebrow2(t('mPaid'), eur(d.spent) + ' €'),
    paidList,
    pending.length ? eyebrow2(t('mPending'), eur(pendingTotal) + ' €') : null,
    pendingList);
}
const eyebrow2 = (label, amt) => h('div', { class: 'm-eyebrow' }, label + ' · ', h('span', { class: 'tnum' }, amt));

// ── ALBUM (moodboard + measurements) ───────────────────────────────────────
function albumScreen() {
  const ideas = coll('moodboard_items').slice().reverse();
  const measures = coll('surfaces').slice().reverse();

  const ideaGrid = h('div', { class: 'm-grid' }, ...ideas.map((i) => {
    const comment = i.comment || i.url || '';
    return h('div', { class: 'm-idea' },
      h('div', { class: 'm-row-between' },
        h('span', { style: { fontSize: '9.5px', fontWeight: 800, color: 'var(--teal)', letterSpacing: '0.08em' } }, t('mIdeaTag')),
        h('span', { style: { fontSize: '10px', fontWeight: 700, color: 'var(--muted2)' } }, '♥ ' + (i.likes || 0))),
      h('div', { style: { fontWeight: 700, fontSize: '12.5px', lineHeight: 1.3 } }, i.title),
      h('div', { style: { fontSize: '10.5px', color: 'var(--muted2)' } }, roomName(i.room_id)),
      comment ? h('div', { style: { fontSize: '11px', color: 'var(--muted)', fontStyle: 'italic', lineHeight: 1.35 } }, comment) : null);
  }));

  const measureGrid = h('div', { class: 'm-grid' }, ...measures.map((m) => h('div', { class: 'm-measure' },
    h('span', { style: { fontSize: '9.5px', fontWeight: 800, color: 'var(--teal)', letterSpacing: '0.08em' } }, t('mMeasureTag')),
    h('span', { class: 'tnum', style: { fontWeight: 700, fontSize: '17px', color: 'var(--ink)' } }, m.height_cm ? dim(m.width_cm) + ' × ' + dim(m.height_cm) + ' μ' : dim(m.width_cm) + ' μ'),
    h('span', { style: { fontSize: '10.5px', color: 'var(--muted)' } }, roomName(m.room_id) + (m.label ? ' — ' + m.label : '')),
    m.notes ? h('span', { style: { fontSize: '10.5px', color: 'var(--muted2)' } }, m.notes) : null)));

  return h('div', { class: 'm-screen' },
    h('div', { style: { paddingTop: '4px' } },
      h('div', { class: 'm-title', style: { padding: 0 } }, t('mAlbum')),
      h('div', { class: 'm-sub', style: { marginTop: '2px' } }, t('mAlbumSub'))),
    eyebrow(t('mIdeas')), ideas.length ? ideaGrid : emptyNote(),
    eyebrow(t('mMeasures')), measures.length ? measureGrid : emptyNote());
}
const emptyNote = () => h('div', { class: 'm-sub', style: { padding: '2px 0 4px' } }, '—');

// ── BOTTOM NAV ─────────────────────────────────────────────────────────────
function navItem(tab, label, iconShape, active) {
  return h('div', { class: 'm-nav-item', onclick: () => go(tab) },
    h('span', { class: 'm-nav-ico ' + iconShape + (active ? ' on' : '') }, iconShape === 'euro' ? '€' : ''),
    h('span', { class: 'm-nav-lbl' + (active ? ' on' : '') }, label));
}
function bottomNav() {
  const tab = mob.tab;
  const homeActive = tab === 'home' || tab === 'timeline';
  return h('div', { class: 'm-nav' },
    navItem('home', t('mHome'), 'sq', homeActive),
    navItem('tasks', t('navTasks'), 'sq', tab === 'tasks'),
    h('div', { class: 'm-fab', onclick: () => { mob.sheet = 'menu'; paint(); } }, '+'),
    navItem('costs', t('mCosts'), 'euro', tab === 'costs'),
    navItem('album', t('mAlbum'), 'circ', tab === 'album'));
}

// ── QUICK-ADD SHEET ────────────────────────────────────────────────────────
function field(props) { return h('input', Object.assign({ class: 'm-field' }, props)); }

function menuRow(icon, iconCls, title, sub, onclick, dim) {
  return h('div', { class: 'm-menu-row' + (dim ? ' dim' : '') + (iconCls === 'primary' ? ' hot' : ''), onclick },
    h('span', { class: 'm-menu-ico ' + iconCls }, icon),
    h('div', { style: { flex: 1 } },
      h('div', { style: { fontWeight: 700, fontSize: '14.5px' } }, title),
      h('div', { style: { fontSize: '11.5px', color: 'var(--muted)' } }, sub)),
    dim ? null : h('span', { style: { color: iconCls === 'primary' ? 'var(--teal)' : 'var(--muted2)', fontSize: '18px' } }, '›'));
}

function sheetHeader(title) {
  return h('div', { class: 'm-sheet-hd' },
    h('span', { onclick: () => { mob.sheet = 'menu'; paint(); }, style: { fontSize: '13px', fontWeight: 700, color: 'var(--muted2)' } }, '‹ ' + t('mBack')),
    h('span', { style: { fontWeight: 800, fontSize: '16px' } }, title),
    h('span', { style: { width: '44px' } }));
}
const saveBtn = (label, onclick) => h('div', { class: 'm-save', onclick }, label);
const catSelect = () => selectEl(coll('categories').slice().sort((a, b) => a.sort_order - b.sort_order).map((c) => ({ v: c.id, l: localName(c) })));
const roomSelect = () => selectEl(coll('rooms').map((r) => ({ v: r.id, l: r.name })));
function selectEl(opts) {
  const el = h('select', { class: 'm-field' });
  for (const o of opts) el.append(h('option', { value: o.v }, o.l));
  return el;
}

function sheetBody() {
  const close = () => { mob.sheet = null; paint(); };

  if (mob.sheet === 'menu') {
    return h('div', {},
      h('div', { style: { fontSize: '17px', fontWeight: 800, marginBottom: '4px' } }, t('mAddTitle')),
      h('div', { style: { fontSize: '12px', color: 'var(--muted)', marginBottom: '14px' } }, t('mAddSub')),
      h('div', { style: { display: 'flex', flexDirection: 'column', gap: '8px' } },
        menuRow('€', 'primary', t('mExpense'), t('mExpenseSub'), () => { mob.sheet = 'expense'; paint(); }),
        menuRow('✓', 'ghost', t('navTasks'), t('mTaskSub'), () => { mob.sheet = 'task'; paint(); }),
        menuRow('⤢', 'ghost', t('mMeasure'), t('mMeasureSub'), () => { mob.sheet = 'measure'; paint(); }),
        menuRow('♥', 'ghost', t('mIdea'), t('mIdeaSub'), () => { mob.sheet = 'idea'; paint(); }),
        menuRow('◔', 'ghost', t('mPhoto'), t('mComingSoon'), null, true)));
  }

  if (mob.sheet === 'expense') {
    const amount = field({ inputmode: 'decimal', placeholder: '0,00', class: 'm-field m-amount' });
    const desc = field({ placeholder: t('mDescPlaceholder') });
    const cat = catSelect();
    const contractor = field({ placeholder: t('mContractorOpt') });
    const save = async () => {
      const a = parseNum(amount.value);
      if (!a || !desc.value.trim()) return;
      mob.sheet = null; mob.tab = 'costs';
      await store.create('cost_items', { category_id: cat.value, task_id: null, description: desc.value.trim(), planned_cost: a, actual_cost: a, status: 'paid', contractor: contractor.value.trim(), date: new Date().toISOString().slice(0, 10), has_receipt: false });
      await store.logActivity({ el: 'Νέο έξοδο: ' + desc.value.trim() + ' — ' + eur(a) + ' €', en: 'New expense: ' + desc.value.trim() });
    };
    return h('div', {}, sheetHeader(t('mNewExpense')),
      amount, h('div', { style: { textAlign: 'center', fontSize: '11px', color: 'var(--muted2)', marginBottom: '12px' } }, t('mAmountEur')),
      desc, cat, contractor, saveBtn(t('mSaveExpense'), save), savedNote());
  }

  if (mob.sheet === 'task') {
    const title = field({ placeholder: t('mTaskTitle') });
    const cat = catSelect();
    const contractor = field({ placeholder: t('mContractorOpt') });
    const save = async () => {
      if (!title.value.trim()) return;
      mob.sheet = null; mob.tab = 'tasks';
      await store.create('tasks', { category_id: cat.value, title: title.value.trim(), status: 'pending', priority: 'medium', dependency_note: '', contractor: contractor.value.trim(), notes: '' });
      await store.logActivity({ el: 'Νέα εργασία: ' + title.value.trim(), en: 'New task: ' + title.value.trim() });
    };
    return h('div', {}, sheetHeader(t('mNewTask')), title, cat, contractor, saveBtn(t('mSaveTask'), save), savedNote());
  }

  if (mob.sheet === 'measure') {
    const title = field({ placeholder: t('mMeasureWhat') });
    const w = field({ inputmode: 'decimal', placeholder: t('colWidth'), class: 'm-field tnum' });
    const hh = field({ inputmode: 'decimal', placeholder: t('colHeight'), class: 'm-field tnum' });
    const room = roomSelect();
    const save = async () => {
      const wv = parseNum(w.value);
      if (!title.value.trim() || !wv) return;
      const hv = parseNum(hh.value) || 0;
      mob.sheet = null; mob.tab = 'album';
      await store.create('surfaces', { room_id: room.value, type: 'wall', label: title.value.trim(), width_cm: wv, height_cm: hv, notes: t('mFromPhone') });
      await store.logActivity({ el: 'Νέα μέτρηση: ' + title.value.trim(), en: 'New measurement: ' + title.value.trim() });
    };
    return h('div', {}, sheetHeader(t('mNewMeasure')), title,
      h('div', { style: { display: 'flex', gap: '10px' } }, w, hh),
      room, saveBtn(t('mSaveMeasure'), save), savedNote());
  }

  if (mob.sheet === 'idea') {
    const title = field({ placeholder: t('mIdeaTitle') });
    const room = roomSelect();
    const note = field({ placeholder: t('mIdeaComment') });
    const save = async () => {
      if (!title.value.trim()) return;
      const isLink = /^https?:\/\//.test(note.value.trim());
      mob.sheet = null; mob.tab = 'album';
      await store.create('moodboard_items', { url: isLink ? note.value.trim() : '', image_ref: null, title: title.value.trim(), room_id: room.value, comment: isLink ? '' : note.value.trim(), likes: 0 });
      await store.logActivity({ el: 'Νέα ιδέα στο moodboard: «' + title.value.trim() + '»', en: 'New moodboard idea: ' + title.value.trim() });
    };
    return h('div', {}, sheetHeader(t('mNewIdea')), title, room, note, saveBtn(t('mSaveIdea'), save), savedNote());
  }
  return null;
}
const savedNote = () => h('div', { style: { textAlign: 'center', fontSize: '11px', color: 'var(--muted2)', marginTop: '10px' } }, t('mSavedToProject'));

function sheet() {
  return h('div', {},
    h('div', { class: 'm-overlay', onclick: () => { mob.sheet = null; paint(); } }),
    h('div', { class: 'm-sheet' },
      h('div', { class: 'm-sheet-grab' }),
      sheetBody()));
}

// ── ACCOUNT MENU (logout / switch project / language / password) ────────────
function accountSheet() {
  const close = () => { mob.account = false; paint(); };
  const row = (label, value, onclick) => h('div', { class: 'm-menu-row', onclick },
    h('div', { style: { flex: 1, fontWeight: 600, fontSize: '14px' } }, label),
    value ? h('span', { style: { fontSize: '13px', color: 'var(--muted)' } }, value) : null,
    h('span', { style: { color: 'var(--muted2)', fontSize: '18px' } }, '›'));
  return h('div', {},
    h('div', { class: 'm-overlay', onclick: close }),
    h('div', { class: 'm-sheet' },
      h('div', { class: 'm-sheet-grab' }),
      h('div', { style: { fontSize: '17px', fontWeight: 800, marginBottom: '2px' } }, state.user ? state.user.display_name : ''),
      h('div', { style: { fontSize: '12px', color: 'var(--muted)', marginBottom: '14px' } }, state.user ? state.user.email : ''),
      h('div', { style: { display: 'flex', flexDirection: 'column', gap: '8px' } },
        row(t('changeProject'), currentProject() ? currentProject().name : '', () => { close(); clearProject(); store.rerender(); }),
        row(t('mLanguage'), state.lang === 'el' ? 'Ελληνικά' : 'English', () => { setLang(state.lang === 'el' ? 'en' : 'el'); }),
        row(t('changePassword'), '', () => { close(); openPasswordModal(_root, { forced: false }); }),
        h('div', { class: 'm-save', style: { background: 'var(--danger)', marginTop: '4px' }, onclick: async () => { await api.logout(); location.reload(); } }, t('logout')))));
}

// ── SHELL ──────────────────────────────────────────────────────────────────
export function renderMobile(root) {
  _root = root;
  root.replaceChildren();

  if (!state.data) {
    root.append(h('div', { class: 'm-app' },
      h('div', { class: 'm-loader' },
        h('div', { class: 'm-logo', style: { width: '56px', height: '56px', fontSize: '26px', borderRadius: '14px' } }, 'R'),
        h('div', { style: { fontWeight: 800, fontSize: '18px' } }, t('appTitle')),
        h('div', { style: { fontSize: '12.5px', color: 'var(--muted2)' } }, t('mLoading')))));
    return;
  }

  const d = derive();
  const screen = mob.tab === 'tasks' ? tasksScreen(d)
    : mob.tab === 'timeline' ? timelineScreen(d)
    : mob.tab === 'costs' ? costsScreen(d)
    : mob.tab === 'album' ? albumScreen()
    : homeScreen(d);

  root.append(h('div', { class: 'm-app' },
    h('div', { class: 'm-scroll' }, screen),
    bottomNav(),
    mob.sheet ? sheet() : null,
    mob.account ? accountSheet() : null));
}
