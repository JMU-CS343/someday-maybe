// src/state.js
// Single source of truth + persistence + common helpers

const LS_KEY = 'someday-maybe-state-v4';

// --- helpers (must exist before defaultState)
function uid() {
    return Math.random().toString(36).slice(2, 9);
}
function todayISO() {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
}

function applyTheme(theme) {
    const root = document.body;
    root.classList.toggle('theme-purple', theme === 'purple');
}

const defaultState = {
    theme: 'default',
    lists: [
        // {
        //   id: uid(),
        //   title: 'Shopping',
        //   sort: 'dueAsc',
        //   tasks: [
        //     { id: uid(), title: 'Buy Nature Valley tenders', due: todayISO(), time: '', tag: 'Shopping', done: false }
        //   ],
        // },
        // {
        //   id: uid(),
        //   title: 'Meal prep',
        //   sort: 'dueAsc',
        //   tasks: [
        //     { id: uid(), title: 'Cook chicken', due: todayISO(), time: '', tag: 'Cooking', done: false }
        //   ],
        // }
        {
            id: uid(),
            title: 'To Do',
            sort: 'date',
            tasks: [],
        },
        {
            id: uid(),
            title: 'Reminders',
            sort: 'date',
            tasks: [],
        },
        {
            id: uid(),
            title: 'Done',
            sort: 'date',
            tasks: [],
        }
    ]
};

const saved = load();
let state = saved || defaultState;

if (!saved) {
    save();
}

console.log('[state] loaded from LS:', state);

if (!state.theme) {
    state.theme = 'default';
    save();
    console.log('[state] no theme found, set to default and saved');
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => applyTheme(state.theme));
} else {
    applyTheme(state.theme);
}


function setTheme(theme) {
    state.theme = theme;
    save();
    applyTheme(theme);
}

function getTheme() {
    return state.theme || 'default';
}

// ---- getters / persistence
function getState() { return state; }

function save() {
    if (!state.theme) state.theme = 'default';
    localStorage.setItem(LS_KEY, JSON.stringify(state));
    console.log('[state] saved to LS:', state);
}

function replaceState(next) {
    const theme = next.theme || state.theme || 'default';
    state = { ...next, theme };
    save();
}

// ---- List operations
function addList(title) {
    state.lists.push({ id: uid(), title: title.trim(), sort: 'dueAsc', tasks: [] });
    save();
}
function renameList(listId, title) {
    const l = state.lists.find(x => x.id === listId);
    if (l) { l.title = title.trim(); save(); }
}
function deleteList(listId) {
    const list = state.lists.find(x => x.id === listId);
    for (let task of list.tasks) {
        let taskId = task.id;
        deleteTaskAttachments(taskId);
    }

    state.lists = state.lists.filter(l => l.id !== listId);
    save();
}

// ---- Task operations
function addTask(listId, task) {
    const list = state.lists.find(l => l.id === listId);
    if (!list) return;
    const t = {
        id: uid(),
        title: task.title.trim(),
        due: task.due || todayISO(),
        time: task.time || '',
        tag: task.tag || list.title,
        done: !!task.done,
    };
    list.tasks.push(t);
    save();
    return t.id;
}
function updateTask(listId, taskId, patch) {
    const list = state.lists.find(l => l.id === listId);
    if (!list) return;
    const t = list.tasks.find(x => x.id === taskId);
    if (t) { Object.assign(t, patch); save(); }
}
function removeTask(listId, taskId) {
    const list = state.lists.find(l => l.id === listId);
    if (!list) return;
    list.tasks = list.tasks.filter(t => t.id !== taskId);
    save();

    deleteTaskAttachments(taskId);
}
function deleteTaskAttachments(taskId) {
    (async () => {
        try {
            await CardAttachments.remove(taskId);
        } catch (err) {
            console.error(err);
        }
    })();
}
function reorderTask(listId, fromIdx, toIdx) {
    const list = state.lists.find(l => l.id === listId);
    if (!list || fromIdx === toIdx) return;
    const [moving] = list.tasks.splice(fromIdx, 1);
    list.tasks.splice(toIdx, 0, moving);
    list.sort = 'custom';
    save();
}

// ---- Helpers used by views
function dateTimeMs(task) {
    if (!task.due) return Infinity;
    let d;
    if (task.time && /^\d{2}:\d{2}$/.test(task.time)) {
        d = new Date(task.due + 'T' + task.time);
    } else {
        d = new Date(task.due + 'T00:00');
        d.setTime(d.getTime() + 24 * 60 * 60 * 1000);
    }
    const ms = d.getTime();
    return Number.isFinite(ms) ? ms : Infinity;
}
function formatDateTime(due, time) {
    if (!due) return 'N/A';
    try {
        const s = (time && /^\d{2}:\d{2}$/.test(time)) ? time : '00:00';
        const dt = new Date(due + 'T' + s);
        const isThisYear = new Date().getYear() == dt.getYear();
        const datePart = dt.toLocaleDateString(undefined, {
            month: 'short',
            day: 'numeric',
            year: isThisYear ? undefined : 'numeric',
        });
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

// Expose everything needed as globals for non-module scripts
Object.assign(window, {
    uid, todayISO, getState, replaceState,
    addList, renameList, deleteList,
    addTask, updateTask, removeTask, reorderTask,
    dateTimeMs, formatDateTime,
    setTheme, getTheme,
    getState, replaceState
});



