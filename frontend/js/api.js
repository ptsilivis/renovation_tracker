// fetch() client — the single swap point replacing the design's LocalStorageRepository.
// All calls are same-origin with the httpOnly session cookie.

// The active project id. Every project-scoped call carries it as ?project=<id>;
// state.js sets it whenever the user enters or switches a project.
let _project = null;
export function setApiProject(id) { _project = id; }

// Append ?project=<active> (or &project= if the path already has a query).
function pq(path) {
  const sep = path.includes('?') ? '&' : '?';
  return `${path}${sep}project=${encodeURIComponent(_project)}`;
}

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

  // projects (the top-level scope; not project-scoped themselves)
  listProjects: () => req('GET', '/projects'),
  createProject: (body) => req('POST', '/projects', body),
  updateProject: (id, patch) => req('PATCH', '/projects/' + id, patch),
  deleteProject: (id) => req('DELETE', '/projects/' + id),

  // data (mirrors repository contract) — all scoped to the active project
  getData: () => req('GET', pq('/data')),
  create: (collection, item) => req('POST', pq('/' + collection), item),
  bulkCreate: (collection, items) => req('POST', pq(`/${collection}/bulk`), items),
  bulkDelete: (collection, ids) => req('POST', pq(`/${collection}/bulk_delete`), ids),
  update: (collection, id, patch) => req('PATCH', `/${collection}/${id}`, patch),
  remove: (collection, id) => req('DELETE', `/${collection}/${id}`),

  // meta
  patchSettings: (patch) => req('PATCH', pq('/settings'), patch),
  logActivity: (entry) => req('POST', pq('/activity'), entry),
  exportMeasurements: () => req('GET', pq('/measurements/export')),
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
