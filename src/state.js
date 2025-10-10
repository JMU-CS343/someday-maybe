// src/state.js
// Single source of truth + persistence + common helpers

const LS_KEY = 'someday-maybe-state-v4';

export function uid() {
  return Math.random().toString(36).slice(2, 9);
}

export function todayISO() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

const defaultState = {
  lists: [
    {
      id: uid(),
      title: 'Shopping',
      sort: 'dueAsc',
      tasks: [
        { id: uid(), title: 'Buy Nature Valley tenders', due: todayISO(), time: '', rank: null, tag: 'Shopping', done: false }
      ],
    },
    {
      id: uid(),
      title: 'Meal prep',
      sort: 'dueAsc',
      tasks: [
        { id: uid(), title: 'Cook chicken', due: todayISO(), time: '', rank: null, tag: 'Cooking', done: false }
      ],
    }
  ]
};

let state = load() || defaultState;

export function getState() {
  return state;
}
function save() {
  localStorage.setItem(LS_KEY, JSON.stringify(state));
}

export function replaceState(next) {
  state = next;
  save();
}

// ---- List operations
export function addList(title) {
  state.lists.push({ id: uid(), title: title.trim(), sort: 'dueAsc', tasks: [] });
  save();
}
export function renameList(listId, title) {
  const l = state.lists.find(x => x.id === listId);
  if (l) { l.title = title.trim(); save(); }
}
export function deleteList(listId) {
  state.lists = state.lists.filter(l => l.id !== listId);
  save();
}

// ---- Task operations
export function addTask(listId, task) {
  const list = state.lists.find(l => l.id === listId);
  if (!list) return;
  const t = {
    id: uid(),
    title: task.title.trim(),
    due: task.due || '',
    time: task.time || '',
    tag: task.tag || list.title,
    done: !!task.done,
    rank: null
  };
  list.tasks.push(t);
  save();
}
export function updateTask(listId, taskId, patch) {
  const list = state.lists.find(l => l.id === listId);
  if (!list) return;
  const t = list.tasks.find(x => x.id === taskId);
  if (t) { Object.assign(t, patch); save(); }
}
export function removeTask(listId, taskId) {
  const list = state.lists.find(l => l.id === listId);
  if (!list) return;
  list.tasks = list.tasks.filter(t => t.id !== taskId);
  save();
}
export function reorderTask(listId, fromIdx, toIdx) {
  const list = state.lists.find(l => l.id === listId);
  if (!list || fromIdx === toIdx) return;
  const [moving] = list.tasks.splice(fromIdx, 1);
  list.tasks.splice(toIdx, 0, moving);
  list.tasks.forEach((t, i) => t.rank = i);
  list.sort = 'custom';
  save();
}

// ---- Helpers used by views
export function dateTimeMs(task) {
  if (!task.due) return Infinity;
  const t = (task.time && /^\d{2}:\d{2}$/.test(task.time)) ? task.time : '00:00';
  const d = new Date(task.due + 'T' + t);
  const ms = d.getTime();
  return Number.isFinite(ms) ? ms : Infinity;
}
export function formatDateTime(due, time) {
  if (!due) return 'N/A';
  try {
    const s = (time && /^\d{2}:\d{2}$/.test(time)) ? time : '00:00';
    const dt = new Date(due + 'T' + s);
    const datePart = dt.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
    const timePart = (s !== '00:00') ? dt.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' }) : '';
    return timePart ? `${datePart}, ${timePart}` : datePart;
  } catch {
    return due;
  }
}

function load() {
  try {
    const raw = localStorage.getItem(LS_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}
