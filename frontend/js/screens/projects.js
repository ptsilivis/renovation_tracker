// Project picker — the first screen after login. Choose which renovation to
// open, or create / rename / delete one. Renders full-page (outside the app
// shell), so it carries its own lightweight top bar.
import { api } from '../api.js';
import { state, enterProject, loadProjects, setLang } from '../state.js';
import { t } from '../i18n.js';
import { h, clear, money } from '../ui.js';

export default function renderPicker(root) {
  let adding = false;          // is the "new project" form open?
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

  const newCard = () => {
    if (!adding) {
      return h('button', { class: 'btn-dashed proj-card proj-new', onclick: () => { adding = true; draw(); } },
        h('span', { class: 'proj-plus' }, '+'), t('newProject'));
    }
    const name = h('input', { class: 'field', placeholder: t('projectName') });
    const budget = h('input', { class: 'field', type: 'number', min: '0', placeholder: t('statBudget') + ' (€)' });
    const create = async () => {
      const nm = name.value.trim();
      if (!nm) { name.focus(); return; }
      const p = await api.createProject({ name: nm, total_budget: Number(budget.value) || 0 });
      adding = false;
      await loadProjects();
      enterProject(p.id); // jump straight into the new project
    };
    name.addEventListener('keydown', (e) => { if (e.key === 'Enter') create(); if (e.key === 'Escape') { adding = false; draw(); } });
    const form = h('div', { class: 'card card-pad proj-card proj-form' },
      h('label', { class: 'stat-label' }, t('projectName')), name,
      h('label', { class: 'stat-label' }, t('statBudget')), budget,
      h('div', { class: 'proj-form-actions' },
        h('button', { class: 'btn-ghost', onclick: () => { adding = false; draw(); } }, t('cancel')),
        h('button', { class: 'btn', onclick: create }, t('save')),
      ),
    );
    setTimeout(() => name.focus(), 0);
    return form;
  };

  function draw() {
    const grid = h('div', { class: 'proj-grid' },
      state.projects.map(projectCard),
      newCard(),
    );
    clear(root).append(topbar(), h('main', { class: 'main' }, h('div', { class: 'picker-wrap' }, grid)));
  }

  draw();
}
