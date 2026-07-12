import { h, svgEl } from '../ui.js';
import { coll } from '../state.js';
import * as store from '../state.js';
import { api } from '../api.js';
import { t } from '../i18n.js';
import { glbToWalls } from '../glb.js';

// Local (non-persisted) editor UI state.
const ed = { zoom: 1, showDims: false, sel: null, converting: false };
const CANVAS_W = 900, CANVAS_H = 620, GRID = 40;

// plan_rooms rows: { id, x, y, w, h, name }.  plan_walls rows: { id, x1,y1,x2,y2 }.
// Persist geometry only at drag end (mouseup); during drag we mutate the DOM.

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

export default function render(root) {
  const rebuild = () => { root.replaceChildren(); build(); };

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
            if (scale) await api.patchSettings({ plan_scale: Math.round(scale * 100) / 100 }); // real measurements from the fit
            await api.bulkCreate('plan_walls', walls);
          });
        } catch (err) {
          ed.converting = false;
          console.error('GLB convert failed', err);
          rebuild();
        }
      } });
    const fileImg = h('input', { type: 'file', accept: 'image/*', style: { display: 'none' },
      onchange: async (e) => { const f = e.target.files[0]; if (!f) return; const r = await api.upload(f); await store.create('plan_underlays', { kind: 'image', file: r.name, w: CANVAS_W, h: CANVAS_H, opacity: 0.6 }); } });
    return h('div', { class: 'plan-toolbar' },
      h('button', { class: 'btn-ghost', onclick: () => store.create('plan_rooms', { x: 60, y: 60, w: 180, h: 130, name: t('addPlanRoom') }) }, '▢ ' + t('addPlanRoom')),
      h('button', { class: 'btn-ghost', onclick: () => store.create('plan_walls', { x1: 80, y1: 200, x2: 320, y2: 200 }) }, '／ ' + t('addPlanWall')),
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
    const rooms = coll('plan_rooms');
    const walls = coll('plan_walls');
    const underlay = coll('plan_underlays').find((u) => u.kind === 'image');
    const scale = store.settings().plan_scale || 50;      // px per metre
    const metres = (px) => (px / scale).toFixed(2) + ' m';

    const svg = svgEl('svg', { class: 'plan-svg', viewBox: `0 0 ${CANVAS_W} ${CANVAS_H}`, onmousedown: () => { ed.sel = null; rebuild(); } });
    const g = svgEl('g', { transform: `scale(${ed.zoom})` });
    svg.append(g);

    // grid
    for (let x = 0; x <= CANVAS_W; x += GRID) g.append(svgEl('line', { x1: x, y1: 0, x2: x, y2: CANVAS_H, stroke: '#eef2f3', 'stroke-width': 1, 'vector-effect': 'non-scaling-stroke' }));
    for (let y = 0; y <= CANVAS_H; y += GRID) g.append(svgEl('line', { x1: 0, y1: y, x2: CANVAS_W, y2: y, stroke: '#eef2f3', 'stroke-width': 1, 'vector-effect': 'non-scaling-stroke' }));

    if (underlay) g.append(svgEl('image', { href: '/files/' + underlay.file, x: 0, y: 0, width: underlay.w || CANVAS_W, height: underlay.h || CANVAS_H, opacity: underlay.opacity ?? 0.6, preserveAspectRatio: 'none', style: { pointerEvents: 'none' } }));

    // rooms
    for (const rm of rooms) {
      const selected = ed.sel && ed.sel.type === 'plan_rooms' && ed.sel.id === rm.id;
      const rect = svgEl('rect', { x: rm.x, y: rm.y, width: rm.w, height: rm.h, rx: 4,
        fill: 'rgba(31,78,95,0.08)', stroke: selected ? 'var(--teal)' : '#8fa9b2', 'stroke-width': selected ? 2 : 1.5, 'vector-effect': 'non-scaling-stroke', style: { cursor: 'move' } });
      rect.addEventListener('mousedown', (e) => {
        e.stopPropagation(); ed.sel = { type: 'plan_rooms', id: rm.id }; const ox = rm.x, oy = rm.y;
        drag(svg, g, e, (dx, dy) => { rect.setAttribute('x', ox + dx); rect.setAttribute('y', oy + dy); },
          () => store.update('plan_rooms', rm.id, { x: +rect.getAttribute('x'), y: +rect.getAttribute('y') }));
      });
      g.append(rect);
      g.append(svgEl('text', { x: rm.x + rm.w / 2, y: rm.y + rm.h / 2, 'text-anchor': 'middle', fill: '#35606e', 'font-weight': 700, 'font-size': 13, style: { pointerEvents: 'none' } }, rm.name || ''));
      if (ed.showDims) g.append(svgEl('text', { x: rm.x + rm.w / 2, y: rm.y + rm.h / 2 + 16, 'text-anchor': 'middle', fill: 'var(--muted2)', 'font-size': 10, style: { pointerEvents: 'none' } }, `${metres(rm.w)} × ${metres(rm.h)}`));
      if (selected) {
        const hd = svgEl('rect', { x: rm.x + rm.w - 6, y: rm.y + rm.h - 6, width: 12, height: 12, fill: 'var(--teal)', style: { cursor: 'nwse-resize' } });
        hd.addEventListener('mousedown', (e) => { e.stopPropagation(); const ow = rm.w, oh = rm.h;
          drag(svg, g, e, (dx, dy) => { rect.setAttribute('width', Math.max(20, ow + dx)); rect.setAttribute('height', Math.max(20, oh + dy)); },
            () => store.update('plan_rooms', rm.id, { w: +rect.getAttribute('width'), h: +rect.getAttribute('height') })); });
        g.append(hd);
      }
    }

    // walls
    for (const wl of walls) {
      const selected = ed.sel && ed.sel.type === 'plan_walls' && ed.sel.id === wl.id;
      const line = svgEl('line', { x1: wl.x1, y1: wl.y1, x2: wl.x2, y2: wl.y2, stroke: selected ? 'var(--teal)' : '#4f483d', 'stroke-width': 6, 'stroke-linecap': 'round', style: { cursor: 'move' } });
      line.addEventListener('mousedown', (e) => { e.stopPropagation(); ed.sel = { type: 'plan_walls', id: wl.id };
        const o = { x1: wl.x1, y1: wl.y1, x2: wl.x2, y2: wl.y2 };
        drag(svg, g, e, (dx, dy) => { line.setAttribute('x1', o.x1 + dx); line.setAttribute('y1', o.y1 + dy); line.setAttribute('x2', o.x2 + dx); line.setAttribute('y2', o.y2 + dy); },
          () => store.update('plan_walls', wl.id, { x1: +line.getAttribute('x1'), y1: +line.getAttribute('y1'), x2: +line.getAttribute('x2'), y2: +line.getAttribute('y2') })); });
      g.append(line);
      if (ed.showDims) {
        const len = Math.hypot(wl.x2 - wl.x1, wl.y2 - wl.y1);
        g.append(svgEl('text', { x: (wl.x1 + wl.x2) / 2, y: (wl.y1 + wl.y2) / 2 - 8, 'text-anchor': 'middle', fill: '#4f483d', 'font-size': 10, style: { pointerEvents: 'none' } }, metres(len)));
      }
      if (selected) {
        for (const [ex, ey, k1, k2] of [[wl.x1, wl.y1, 'x1', 'y1'], [wl.x2, wl.y2, 'x2', 'y2']]) {
          const c = svgEl('circle', { cx: ex, cy: ey, r: 7, fill: '#fff', stroke: 'var(--teal)', 'stroke-width': 2, style: { cursor: 'crosshair' } });
          c.addEventListener('mousedown', (e) => { e.stopPropagation(); const oX = ex, oY = ey;
            drag(svg, g, e, (dx, dy) => { c.setAttribute('cx', oX + dx); c.setAttribute('cy', oY + dy); line.setAttribute(k1, oX + dx); line.setAttribute(k2, oY + dy); },
              () => store.update('plan_walls', wl.id, { [k1]: +c.getAttribute('cx'), [k2]: +c.getAttribute('cy') })); });
          g.append(c);
        }
      }
    }

    const canvasCard = h('div', { class: 'card', style: { overflow: 'hidden', position: 'relative' } }, toolbar(), svg);
    if (!rooms.length && !walls.length && !underlay) {
      canvasCard.append(h('div', { class: 'hint', style: { position: 'absolute', left: 0, right: 0, top: '55%', textAlign: 'center', padding: '0 40px' } }, t('planEmptyHint')));
    }

    // selected element actions (delete) + underlay opacity
    const dimInput = (val, onSet) => h('input', { type: 'number', step: '0.05', min: '0.1', value: val,
      class: 'field', style: { width: '70px', padding: '5px 8px', fontSize: '12px' },
      onchange: (e) => { const m = Number(e.target.value); if (m > 0) onSet(m); } });

    const sideBits = [];
    // Precise measurement entry for the selected element (metres → pixels).
    if (ed.sel && ed.sel.type === 'plan_walls') {
      const w = coll('plan_walls').find((x) => x.id === ed.sel.id);
      if (w) {
        const L = Math.hypot(w.x2 - w.x1, w.y2 - w.y1) || 1;
        sideBits.push(h('label', { class: 'hint', style: { display: 'flex', gap: '4px', alignItems: 'center' } }, t('length'),
          dimInput((L / scale).toFixed(2), (m) => {
            const ux = (w.x2 - w.x1) / L, uy = (w.y2 - w.y1) / L, npx = m * scale;
            store.update('plan_walls', w.id, { x2: Math.round(w.x1 + ux * npx), y2: Math.round(w.y1 + uy * npx) });
          }), 'm'));
      }
    }
    if (ed.sel && ed.sel.type === 'plan_rooms') {
      const rm = coll('plan_rooms').find((x) => x.id === ed.sel.id);
      if (rm) sideBits.push(h('label', { class: 'hint', style: { display: 'flex', gap: '4px', alignItems: 'center' } },
        dimInput((rm.w / scale).toFixed(2), (m) => store.update('plan_rooms', rm.id, { w: Math.round(m * scale) })), '×',
        dimInput((rm.h / scale).toFixed(2), (m) => store.update('plan_rooms', rm.id, { h: Math.round(m * scale) })), 'm'));
    }
    if (ed.sel) sideBits.push(h('button', { class: 'btn-ghost', onclick: () => { store.remove(ed.sel.type, ed.sel.id); ed.sel = null; } }, t('delete')));
    if (underlay) sideBits.push(h('label', { class: 'hint', style: { display: 'flex', gap: '6px', alignItems: 'center' } }, t('showDims'),
      h('input', { type: 'range', min: 0.1, max: 1, step: 0.05, value: underlay.opacity ?? 0.6, style: { accentColor: 'var(--teal)' }, onchange: (e) => store.update('plan_underlays', underlay.id, { opacity: Number(e.target.value) }) }),
      h('button', { class: 'del-btn', onclick: () => store.remove('plan_underlays', underlay.id) }, '×')));

    const parts = [h('div', { class: 'row-between' }, h('h1', { class: 'page-title', style: { flex: 1 } }, t('navPlan')),
      ...sideBits), h('div', { class: 'hint' }, t('planHint')), canvasCard];

    root.append(h('section', { class: 'section' }, ...parts));
  }
  build();
}
