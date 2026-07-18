// Transient toast notifications — the app's single "did it work?" channel.
// Framework-agnostic: mounts one fixed container on <body>, so it works in both
// the desktop shell and the phone shell without either knowing about it.
import { h } from './ui.js';

let _wrap = null;
function wrap() {
  if (!_wrap) {
    _wrap = h('div', { class: 'toast-wrap' });
    document.body.append(_wrap);
  }
  return _wrap;
}

// toast('Saved') | toast('Could not save', 'error'). Returns a dismiss fn.
export function toast(message, type = 'info', ms = 3200) {
  const el = h('div', {
    class: `toast toast-${type}`,
    role: 'status',
    'aria-live': type === 'error' ? 'assertive' : 'polite',
  }, message);

  let timer;
  const dismiss = () => {
    clearTimeout(timer);
    el.classList.remove('toast-in');
    el.classList.add('toast-out');
    setTimeout(() => el.remove(), 220);
  };
  el.addEventListener('click', dismiss);

  wrap().append(el);
  requestAnimationFrame(() => el.classList.add('toast-in'));
  timer = setTimeout(dismiss, ms);
  return dismiss;
}

export const toastError = (message) => toast(message, 'error', 4200);
export const toastOk = (message) => toast(message, 'success');
