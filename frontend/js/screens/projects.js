// Project picker — the first screen after login. Choose which renovation to
// open, or create / rename / delete one. Renders full-page (outside the app
// shell), so it carries its own lightweight top bar.
import { api } from '../api.js';
import { state, enterProject, loadProjects, setLang } from '../state.js';
import { t } from '../i18n.js';
import { h, clear, money } from '../ui.js';

export default function renderPicker(root) {
  let confirmingDelete = null; // id awaiting a second click to confirm delete

  const topbar = () => h('header', { class: 'hdr' },
    h('div', { class: 'hdr-in' },
      h('div', { class: 'brand' },
        h('div', { class: 'logo' }, 'R'),
        h('div', {}, h('div', { class: 'brand-title' }, t('appTitle')), h('div', { class: 'brand-sub' }, t('pickProject'))),
      ),
      h('div', { class: 'hdr-right' },
        h('span', { class: 'role-badge' }, state.user ? state.user.display_name : ''),
        h('button', { class: 'lang-btn', onclick: () => setLang(state.lang === 'el' ? 'en' : 'el') }, state.lang === 'el' ? 'EN' : 'ΕΛ'),
        h('button', { class: 'icon-btn', onclick: async () => { await api.logout(); location.reload(); } }, t('logout')),
      ),
    ),
  );

  const projectCard = (p) => {
    const open = () => enterProject(p.id); // triggers the global re-render into the app shell

    const rename = h('button', {
      class: 'del-btn', title: t('rename'),
      onclick: (e) => { e.stopPropagation(); startRename(p, card); },
    }, '✎');

    const del = h('button', {
      class: 'del-btn', title: t('delete'),
      onclick: async (e) => {
        e.stopPropagation();
        if (confirmingDelete !== p.id) { confirmingDelete = p.id; draw(); return; }
        await api.deleteProject(p.id);
        confirmingDelete = null;
        await loadProjects();
        draw();
      },
    }, confirmingDelete === p.id ? t('confirmDelete') : '🗑');

    const card = h('div', { class: 'card card-pad proj-card', onclick: open },
      h('div', { class: 'proj-actions' }, rename, del),
      h('div', { class: 'proj-name' }, p.name),
      p.description ? h('div', { class: 'proj-desc muted' }, p.description) : null,
      h('div', { class: 'proj-budget tnum' }, money(p.total_budget || 0)),
    );
    return card;
  };

  function startRename(p, card) {
    const input = h('input', { class: 'field', value: p.name });
    const commit = async () => {
      const name = input.value.trim();
      if (name && name !== p.name) { await api.updateProject(p.id, { name }); await loadProjects(); }
      draw();
    };
    input.addEventListener('keydown', (e) => { if (e.key === 'Enter') commit(); if (e.key === 'Escape') draw(); });
    input.addEventListener('blur', commit);
    input.addEventListener('click', (e) => e.stopPropagation());
    clear(card).append(input);
    input.focus();
    input.select();
  }

  const newCard = () =>
    h('button', { class: 'btn-dashed proj-card proj-new', onclick: openWizard },
      h('span', { class: 'proj-plus' }, '+'), t('newProject'));

  // New-project wizard (modal): name + budget + what the renovation covers.
  // The scope drives the default categories / phases / sample tasks server-side.
  // Selections live in local DOM state (chips toggle their own class) so typing
  // in the name/budget fields never triggers a re-render that would lose focus.
  function openWizard() {
    const sel = { types: new Set(), outdoor: new Set(), floors: 1 };
    const name = h('input', { class: 'field', placeholder: t('projectName') });
    const budget = h('input', { class: 'field', type: 'number', min: '0', placeholder: t('statBudget') + ' (€)' });
    const err = h('div', { class: 'login-err' });

    const toggleChip = (setRef, key) => (e) => {
      const on = setRef.has(key) ? (setRef.delete(key), false) : (setRef.add(key), true);
      e.currentTarget.classList.toggle('active', on);
    };
    const chipRow = (defs, setRef) => h('div', { class: 'wiz-chips' },
      defs.map(([key, label]) => h('button', { type: 'button', class: 'chip', onclick: toggleChip(setRef, key) }, t(label))));

    const floorBtns = [1, 2, 3, 4].map((n) => h('button', {
      type: 'button', class: 'chip' + (n === 1 ? ' active' : ''),
      onclick: () => { sel.floors = n; floorBtns.forEach((b) => b.classList.remove('active')); floorBtns[n - 1].classList.add('active'); },
    }, String(n)));

    const overlay = h('div', { class: 'modal-overlay' });
    const close = () => { overlay.remove(); document.removeEventListener('keydown', onEsc); };
    const onEsc = (e) => { if (e.key === 'Escape') close(); };
    overlay.addEventListener('click', (e) => { if (e.target === overlay) close(); });
    document.addEventListener('keydown', onEsc);

    const createBtn = h('button', { class: 'btn', type: 'submit' }, t('save'));
    const create = async (e) => {
      if (e) e.preventDefault();
      const nm = name.value.trim();
      if (!nm) { err.textContent = t('projectName'); name.focus(); return; }
      createBtn.disabled = true;
      try {
        const p = await api.createProject({
          name: nm, total_budget: Number(budget.value) || 0,
          scope: { types: [...sel.types], floors: sel.floors, outdoor: [...sel.outdoor] },
        });
        close();
        await loadProjects();
        enterProject(p.id); // jump straight into the new project
      } catch { err.textContent = t('createProjectErr'); createBtn.disabled = false; }
    };

    const form = h('form', { class: 'card card-pad modal modal-wide', onsubmit: create },
      h('h2', {}, t('newProject')),
      h('label', { class: 'stat-label' }, t('projectName')), name,
      h('label', { class: 'stat-label' }, t('statBudget')), budget,
      h('label', { class: 'stat-label' }, t('scopeQuestion')),
      chipRow([['indoor_paint', 'scopeIndoorPaint'], ['indoor_floors', 'scopeIndoorFloors'], ['kitchen', 'scopeKitchen'], ['bathroom', 'scopeBathroom']], sel.types),
      h('label', { class: 'stat-label' }, t('scopeFloors')),
      h('div', { class: 'wiz-chips' }, floorBtns),
      h('label', { class: 'stat-label' }, t('scopeOutdoor')),
      chipRow([['outdoor_paint', 'scopeOutdoorPaint'], ['balconies', 'scopeBalconies'], ['garden', 'scopeGarden']], sel.outdoor),
      h('div', { class: 'hint', style: { marginTop: '2px' } }, t('scopeHint')),
      err,
      h('div', { class: 'modal-actions' },
        h('button', { class: 'btn-ghost', type: 'button', onclick: close }, t('cancel')),
        createBtn),
    );
    overlay.append(form);
    root.append(overlay);
    setTimeout(() => name.focus(), 0);
  }

  function draw() {
    const grid = h('div', { class: 'proj-grid' },
      state.projects.map(projectCard),
      newCard(),
    );
    clear(root).append(topbar(), h('main', { class: 'main' }, h('div', { class: 'picker-wrap' }, grid)));
  }

  draw();
}
