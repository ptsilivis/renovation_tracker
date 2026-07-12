import { h, svgEl } from '../ui.js';
import { coll } from '../state.js';
import * as store from '../state.js';
import { api } from '../api.js';
import { t } from '../i18n.js';
import { glbToWalls } from '../glb.js';

// Local (non-persisted) editor UI state. `selected` is a list of {type,id}.
const ed = { zoom: 1, showDims: false, selected: [], converting: false, floor: 0, savedFlash: false };
const CANVAS_W = 900, CANVAS_H = 620, GRID = 40;
const onFloor = (el) => (el.floor ?? 0) === ed.floor;

const selKey = (s) => `${s.type}:${s.id}`;
const isSel = (type, id) => ed.selected.some((s) => s.type === type && s.id === id);
const toggleSel = (type, id) => {
  const i = ed.selected.findIndex((s) => s.type === type && s.id === id);
  if (i >= 0) ed.selected.splice(i, 1); else ed.selected.push({ type, id });
};
function deleteSelected() {
  if (!ed.selected.length) return;
  const byType = {};
  for (const s of ed.selected) (byType[s.type] = byType[s.type] || []).push(s.id);
  ed.selected = [];
  store.mutate(async () => { for (const c of Object.keys(byType)) await api.bulkDelete(c, byType[c]); });
}

function screenToUser(svg, gEl, evt) {
  const pt = svg.createSVGPoint();
  pt.x = evt.clientX; pt.y = evt.clientY;
  const m = gEl.getScreenCTM();
  if (!m) return { x: 0, y: 0 };
  const p = pt.matrixTransform(m.inverse());
  return { x: p.x, y: p.y };
}

function drag(svg, gEl, evt, onMove, onEnd) {
  evt.preventDefault();
  const start = screenToUser(svg, gEl, evt);
  const move = (e) => { const p = screenToUser(svg, gEl, e); onMove(p.x - start.x, p.y - start.y, p); };
  const up = () => { document.removeEventListener('mousemove', move); document.removeEventListener('mouseup', up); onEnd(); };
  document.addEventListener('mousemove', move);
  document.addEventListener('mouseup', up);
}

// Keyboard: Delete removes the selection, Escape clears it. Bound once.
let kbBound = false;
function bindKeys(rerender) {
  if (kbBound) return;
  kbBound = true;
  document.addEventListener('keydown', (e) => {
    if (!location.hash.includes('plan')) return;
    const tag = (e.target.tagName || '').toLowerCase();
    if (tag === 'input' || tag === 'textarea' || e.target.isContentEditable) return;
    if ((e.key === 'Delete' || e.key === 'Backspace') && ed.selected.length) { e.preventDefault(); deleteSelected(); }
    else if (e.key === 'Escape' && ed.selected.length) { ed.selected = []; rerender(); }
  });
}

