// Shared app state + a single mutation path (write → refetch → re-render).
import { api, setApiProject } from './api.js';

export const state = {
  user: null,
  lang: localStorage.getItem('rh_lang') || 'el',
  data: null,
  projects: [],
  projectId: localStorage.getItem('rh_project') || null,
};

let _rerender = () => {};
export function onRerender(fn) { _rerender = fn; }
export function rerender() { _rerender(); }

export function setLang(l) {
  state.lang = l;
  localStorage.setItem('rh_lang', l);
  document.documentElement.lang = l;
  rerender();
}

// Projects -------------------------------------------------------------------
export async function loadProjects() {
  state.projects = await api.listProjects();
  // Drop a stale saved project id (e.g. one that was deleted).
  if (state.projectId && !state.projects.some((p) => p.id === state.projectId)) {
    clearProject();
  }
  return state.projects;
}

export const currentProject = () => state.projects.find((p) => p.id === state.projectId) || null;

export async function enterProject(id) {
  state.projectId = id;
  setApiProject(id);
  localStorage.setItem('rh_project', id);
  await loadData();
  rerender();
}

export function clearProject() {
  state.projectId = null;
  state.data = null;
  setApiProject(null);
  localStorage.removeItem('rh_project');
}

export async function loadData() {
  state.data = await api.getData();
}

// Collection accessors -------------------------------------------------------
export const coll = (name) => (state.data && state.data[name]) || [];
export const settings = () => (state.data && state.data.settings) || { total_budget: 0 };
export const findById = (name, id) => coll(name).find((x) => x.id === id);

// Mutations: apply on the server, then re-pull the snapshot and re-render.
// Last-write-wins, correctness over latency — fine for 4 low-traffic users.
export async function mutate(fn) {
  await fn();
  await loadData();
  rerender();
}
export const create = (c, item) => mutate(() => api.create(c, item));
export const update = (c, id, patch) => mutate(() => api.update(c, id, patch));
export const remove = (c, id) => mutate(() => api.remove(c, id));
export const patchSettings = (patch) => mutate(() => api.patchSettings(patch));
export const logActivity = (entry) => api.logActivity(entry); // fire-and-forget
