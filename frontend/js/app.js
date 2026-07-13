// Bootstrap: login gate → project picker → render shell (header + active screen).
import { api, setApiProject } from './api.js';
import {
  state, loadData, loadProjects, currentProject, clearProject,
  onRerender, setLang,
} from './state.js';
import { t } from './i18n.js';
import { h, clear } from './ui.js';
import { ROUTES, currentKey, renderScreen } from './router.js';
import renderPicker from './screens/projects.js';
import { openPasswordModal } from './password.js';
import { renderMobile } from './mobile.js';

const appEl = document.getElementById('app');

// Phone layout swaps in below this width; the desktop shell is untouched above.
const mq = window.matchMedia('(max-width: 760px)');
export const isMobile = () => mq.matches;

function renderLogin() {
  const err = h('div', { class: 'login-err' });
  const email = h('input', { class: 'field', type: 'email', placeholder: t('loginEmail'), autocomplete: 'username' });
  const pass = h('input', { class: 'field', type: 'password', placeholder: t('loginPassword'), autocomplete: 'current-password' });
  const btn = h('button', { class: 'btn', type: 'submit' }, t('loginBtn'));

  const submit = async (e) => {
    e.preventDefault();
    err.textContent = '';
    btn.disabled = true;
    try {
      state.user = await api.login(email.value.trim(), pass.value);
      await loadProjects();
      renderApp();
    } catch {
      err.textContent = t('loginError');
      btn.disabled = false;
    }
  };

  const form = h('form', { class: 'card card-pad login-card', onsubmit: submit },
    h('div', { class: 'brand' }, h('div', { class: 'logo' }, 'R'), h('h1', {}, t('loginTitle'))),
    h('label', { class: 'stat-label' }, t('loginEmail')), email,
    h('label', { class: 'stat-label' }, t('loginPassword')), pass,
    err, btn,
  );
  clear(appEl).append(h('div', { class: 'login-wrap' }, form));
  email.focus();
}

function renderHeader() {
  const active = currentKey();
  const proj = currentProject();
  const nav = h('nav', { class: 'nav' },
    ROUTES.map((r) =>
      h('button', {
        class: active === r.key ? 'active' : '',
        onclick: () => { location.hash = '#/' + r.key; },
      }, t(r.label)),
    ),
  );
  const langBtn = h('button', { class: 'lang-btn', onclick: () => setLang(state.lang === 'el' ? 'en' : 'el') },
    state.lang === 'el' ? 'EN' : 'ΕΛ');
  const switchBtn = h('button', { class: 'icon-btn', title: t('changeProject'), onclick: () => { clearProject(); location.hash = ''; renderApp(); } }, '⌂');
  const pwBtn = h('button', { class: 'icon-btn', title: t('changePassword'), onclick: openChangePassword }, '🔑');
  const logoutBtn = h('button', { class: 'icon-btn', onclick: async () => { await api.logout(); location.reload(); } }, t('logout'));

  const projName = proj ? proj.name : '';
  return h('header', { class: 'hdr' },
    h('div', { class: 'hdr-in' },
      h('div', { class: 'brand' },
        h('div', { class: 'logo' }, (projName[0] || 'R').toUpperCase()),
        h('div', {}, h('div', { class: 'brand-title' }, projName || t('appTitle')), h('div', { class: 'brand-sub' }, t('appTitle'))),
      ),
      nav,
      h('div', { class: 'hdr-right' },
        h('span', { class: 'role-badge' }, state.user ? state.user.display_name : ''),
        switchBtn, pwBtn, langBtn, logoutBtn,
      ),
    ),
  );
}

// The header's change-password button opens the shared modal (js/password.js).
const openChangePassword = () => openPasswordModal(appEl, { forced: false });

function renderApp() {
  if (!state.user) return renderLogin();
  if (state.user.must_change_password) {   // first login: must set own password before anything
    clear(appEl);
    return openPasswordModal(appEl, { forced: true, onDone: () => { state.user.must_change_password = false; renderApp(); } });
  }
  if (!state.projectId) return renderPicker(appEl);
  if (isMobile()) { clear(appEl); return renderMobile(appEl); }
  const main = h('main', { class: 'main' });
  clear(appEl).append(renderHeader(), main);
  renderScreen(main);
}

onRerender(renderApp);
window.addEventListener('hashchange', () => { if (state.user && state.projectId && !isMobile()) renderApp(); });
// Re-render when crossing the phone/desktop breakpoint so the right shell mounts.
mq.addEventListener('change', () => { if (state.user && state.projectId) renderApp(); });

async function boot() {
  document.documentElement.lang = state.lang;
  try {
    state.user = await api.me();
    await loadProjects();
    if (state.projectId) {
      setApiProject(state.projectId);
      await loadData();
    }
  } catch {
    state.user = null;
  }
  renderApp();
}

boot();
