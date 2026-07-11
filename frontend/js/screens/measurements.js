import { h, select } from '../ui.js';
import { coll } from '../state.js';
import * as store from '../state.js';
import { api } from '../api.js';
import { t } from '../i18n.js';

const SGRID = '120px minmax(160px,1.4fr) 110px 110px minmax(160px,1fr) 36px';
const typeOptions = () => [
  { value: 'floor', label: t('surfFloor') },
  { value: 'wall', label: t('surfWall') },
  { value: 'opening', label: t('surfOpening') },
];
const floorOptions = () => [{ value: 0, label: t('ground') }, { value: 1, label: t('upper') }];

function sInput(row, field, type = 'text') {
  return h('input', {
    class: 'cell-input', value: row[field] ?? '', type,
    style: type === 'number' ? { textAlign: 'right' } : {},
    onchange: (e) => store.update('surfaces', row.id, { [field]: type === 'number' ? Number(e.target.value) : e.target.value }),
  });
}

function surfaceRow(s) {
  return h('div', { class: 'grid-row', style: { gridTemplateColumns: SGRID } },
    h('div', { style: { borderRight: 'none', padding: '4px 8px' } }, select(s.type, typeOptions(), (v) => store.update('surfaces', s.id, { type: v }), 'cell-input')),
    h('div', { style: { borderRight: 'none' } }, sInput(s, 'label')),
    h('div', { class: 'num', style: { borderRight: 'none' } }, sInput(s, 'width_cm', 'number')),
    h('div', { class: 'num', style: { borderRight: 'none' } }, sInput(s, 'height_cm', 'number')),
    h('div', { style: { borderRight: 'none' } }, sInput(s, 'notes')),
    h('div', { style: { borderRight: 'none', textAlign: 'center' } },
      h('button', { class: 'del-btn', title: t('delete'), onclick: () => store.remove('surfaces', s.id) }, '×')));
}

function roomCard(room) {
  const surfaces = coll('surfaces').filter((s) => s.room_id === room.id);
  const head = h('div', { class: 'group-hd', style: { flexWrap: 'wrap' } },
    h('input', { class: 'field', value: room.name, style: { fontWeight: 700, minWidth: '160px', border: '1px solid transparent', background: 'transparent' }, onchange: (e) => store.update('rooms', room.id, { name: e.target.value }) }),
    select(room.floor_level, floorOptions(), (v) => store.update('rooms', room.id, { floor_level: Number(v) }), 'btn-ghost'),
    h('span', { class: 'hint' }, surfaces.length + ' ' + t('addSurface').toLowerCase()),
    h('span', { style: { flex: 1 } }),
    h('button', { class: 'btn-dashed', onclick: () => store.create('surfaces', { room_id: room.id, type: 'wall', label: '', width_cm: 0, height_cm: 0 }) }, '+ ' + t('addSurface')),
    h('button', { class: 'del-btn', title: t('delete'), onclick: () => store.remove('rooms', room.id) }, '×'));
  const gridHead = h('div', { class: 'grid-head', style: { gridTemplateColumns: SGRID, background: 'transparent', borderBottom: '1px solid var(--line2)' } },
    ...[t('colType'), t('colLabel')].map((x) => h('div', {}, x)),
    ...[t('colWidth'), t('colHeight')].map((x) => h('div', { class: 'num' }, x)), h('div', {}, t('colNotes')), h('div', {}));
  return h('div', { class: 'card', style: { overflow: 'hidden' } }, head,
    h('div', { class: 'grid-scroll' }, h('div', { style: { minWidth: '620px' } }, gridHead, ...surfaces.map(surfaceRow))));
}

function download(name, text) {
  const blob = new Blob([text], { type: 'application/json' });
  const a = h('a', { href: URL.createObjectURL(blob), download: name });
  document.body.append(a); a.click(); a.remove();
}

export default function render(root) {
  const rooms = coll('rooms');
  root.append(h('section', { class: 'section' },
    h('div', { class: 'row-between' }, h('h1', { class: 'page-title', style: { flex: 1 } }, t('navMeasurements')),
      h('button', { class: 'btn-ghost', onclick: async () => download('kampos-measurements.json', JSON.stringify(await api.exportMeasurements(), null, 2)) }, '⤓ ' + t('exportJson'))),
    h('div', { class: 'hint' }, t('measurementsHint')),
    ...rooms.map(roomCard),
    h('div', {}, h('button', { class: 'btn-dashed', onclick: () => store.create('rooms', { name: t('addRoom'), floor_level: 0 }) }, '+ ' + t('addRoom')))));
}
