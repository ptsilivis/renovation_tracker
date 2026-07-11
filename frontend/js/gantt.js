// Interactive Gantt for the Overview timeline.
// - Project range (settings.project_start/end) frames the horizontal axis.
// - Phase name is editable inline.
// - Drag a bar to shift it; drag its edges to change start / end (month snap).
// - Click empty track to set an optional milestone; click the diamond to clear.
// - Reorder phases with the ▲▼ handles.
import { h } from './ui.js';
import { coll, settings, state } from './state.js';
import * as store from './state.js';
import { api } from './api.js';
import { t, localName } from './i18n.js';

const LABELW = 200;
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const idx = (s) => { const [y, m] = (s || '').split('-').map(Number); return y * 12 + (m - 1); };
const toStr = (i) => `${Math.floor(i / 12)}-${String((i % 12) + 1).padStart(2, '0')}`;
const label = (i) => new Date(Math.floor(i / 12), i % 12, 1).toLocaleDateString(state.lang === 'en' ? 'en-GB' : 'el-GR', { month: 'short', year: '2-digit' });

const COLORS = ['#1f4e5f', '#35606e', '#4d7a86', '#6d9aa2', '#8fb3b8', '#a4442f', '#c06a4f', '#7a8b52'];

// Drag helper: reports whole-month deltas relative to a track's pixel width.
function dragMonths(ev, track, span, onDelta, onEnd) {
  ev.preventDefault(); ev.stopPropagation();
  const rect = track.getBoundingClientRect();
  const per = rect.width / span;
  const x0 = ev.clientX;
  const move = (e) => onDelta(Math.round((e.clientX - x0) / per));
  const up = () => { document.removeEventListener('pointermove', move); document.removeEventListener('pointerup', up); onEnd(); };
  document.addEventListener('pointermove', move);
  document.addEventListener('pointerup', up);
}

