// Hash-router: maps #/key to a screen module.
import overview from './screens/overview.js';
import tasks from './screens/tasks.js';
import costs from './screens/costs.js';
import moodboard from './screens/moodboard.js';
import floorplan from './screens/floorplan.js';
import measurements from './screens/measurements.js';

export const ROUTES = [
  { key: 'overview', label: 'navOverview', screen: overview },
  { key: 'tasks', label: 'navTasks', screen: tasks },
  { key: 'costs', label: 'navCosts', screen: costs },
  { key: 'moodboard', label: 'navMoodboard', screen: moodboard },
  { key: 'plan', label: 'navPlan', screen: floorplan },
  { key: 'measurements', label: 'navMeasurements', screen: measurements },
];

export function currentKey() {
  const k = location.hash.replace(/^#\/?/, '');
  return ROUTES.some((r) => r.key === k) ? k : 'overview';
}

export function renderScreen(container) {
  const route = ROUTES.find((r) => r.key === currentKey()) || ROUTES[0];
  container.replaceChildren();
  route.screen(container);
}
