// fetch() client — the single swap point replacing the design's LocalStorageRepository.
// All calls are same-origin with the httpOnly session cookie.

async function req(method, path, body) {
  const opts = { method, credentials: 'include', headers: {} };
  if (body !== undefined) {
    opts.headers['Content-Type'] = 'application/json';
    opts.body = JSON.stringify(body);
  }
  const res = await fetch('/api' + path, opts);
  if (res.status === 401) throw new Error('unauthorized');
  if (!res.ok) {
    let detail = res.statusText;
    try { detail = (await res.json()).detail || detail; } catch {}
    throw new Error(typeof detail === 'string' ? detail : 'request failed');
  }
  return res.status === 204 ? null : res.json();
}

export const api = {
  // auth
  login: (email, password) => req('POST', '/auth/login', { email, password }),
  logout: () => req('POST', '/auth/logout'),
  me: () => req('GET', '/auth/me'),

  // data (mirrors repository contract)
  getData: () => req('GET', '/data'),
  create: (collection, item) => req('POST', '/' + collection, item),
  update: (collection, id, patch) => req('PATCH', `/${collection}/${id}`, patch),
  remove: (collection, id) => req('DELETE', `/${collection}/${id}`),

  // meta
  patchSettings: (patch) => req('PATCH', '/settings', patch),
  logActivity: (entry) => req('POST', '/activity', entry),
  exportMeasurements: () => req('GET', '/measurements/export'),
  reset: () => req('POST', '/admin/reset'),

  // files (multipart, not JSON)
  async upload(file) {
    const fd = new FormData();
    fd.append('file', file);
    const res = await fetch('/api/files', { method: 'POST', credentials: 'include', body: fd });
    if (!res.ok) throw new Error('upload failed');
    return res.json(); // { name, url }
  },
};