export function gantt() {
  const phases = [...coll('phases')].sort((a, b) => a.sort_order - b.sort_order);
  const s = settings();
  // Axis frame: explicit project range, else derived from phases.
  const derivedMin = phases.length ? Math.min(...phases.map((p) => idx(p.start))) : idx('2026-01');
  const derivedMax = phases.length ? Math.max(...phases.map((p) => idx(p.end))) : idx('2026-12');
  const min = s.project_start ? idx(s.project_start) : derivedMin;
  const max = s.project_end ? idx(s.project_end) : derivedMax;
  const span = Math.max(1, max - min + 1);
  const pctL = (i) => (i - min) / span * 100;
  const pctW = (a, b) => (b - a + 1) / span * 100;

  // ---- project range inputs -------------------------------------------------
  const rangeInput = (val, key) => h('input', {
    type: 'month', value: val || toStr(key === 'project_start' ? min : max), class: 'field',
    style: { padding: '5px 8px', fontSize: '12px' },
    onchange: (e) => store.patchSettings({ [key]: e.target.value }),
  });
  const header = h('div', { class: 'row-between', style: { marginBottom: '12px' } },
    h('h2', { style: { margin: 0, fontSize: '14px' } }, t('timeline')),
    h('div', { style: { display: 'flex', gap: '8px', alignItems: 'center' } },
      h('span', { class: 'hint' }, t('projectRange')), rangeInput(s.project_start, 'project_start'),
      h('span', { class: 'hint' }, '→'), rangeInput(s.project_end, 'project_end')));

  // ---- month axis -----------------------------------------------------------
  const months = [];
  for (let i = 0; i < span; i++) months.push(h('div', { class: 'tl-month' }, label(min + i)));
  const axis = h('div', { style: { display: 'flex' } },
    h('div', { style: { width: LABELW + 'px', flexShrink: 0 } }),
    h('div', { style: { flex: 1, display: 'flex' } }, months));

  const now = new Date();
  const todayPct = ((now.getFullYear() * 12 + now.getMonth()) - min + now.getDate() / 30) / span * 100;

  // ---- phase rows -----------------------------------------------------------
  const ROWH = 38;
  const rowEls = [];
  const rows = phases.map((p, i) => {
    let rowEl;
    const color = COLORS[i % COLORS.length];
    let sI = clamp(idx(p.start), min, max);
    let eI = clamp(idx(p.end), sI, max);

    const nameInput = h('input', {
      value: localName(p), 'aria-label': t('phaseName'),
      style: { width: '100%', border: 'none', background: 'transparent', outline: 'none', font: '600 12px Noto Sans, sans-serif', color: '#4f483d', padding: '3px 4px', borderRadius: '6px' },
      onfocus: (e) => { e.target.style.boxShadow = 'inset 0 0 0 2px var(--teal)'; },
      onblur: (e) => { e.target.style.boxShadow = 'none'; },
      onchange: (e) => store.update('phases', p.id, { [state.lang === 'en' ? 'name_en' : 'name_el']: e.target.value }),
    });
    // Drag-to-reorder via a subtle grip (no arrow buttons).
    const grip = h('div', { class: 'gt-grip', title: t('dragReorder') }, '⠿');
    grip.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      const y0 = e.clientY;
      rowEl.style.position = 'relative'; rowEl.style.zIndex = '5'; rowEl.style.opacity = '0.9';
      grip.style.cursor = 'grabbing';
      const mv = (ev) => { rowEl.style.transform = `translateY(${ev.clientY - y0}px)`; };
      const up = (ev) => {
        document.removeEventListener('pointermove', mv);
        document.removeEventListener('pointerup', up);
        rowEl.style.transform = ''; rowEl.style.zIndex = ''; rowEl.style.opacity = ''; grip.style.cursor = '';
        const target = clamp(i + Math.round((ev.clientY - y0) / ROWH), 0, phases.length - 1);
        if (target !== i) {
          const arr = [...phases];
          const [moved] = arr.splice(i, 1);
          arr.splice(target, 0, moved);
          store.mutate(async () => {
            for (let k = 0; k < arr.length; k++) {
              if (arr[k].sort_order !== k + 1) await api.update('phases', arr[k].id, { sort_order: k + 1 });
            }
          });
        }
      };
      document.addEventListener('pointermove', mv);
      document.addEventListener('pointerup', up);
    });
    const labelCell = h('div', { style: { width: LABELW + 'px', flexShrink: 0, display: 'flex', alignItems: 'center', gap: '4px', paddingRight: '10px' } },
      grip, nameInput,
      h('button', { class: 'del-btn', title: t('delete'), onclick: () => store.remove('phases', p.id) }, '×'));

    // track + bar
    const bar = h('div', { class: 'gt-bar', title: `${p.start} → ${p.end}`,
      style: { left: pctL(sI) + '%', width: pctW(sI, eI) + '%', background: color } });
    const hL = h('div', { class: 'gt-handle', style: { left: '-3px', cursor: 'ew-resize' } });
    const hR = h('div', { class: 'gt-handle', style: { right: '-3px', cursor: 'ew-resize' } });
    bar.append(hL, hR);

    const track = h('div', { class: 'gt-track' }, bar);

    const setBar = () => { bar.style.left = pctL(sI) + '%'; bar.style.width = pctW(sI, eI) + '%'; };
    // move whole bar
    bar.addEventListener('pointerdown', (e) => {
      if (e.target !== bar) return; // handles manage themselves
      const s0 = sI, e0 = eI, len = e0 - s0;
      dragMonths(e, track, span, (d) => { sI = clamp(s0 + d, min, max - len); eI = sI + len; setBar(); },
        () => store.update('phases', p.id, { start: toStr(sI), end: toStr(eI) }));
    });
    hL.addEventListener('pointerdown', (e) => { const s0 = sI; dragMonths(e, track, span, (d) => { sI = clamp(s0 + d, min, eI); setBar(); }, () => store.update('phases', p.id, { start: toStr(sI) })); });
    hR.addEventListener('pointerdown', (e) => { const e0 = eI; dragMonths(e, track, span, (d) => { eI = clamp(e0 + d, sI, max); setBar(); }, () => store.update('phases', p.id, { end: toStr(eI) })); });

    // milestone diamond
    if (p.milestone) {
      const mI = clamp(idx(p.milestone), min, max);
      track.append(h('div', { class: 'gt-milestone', title: p.milestone + ' — ' + t('clearMilestone'),
        style: { left: `calc(${pctL(mI) + (100 / span) / 2}% )` },
        onclick: (e) => { e.stopPropagation(); store.update('phases', p.id, { milestone: null }); } }));
    }
    // click empty track → set/move milestone at that month
    track.addEventListener('click', (e) => {
      if (e.target !== track) return;
      const rect = track.getBoundingClientRect();
      const mI = clamp(min + Math.floor((e.clientX - rect.left) / (rect.width / span)), min, max);
      store.update('phases', p.id, { milestone: toStr(mI) });
    });

    rowEl = h('div', { style: { display: 'flex', alignItems: 'center', height: ROWH + 'px' } }, labelCell, track);
    rowEls.push(rowEl);
    return rowEl;
  });

  const barsArea = h('div', { style: { position: 'relative' } }, ...rows);
  if (todayPct >= 0 && todayPct <= 100) {
    barsArea.append(h('div', { class: 'tl-today', style: { left: `calc(${LABELW}px + (100% - ${LABELW}px) * ${todayPct / 100})`, top: 0, bottom: 0 } },
      h('span', { style: { position: 'absolute', top: '-2px', left: '5px', fontSize: '10px', fontWeight: 700, color: 'var(--accent)', whiteSpace: 'nowrap' } }, t('today'))));
  }

  const addBtn = h('button', { class: 'btn-dashed', style: { marginTop: '8px' }, onclick: () => {
    const maxOrder = Math.max(0, ...phases.map((p) => p.sort_order));
    store.create('phases', { name_el: t('newPhase'), name_en: t('newPhase'), start: toStr(min), end: toStr(clamp(min + 1, min, max)), sort_order: maxOrder + 1 });
  } }, '+ ' + t('addPhase'));

  return h('div', { class: 'card card-pad' }, header,
    h('div', { class: 'tl-scroll' }, h('div', { style: { minWidth: '760px' } }, axis, barsArea)),
    h('div', { class: 'hint', style: { marginTop: '8px' } }, t('ganttHint')), addBtn);
}
