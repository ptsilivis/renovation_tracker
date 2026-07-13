// Shared change-password modal — used by the first-login forced flow (app.js)
// and the mobile account menu (mobile.js). `forced` hides Cancel and can't be
// dismissed until it succeeds; `onDone` runs after a successful forced change.
import { api } from './api.js';
import { t } from './i18n.js';
import { h } from './ui.js';

export function openPasswordModal(appEl, { forced = false, onDone } = {}) {
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
        close();
        if (onDone) onDone();
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
