// Derived finance/progress values (the logic the design's runtime used to do).
import { coll, settings } from './state.js';

export function categoryMap() {
  const m = new Map();
  for (const c of coll('categories')) m.set(c.id, c);
  return m;
}

export function taskMap() {
  const m = new Map();
  for (const tk of coll('tasks')) m.set(tk.id, tk);
  return m;
}

// Totals overall and per category: { planned, actual } and Map(catId -> {planned,actual}).
export function costTotals() {
  let planned = 0, actual = 0;
  const byCat = new Map();
  for (const c of coll('cost_items')) {
    const p = Number(c.planned_cost) || 0;
    const a = Number(c.actual_cost) || 0;
    planned += p; actual += a;
    const cur = byCat.get(c.category_id) || { planned: 0, actual: 0 };
    cur.planned += p; cur.actual += a;
    byCat.set(c.category_id, cur);
  }
  return { planned, actual, byCat };
}

export function budgetStats() {
  const budget = Number(settings().total_budget) || 0;
  const { planned, actual } = costTotals();
  return { budget, planned, spent: actual, remaining: budget - actual };
}

export function taskProgress() {
  const tasks = coll('tasks');
  const done = tasks.filter((t) => t.status === 'done').length;
  return { done, total: tasks.length, pct: tasks.length ? Math.round((done / tasks.length) * 100) : 0 };
}

// Sum of actual costs linked to a given task.
export function taskCost(taskId) {
  return coll('cost_items')
    .filter((c) => c.task_id === taskId)
    .reduce((s, c) => s + (Number(c.actual_cost) || 0), 0);
}
