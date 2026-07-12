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

const appEl = document.getElementById('app');

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
  const pwBtn = h('button', { class: 'icon-btn', title: t('changePassword'), onclick: openPasswordModal }, '🔑');
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

// Change-password modal — every user sets their own strong password (min 10).
// `forced` (first-login) hides Cancel and can't be dismissed until it succeeds.
function openPasswordModal(forced = false) {
  const err = h('div', { class: 'login-err' });
  const cur = h('input', { class: 'field', type: 'password', placeholder: t('currentPassword'), autocomplete: 'current-password' });
  const np = h('input', { class: 'field', type: 'password', placeholder: t('newPassword'), autocomplete: 'new-password' });
  const cp = h('input', { class: 'field', type: 'password', placeholder: t('confirmPassword'), autocomplete: 'new-password' });
  const overlay = h('div', { class: 'modal-overlay' });
  const close = () => overlay.remove();
  if (!forced) {
    overlay.addEventListener('click', (e) => { if (e.target === overlay) close(); });
    document.addEventListener('keydown', function esc(e) { if (e.key === 'Escape') { close(); document.removeEventListener('keydown', esc); } });
  }

  const btn = h('button', { class: 'btn', type: 'submit' }, t('save'));
  const submit = async (e) => {
    e.preventDefault();
    err.textContent = '';
    if (np.value.length < 10) { err.textContent = t('pwTooShort'); return; }
    if (np.value !== cp.value) { err.textContent = t('pwMismatch'); return; }
    btn.disabled = true;
    try {
      await api.changePassword(cur.value, np.value);
      form.replaceChildren(h('div', { class: 'pw-ok' }, '✓ ' + t('pwChanged')));
      setTimeout(() => {
        if (forced) { state.user.must_change_password = false; renderApp(); }
        else close();
      }, 1400);
    } catch (ex) {
      err.textContent = (ex && ex.message) || t('pwSaveErr');
      btn.disabled = false;
    }
  };
  const form = h('form', { class: 'card card-pad modal', onsubmit: submit },
    h('h2', {}, forced ? t('mustChangeTitle') : t('changePassword')),
    forced ? h('div', { class: 'modal-msg muted' }, t('mustChangeMsg')) : null,
    h('label', { class: 'stat-label' }, t('currentPassword')), cur,
    h('label', { class: 'stat-label' }, t('newPassword')), np,
    h('label', { class: 'stat-label' }, t('confirmPassword')), cp,
    err,
    h('div', { class: 'modal-actions' },
      forced ? null : h('button', { class: 'btn-ghost', type: 'button', onclick: close }, t('cancel')),
      btn,
    ),
  );
  overlay.append(form);
  appEl.append(overlay);
  cur.focus();
}

function renderApp() {
  if (!state.user) return renderLogin();
  if (state.user.must_change_password) {   // first login: must set own password before anything
    clear(appEl);
    return openPasswordModal(true);
  }
  if (!state.projectId) return renderPicker(appEl);
  const main = h('main', { class: 'main' });
  clear(appEl).append(renderHeader(), main);
  renderScreen(main);
}

onRerender(renderApp);
window.addEventListener('hashchange', () => { if (state.user && state.projectId) renderApp(); });

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