export default function render(root) {
  const rebuild = () => { root.replaceChildren(); build(); };
  bindKeys(rebuild);

  function toolbar() {
    const fileGlb = h('input', { type: 'file', accept: '.glb,.gltf', style: { display: 'none' },
      onchange: async (e) => {
        const f = e.target.files[0]; if (!f) return;
        ed.converting = true; rebuild();
        try {
          const r = await api.upload(f);
          const { walls, scale } = await glbToWalls(r.url, CANVAS_W, CANVAS_H);
          ed.converting = false;
          if (!walls.length) { rebuild(); return; }
          await store.mutate(async () => {
            if (scale) await api.patchSettings({ plan_scale: Math.round(scale * 100) / 100 });
            await api.bulkCreate('plan_walls', walls.map((w) => ({ ...w, floor: ed.floor })));
          });
        } catch (err) { ed.converting = false; console.error('GLB convert failed', err); rebuild(); }
      } });
    const fileImg = h('input', { type: 'file', accept: 'image/*', style: { display: 'none' },
      onchange: async (e) => { const f = e.target.files[0]; if (!f) return; const r = await api.upload(f); await store.create('plan_underlays', { kind: 'image', file: r.name, w: CANVAS_W, h: CANVAS_H, opacity: 0.6, floor: ed.floor }); } });
    return h('div', { class: 'plan-toolbar' },
      h('button', { class: 'btn-ghost', onclick: () => store.create('plan_rooms', { x: 60, y: 60, w: 180, h: 130, name: t('addPlanRoom'), floor: ed.floor }) }, '▢ ' + t('addPlanRoom')),
      h('button', { class: 'btn-ghost', onclick: () => store.create('plan_walls', { x1: 80, y1: 200, x2: 320, y2: 200, kind: 'wall', floor: ed.floor }) }, '／ ' + t('addPlanWall')),
      h('button', { class: 'btn-ghost', onclick: () => store.create('plan_walls', { x1: 120, y1: 320, x2: 260, y2: 320, kind: 'furniture', floor: ed.floor }) }, '🛋 ' + t('addFurniture')),
      h('button', { class: ed.showDims ? 'btn' : 'btn-ghost', style: { borderRadius: '8px' }, onclick: () => { ed.showDims = !ed.showDims; rebuild(); } }, '⟷ ' + t('showDims')),
      h('div', { style: { display: 'flex', gap: '2px' } },
        h('button', { class: 'btn-ghost', onclick: () => { ed.zoom = Math.max(0.4, ed.zoom - 0.1); rebuild(); } }, '−'),
        h('button', { class: 'btn-ghost', onclick: () => { ed.zoom = Math.min(2.5, ed.zoom + 0.1); rebuild(); } }, '+')),
      h('label', { class: 'btn-dashed' }, (ed.converting ? '… ' : '⤒ ') + t('importGlb'), fileGlb),
      h('label', { class: 'btn-dashed' }, '🖼', fileImg),
      h('label', { class: 'hint', style: { display: 'flex', gap: '4px', alignItems: 'center' } }, t('scale'),
        h('input', { type: 'number', min: '5', step: '5', value: store.settings().plan_scale || 50, class: 'field', style: { width: '66px', padding: '5px 8px', fontSize: '12px' }, title: t('scaleHint'),
          onchange: (e) => { const v = Number(e.target.value); if (v >= 5) store.patchSettings({ plan_scale: v }); } }), 'px/m'));
  }

  function build() {
    const rooms = coll('plan_rooms').filter(onFloor);
    const walls = coll('plan_walls').filter(onFloor);
    const underlay = coll('plan_underlays').find((u) => u.kind === 'image' && onFloor(u));
    const scale = store.settings().plan_scale || 50;
    const metres = (px) => (px / scale).toFixed(2) + ' m';
    const single = ed.selected.length === 1 ? ed.selected[0] : null;

    const svg = svgEl('svg', { class: 'plan-svg', viewBox: `0 0 ${CANVAS_W} ${CANVAS_H}` });
    const g = svgEl('g', { transform: `scale(${ed.zoom})` });
    svg.append(g);
    const itemMap = new Map(); // key -> { type, id, base, move(dx,dy), patch(dx,dy) }

    for (let x = 0; x <= CANVAS_W; x += GRID) g.append(svgEl('line', { x1: x, y1: 0, x2: x, y2: CANVAS_H, stroke: '#eef2f3', 'stroke-width': 1, 'vector-effect': 'non-scaling-stroke' }));
    for (let y = 0; y <= CANVAS_H; y += GRID) g.append(svgEl('line', { x1: 0, y1: y, x2: CANVAS_W, y2: y, stroke: '#eef2f3', 'stroke-width': 1, 'vector-effect': 'non-scaling-stroke' }));
    if (underlay) g.append(svgEl('image', { href: '/files/' + underlay.file, x: 0, y: 0, width: underlay.w || CANVAS_W, height: underlay.h || CANVAS_H, opacity: underlay.opacity ?? 0.6, preserveAspectRatio: 'none', style: { pointerEvents: 'none' } }));

    // Start a (possibly group) move when pressing a selected element.
    const startMove = (item, e) => {
      e.stopPropagation();
      if (e.shiftKey) { toggleSel(item.type, item.id); rebuild(); return; }
      if (!isSel(item.type, item.id)) ed.selected = [{ type: item.type, id: item.id }];
      const items = ed.selected.map((s) => itemMap.get(selKey(s))).filter(Boolean);
      let ldx = 0, ldy = 0;
      drag(svg, g, e, (dx, dy) => { ldx = dx; ldy = dy; items.forEach((it) => it.gEl.setAttribute('transform', `translate(${dx} ${dy})`)); },
        () => {
          items.forEach((it) => it.gEl.removeAttribute('transform'));
          if (ldx || ldy) store.mutate(async () => { for (const it of items) await api.update(it.type, it.id, it.patch(ldx, ldy)); });
          else rebuild();
        });
    };

    // rooms
    for (const rm of rooms) {
      const sel = isSel('plan_rooms', rm.id);
      const gEl = svgEl('g', {});
      const rect = svgEl('rect', { x: rm.x, y: rm.y, width: rm.w, height: rm.h, rx: 4, fill: 'rgba(31,78,95,0.08)', stroke: sel ? 'var(--teal)' : '#8fa9b2', 'stroke-width': sel ? 2 : 1.5, 'vector-effect': 'non-scaling-stroke', style: { cursor: 'move' } });
      gEl.append(rect,
        svgEl('text', { x: rm.x + rm.w / 2, y: rm.y + rm.h / 2, 'text-anchor': 'middle', fill: '#35606e', 'font-weight': 700, 'font-size': 13, style: { pointerEvents: 'none' } }, rm.name || ''));
      if (ed.showDims) gEl.append(svgEl('text', { x: rm.x + rm.w / 2, y: rm.y + rm.h / 2 + 16, 'text-anchor': 'middle', fill: 'var(--muted2)', 'font-size': 10, style: { pointerEvents: 'none' } }, `${metres(rm.w)} × ${metres(rm.h)}`));
      const item = { type: 'plan_rooms', id: rm.id, gEl, base: { x: rm.x, y: rm.y }, patch: (dx, dy) => ({ x: Math.round(rm.x + dx), y: Math.round(rm.y + dy) }) };
      itemMap.set(selKey(item), item);
      rect.addEventListener('mousedown', (e) => startMove(item, e));
      if (single && single.type === 'plan_rooms' && single.id === rm.id) {
        const hd = svgEl('rect', { x: rm.x + rm.w - 6, y: rm.y + rm.h - 6, width: 12, height: 12, fill: 'var(--teal)', style: { cursor: 'nwse-resize' } });
        hd.addEventListener('mousedown', (e) => { e.stopPropagation(); const ow = rm.w, oh = rm.h;
          drag(svg, g, e, (dx, dy) => { rect.setAttribute('width', Math.max(20, ow + dx)); rect.setAttribute('height', Math.max(20, oh + dy)); },
            () => store.update('plan_rooms', rm.id, { w: +rect.getAttribute('width'), h: +rect.getAttribute('height') })); });
        gEl.append(hd);
      }
      g.append(gEl);
    }

    // walls + furniture
    for (const wl of walls) {
      const furn = wl.kind === 'furniture';
      const sel = isSel('plan_walls', wl.id);
      const gEl = svgEl('g', {});
      const stroke = sel ? 'var(--teal)' : (furn ? '#a9895f' : '#4f483d');
      const line = svgEl('line', { x1: wl.x1, y1: wl.y1, x2: wl.x2, y2: wl.y2, stroke, 'stroke-width': furn ? 3 : 6, 'stroke-linecap': 'round', 'stroke-dasharray': furn ? '2 5' : '', style: { cursor: 'move' } });
      gEl.append(line);
      if (ed.showDims) gEl.append(svgEl('text', { x: (wl.x1 + wl.x2) / 2, y: (wl.y1 + wl.y2) / 2 - 8, 'text-anchor': 'middle', fill: furn ? '#a9895f' : '#4f483d', 'font-size': 10, style: { pointerEvents: 'none' } }, metres(Math.hypot(wl.x2 - wl.x1, wl.y2 - wl.y1))));
      const item = { type: 'plan_walls', id: wl.id, gEl, base: { x1: wl.x1, y1: wl.y1, x2: wl.x2, y2: wl.y2 },
        patch: (dx, dy) => ({ x1: Math.round(wl.x1 + dx), y1: Math.round(wl.y1 + dy), x2: Math.round(wl.x2 + dx), y2: Math.round(wl.y2 + dy) }) };
      itemMap.set(selKey(item), item);
      line.addEventListener('mousedown', (e) => startMove(item, e));
      if (single && single.type === 'plan_walls' && single.id === wl.id) {
        for (const [ex, ey, k1, k2] of [[wl.x1, wl.y1, 'x1', 'y1'], [wl.x2, wl.y2, 'x2', 'y2']]) {
          const c = svgEl('circle', { cx: ex, cy: ey, r: 7, fill: '#fff', stroke: 'var(--teal)', 'stroke-width': 2, style: { cursor: 'crosshair' } });
          c.addEventListener('mousedown', (e) => { e.stopPropagation(); const oX = ex, oY = ey;
            drag(svg, g, e, (dx, dy) => { c.setAttribute('cx', oX + dx); c.setAttribute('cy', oY + dy); line.setAttribute(k1, oX + dx); line.setAttribute(k2, oY + dy); },
              () => store.update('plan_walls', wl.id, { [k1]: +c.getAttribute('cx'), [k2]: +c.getAttribute('cy') })); });
          gEl.append(c);
        }
      }
      g.append(gEl);
    }

    // Empty-canvas press: rubber-band area select (Shift adds to the selection).
    svg.addEventListener('mousedown', (e) => {
      const shift = e.shiftKey;
      const start = screenToUser(svg, g, e);
      const rb = svgEl('rect', { fill: 'rgba(31,78,95,0.08)', stroke: 'var(--teal)', 'stroke-width': 1, 'stroke-dasharray': '4 3', 'vector-effect': 'non-scaling-stroke', style: { pointerEvents: 'none' } });
      g.append(rb);
      let end = start, moved = false;
      drag(svg, g, e, (dx, dy, p) => {
        end = p; moved = Math.abs(dx) > 2 || Math.abs(dy) > 2;
        rb.setAttribute('x', Math.min(start.x, p.x)); rb.setAttribute('y', Math.min(start.y, p.y));
        rb.setAttribute('width', Math.abs(p.x - start.x)); rb.setAttribute('height', Math.abs(p.y - start.y));
      }, () => {
        rb.remove();
        if (!moved) { if (!shift && ed.selected.length) { ed.selected = []; rebuild(); } return; }
        const box = { x1: Math.min(start.x, end.x), y1: Math.min(start.y, end.y), x2: Math.max(start.x, end.x), y2: Math.max(start.y, end.y) };
        const hit = (it) => {
          const b = it.base;
          if (it.type === 'plan_rooms') return !(b.x > box.x2 || b.x + (coll('plan_rooms').find((r) => r.id === it.id)?.w || 0) < box.x1 || b.y > box.y2 || b.y + (coll('plan_rooms').find((r) => r.id === it.id)?.h || 0) < box.y1);
          const inside = (x, y) => x >= box.x1 && x <= box.x2 && y >= box.y1 && y <= box.y2;
          return inside(b.x1, b.y1) || inside(b.x2, b.y2) || inside((b.x1 + b.x2) / 2, (b.y1 + b.y2) / 2);
        };
        const hits = [...itemMap.values()].filter(hit).map((it) => ({ type: it.type, id: it.id }));
        if (shift) { for (const hh of hits) if (!isSel(hh.type, hh.id)) ed.selected.push(hh); }
        else ed.selected = hits;
        rebuild();
      });
    });

    const canvasCard = h('div', { class: 'card', style: { overflow: 'hidden', position: 'relative' } }, toolbar(), svg);
    if (!rooms.length && !walls.length && !underlay) {
      canvasCard.append(h('div', { class: 'hint', style: { position: 'absolute', left: 0, right: 0, top: '55%', textAlign: 'center', padding: '0 40px' } }, t('planEmptyHint')));
    }

    // --- header: floor switch + measurement fields + save/clear ---------------
    const dimInput = (val, onSet) => h('input', { type: 'number', step: '0.05', min: '0.1', value: val, class: 'field', style: { width: '70px', padding: '5px 8px', fontSize: '12px' }, onchange: (e) => { const m = Number(e.target.value); if (m > 0) onSet(m); } });
    const bits = [];
    if (single && single.type === 'plan_walls') {
      const w = coll('plan_walls').find((x) => x.id === single.id);
      if (w) { const L = Math.hypot(w.x2 - w.x1, w.y2 - w.y1) || 1;
        bits.push(h('label', { class: 'hint', style: { display: 'flex', gap: '4px', alignItems: 'center' } }, t('length'),
          dimInput((L / scale).toFixed(2), (m) => { const ux = (w.x2 - w.x1) / L, uy = (w.y2 - w.y1) / L, npx = m * scale;
            store.update('plan_walls', w.id, { x2: Math.round(w.x1 + ux * npx), y2: Math.round(w.y1 + uy * npx) }); }), 'm')); }
    }
    if (single && single.type === 'plan_rooms') {
      const rm = coll('plan_rooms').find((x) => x.id === single.id);
      if (rm) bits.push(h('label', { class: 'hint', style: { display: 'flex', gap: '4px', alignItems: 'center' } },
        dimInput((rm.w / scale).toFixed(2), (m) => store.update('plan_rooms', rm.id, { w: Math.round(m * scale) })), '×',
        dimInput((rm.h / scale).toFixed(2), (m) => store.update('plan_rooms', rm.id, { h: Math.round(m * scale) })), 'm'));
    }
    if (ed.selected.length) bits.push(h('button', { class: 'btn-ghost', onclick: () => deleteSelected() },
      '␡ ' + t('delete') + (ed.selected.length > 1 ? ` (${ed.selected.length})` : '')));

    const floorChips = h('div', { style: { display: 'flex', gap: '4px' } },
      [[0, t('ground')], [1, t('upper')]].map(([lvl, label]) =>
        h('button', { class: 'chip' + (ed.floor === lvl ? ' active' : ''), onclick: () => { ed.floor = lvl; ed.selected = []; rebuild(); } }, label)));

    const save = h('button', { class: 'btn', style: { borderRadius: '8px' }, title: t('saveHint'),
      onclick: async () => { ed.savedFlash = true; rebuild(); await store.loadData(); await new Promise((r) => setTimeout(r, 900)); ed.savedFlash = false; store.rerender(); } },
      ed.savedFlash ? '✓ ' + t('saved') : t('save'));

    const clear = h('button', { class: 'btn-ghost', style: { color: 'var(--accent)' }, onclick: () => {
      const ids = { plan_rooms: rooms.map((r) => r.id), plan_walls: walls.map((w) => w.id), plan_underlays: coll('plan_underlays').filter(onFloor).map((u) => u.id) };
      const total = ids.plan_rooms.length + ids.plan_walls.length + ids.plan_underlays.length;
      if (!total || !window.confirm(t('confirmClearFloor'))) return;
      ed.selected = [];
      store.mutate(async () => { for (const c of Object.keys(ids)) if (ids[c].length) await api.bulkDelete(c, ids[c]); });
    } }, '🗑 ' + t('clearFloor'));

    const header = h('div', { class: 'row-between' },
      h('h1', { class: 'page-title' }, t('navPlan')),
      h('div', { style: { display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' } }, floorChips, ...bits, save, clear));

    root.append(h('section', { class: 'section' }, header, h('div', { class: 'hint' }, t('planHint') + ' · ' + t('multiSelectHint')), canvasCard));
  }
  build();
}
