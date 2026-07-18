import { h, select } from '../ui.js';
import { coll, findById } from '../state.js';
import * as store from '../state.js';
import { api } from '../api.js';
import { t } from '../i18n.js';
import { toastError } from '../toast.js';

const ui = { formOpen: false, roomFilter: '', form: null, imageName: null };
const blankForm = () => ({ url: '', title: '', room_id: (coll('rooms')[0] || {}).id || '', comment: '' });

function faviconFor(url) {
  try { return `https://www.google.com/s2/favicons?domain=${new URL(url).hostname}&sz=32`; } catch { return null; }
}

function card(item) {
  const room = findById('rooms', item.room_id);
  const media = item.image_ref
    ? h('img', { class: 'mood-img', src: '/files/' + item.image_ref, alt: item.title })
    : h('div', { class: 'mood-ph' },
        item.url ? h('img', { src: faviconFor(item.url), width: 24, height: 24, style: { borderRadius: '4px' } }) : null,
        h('span', { style: { fontFamily: 'monospace', fontSize: '11px', color: 'var(--muted)', background: '#fff', padding: '3px 10px', borderRadius: '999px', border: '1px solid var(--line)', maxWidth: '85%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' } },
          item.url ? new URL(item.url).hostname : (item.title || '—')));

  const titleEl = item.url
    ? h('a', { href: item.url, target: '_blank', rel: 'noopener', style: { fontSize: '13.5px', fontWeight: 700, color: 'var(--ink)', lineHeight: 1.3 } }, item.title)
    : h('div', { style: { fontSize: '13.5px', fontWeight: 700, lineHeight: 1.3 } }, item.title);

  return h('div', { class: 'card mood-card' }, media,
    h('div', { style: { padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: '6px', flex: 1 } },
      h('div', { style: { display: 'flex', alignItems: 'flex-start', gap: '8px', justifyContent: 'space-between' } }, titleEl,
        room ? h('span', { class: 'role-badge', style: { flexShrink: 0 } }, room.name) : null),
      item.comment ? h('div', { style: { fontSize: '12.5px', color: '#56606c', lineHeight: 1.4 } }, item.comment) : null,
      h('div', { style: { display: 'flex', alignItems: 'center', gap: '6px', marginTop: 'auto', paddingTop: '6px' } },
        h('button', { class: 'like-btn', onclick: () => store.update('moodboard_items', item.id, { likes: (item.likes || 0) + 1 }) }, '❤ ' + (item.likes || 0)),
        h('span', { style: { flex: 1 } }),
        h('button', { class: 'del-btn', title: t('delete'), onclick: () => store.remove('moodboard_items', item.id) }, '×'))));
}

function form(rebuild) {
  const f = ui.form;
  const roomOpts = coll('rooms').map((r) => ({ value: r.id, label: r.name }));
  const preview = h('span', { style: { fontSize: '12px', color: 'var(--ok)' } }, ui.imageName ? '✓ ' + t('addPhoto') : '');
  return h('div', { style: { background: 'var(--panel)', border: '1px solid var(--chip-line)', borderRadius: '14px', padding: '18px', display: 'flex', flexDirection: 'column', gap: '10px', maxWidth: '560px' } },
    h('div', { style: { fontSize: '13px', fontWeight: 700 } }, t('addIdea')),
    h('input', { class: 'field', placeholder: t('pasteUrlPlaceholder'), value: f.url, oninput: (e) => { f.url = e.target.value; } }),
    h('input', { class: 'field', placeholder: t('titlePlaceholder'), value: f.title, oninput: (e) => { f.title = e.target.value; } }),
    h('div', { style: { display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center' } },
      select(f.room_id, roomOpts, (v) => { f.room_id = v; }),
      h('label', { class: 'btn-dashed', style: { display: 'inline-flex', gap: '8px', alignItems: 'center' } }, t('addPhoto'),
        h('input', { type: 'file', accept: 'image/*', style: { display: 'none' },
          onchange: async (e) => {
            const file = e.target.files[0];
            if (!file) return;
            try { const r = await api.upload(file); ui.imageName = r.name; rebuild(); }
            catch { toastError(t('uploadFailed')); }
          } })),
      preview),
    h('textarea', { class: 'field', rows: 2, placeholder: t('commentPlaceholder'), style: { resize: 'vertical', fontFamily: 'inherit' }, oninput: (e) => { f.comment = e.target.value; } }),
    h('div', { style: { display: 'flex', gap: '8px' } },
      h('button', { class: 'btn', onclick: () => {
        if (!f.title.trim() && !f.url.trim()) return;
        store.create('moodboard_items', { url: f.url, title: f.title || f.url, room_id: f.room_id, comment: f.comment, likes: 0, image_ref: ui.imageName });
        ui.formOpen = false; ui.form = null; ui.imageName = null;
      } }, t('save')),
      h('button', { class: 'btn-ghost', onclick: () => { ui.formOpen = false; ui.form = null; ui.imageName = null; rebuild(); } }, t('cancel'))));
}

export default function render(root) {
  const rebuild = () => { root.replaceChildren(); build(); };
  function build() {
    const rooms = coll('rooms');
    const chips = h('div', { style: { display: 'flex', gap: '6px', flexWrap: 'wrap' } },
      h('button', { class: 'chip' + (ui.roomFilter === '' ? ' active' : ''), onclick: () => { ui.roomFilter = ''; rebuild(); } }, t('allRooms')),
      ...rooms.map((r) => h('button', { class: 'chip' + (ui.roomFilter === r.id ? ' active' : ''), onclick: () => { ui.roomFilter = r.id; rebuild(); } }, r.name)));

    let items = coll('moodboard_items');
    if (ui.roomFilter) items = items.filter((i) => i.room_id === ui.roomFilter);

    root.append(h('section', { class: 'section' },
      h('div', { class: 'row-between' }, h('h1', { class: 'page-title', style: { flex: 1 } }, t('navMoodboard')),
        h('button', { class: 'btn', style: { borderRadius: '999px' }, onclick: () => { ui.formOpen = !ui.formOpen; ui.form = ui.formOpen ? blankForm() : null; ui.imageName = null; rebuild(); } }, '+ ' + t('addIdea'))),
      ui.formOpen ? form(rebuild) : null,
      chips,
      h('div', { class: 'mood-grid' }, items.map(card))));
  }
  build();
}
