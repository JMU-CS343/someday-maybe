// src/views/boards.js
// Boards view: lists + tasks. Add/edit, sorting, drag to reprioritize.

import {
  getState, addList, renameList, deleteList,
  addTask, updateTask, reorderTask,
  dateTimeMs, formatDateTime, todayISO
} from '../state.js';
import { openMenu } from '../ui/menu.js';

export function renderBoards(root) {
  const state = getState();
  root.innerHTML = `
      <main class="boards" id="boards"></main>
      <div class="pager">
        <button id="prev" aria-label="Previous">
          <i class="fa-solid fa-arrow-left"></i>
        </button>
        <button id="next" aria-label="Next">
          <i class="fa-solid fa-arrow-right"></i>
        </button>
      </div>
    `;

  const boards = root.querySelector('#boards');


  for (const list of state.lists) {
    boards.appendChild(renderList(list));
  }

  // “Add list” tile
  const addTile = document.createElement('section');
  addTile.className = 'list';
  addTile.style.cssText = 'align-items:center; justify-content:center;';
  addTile.innerHTML = `<button class="add-list" title="Add new list"><i class="fa-solid fa-plus"></i></button>`;
  addTile.querySelector('.add-list').addEventListener('click', () => {
    const name = prompt('List name?');
    if (name) { addList(name); renderBoards(root); }
  });
  boards.appendChild(addTile);

  // pager
  const row = boards;
  root.querySelector('#next').onclick = () => row.scrollBy({ left: 380, behavior: 'smooth' });
  root.querySelector('#prev').onclick = () => row.scrollBy({ left: -380, behavior: 'smooth' });
}

function renderList(list) {
  const node = document.createElement('section');
  node.className = 'list';
  node.dataset.listId = list.id;

  node.innerHTML = `
    <div class="list-header">
      <h2 class="list-title">${list.title}</h2>
  
      <!-- <div class="sort-row"> -->
      <!--   <label class="muted" for="sort-${list.id}">Order</label> -->
      <!--   <select id="sort-${list.id}" class="sort-select" aria-label="Sort tasks"> -->
      <!--     <option value="dueAsc">Auto (Due ↑)</option> -->
      <!--     <option value="dueDesc">Auto (Due ↓)</option> -->
      <!--     <option value="priority">Priority</option> -->
      <!--     <option value="drag">Custom (drag)</option> -->
      <!--   </select> -->
      <!-- </div> -->
    
      <button class="menu list-menu" type="button" title="List menu">
        <i class="fa-solid fa-ellipsis"></i>
      </button>
    </div>

    <div class="tasks"></div>
    <div class="add-wrap">
      <button class="add-task"><i class="fa-solid fa-plus"></i></button>
    </div>
  `;

  // 3-dot menu (rename/delete)
  node.querySelector('.menu').addEventListener('click', (e) => {
    openMenu(
      e.currentTarget,
      `
        <button data-act="rename">✎ Rename list</button>
        <button data-act="delete" class="danger">🗑 Delete list</button>
      `,
      (act) => {
        if (act === 'rename') {
          const name = prompt('Rename list:', list.title);
          if (name) {
            renameList(list.id, name);
            rerender(node);
          }
        } else if (act === 'delete') {
          if (confirm('Delete this list and all its tasks?')) {
            deleteList(list.id);
            node.remove();
          }
        }
      },
    );
  });

  // Sort mode
  // node.querySelector('.sort-select').addEventListener('change', (e) => {
  //   list.sort = e.target.value;
  //   rerender(node);
  // });

  // Tasks
  const host = node.querySelector('.tasks');
  const tasks = [...list.tasks];
  if (list.sort === 'custom') {
    tasks.sort((a, b) => (a.rank ?? 0) - (b.rank ?? 0));
  } else {
    tasks.sort((a, b) => dateTimeMs(a) - dateTimeMs(b) || (a.rank ?? 0) - (b.rank ?? 0) || a.title.localeCompare(b.title));
  }
  tasks.forEach(t => host.appendChild(renderCard(list, t)));

  // Add task form launcher
  node.querySelector('.add-task').addEventListener('click', () => {
    // create inline form (one per list)
    const existing = node.querySelector('form.task-form');
    if (existing) existing.remove();
    host.before(createTaskForm({
      onSubmit: (vals) => { addTask(list.id, vals); rerender(node); },
      defaults: { tag: list.title, due: todayISO(), time: '' },
      submitLabel: 'Add'
    }));
    node.querySelector('input[name="title"]').focus();
  });

  // Allow dropping to the end of list
  host.addEventListener('dragover', (e) => e.preventDefault());
  host.addEventListener('drop', (e) => {
    e.preventDefault();
    const data = safeJSON(e.dataTransfer.getData('text/plain'));
    if (!data || data.listId !== list.id) return;
    const fromIdx = list.tasks.findIndex(t => t.id === data.taskId);
    if (fromIdx < 0) return;
    reorderTask(list.id, fromIdx, list.tasks.length - 1);
    rerender(node);
  });

  return node;
}

function renderCard(list, task) {
  const card = document.createElement('article');
  card.className = 'card';
  card.draggable = true;
  card.tabIndex = 0;
  card.style.cursor = 'pointer';
  card.dataset.taskId = task.id;

  card.innerHTML = `
      <div class="chip">${escapeHtml(task.tag || list.title)}</div>
      <div class="checkbox" role="checkbox" aria-checked="${task.done ? 'true' : 'false'}" tabindex="0">
        <input type="checkbox" ${task.done ? 'checked' : ''}/>
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20.3 5.7a1 1 0 0 1 0 1.4l-10 10a1 1 0 0 1-1.4 0l-5-5a1 1 0 0 1 1.4-1.4L9 14.59 18.89 4.7a1 1 0 0 1 1.41 0Z"/></svg>
      </div>
      <div class="task-title">${escapeHtml(task.title)}</div>
      <div class="muted due">Due: ${escapeHtml(formatDateTime(task.due, task.time))}</div>
    `;

  const cb = card.querySelector('.checkbox');
  const input = cb.querySelector('input');
  const toggleDone = () => {
    updateTask(list.id, task.id, { done: !task.done });
    cb.setAttribute('aria-checked', String(!task.done));
    input.checked = !task.done;
    // no full rerender needed
  };
  cb.addEventListener('click', (e) => { e.stopPropagation(); toggleDone(); });
  cb.addEventListener('keydown', (e) => { if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); toggleDone(); } });

  // click to edit
  card.addEventListener('click', (e) => {
    if (e.target.closest('.checkbox, button, input, select, textarea')) return;
    if (window.getSelection && window.getSelection().toString()) return;
    card.replaceWith(createTaskForm({
      defaults: { title: task.title, due: task.due || todayISO(), time: task.time || '', tag: task.tag || list.title },
      submitLabel: 'Save',
      onSubmit: (vals) => { updateTask(list.id, task.id, vals); rerender(card.closest('.list')); }
    }));
  });
  card.addEventListener('dblclick', () => {
    card.click();
  });
  card.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); card.click(); }
  });

  // drag & drop
  card.addEventListener('dragstart', (e) => {
    e.dataTransfer.setData('text/plain', JSON.stringify({ listId: list.id, taskId: task.id }));
    card.classList.add('dragging');
  });
  card.addEventListener('dragend', () => card.classList.remove('dragging'));
  card.addEventListener('dragover', (e) => { e.preventDefault(); card.classList.add('drag-over'); });
  card.addEventListener('dragleave', () => card.classList.remove('drag-over'));
  card.addEventListener('drop', (e) => {
    e.preventDefault();
    card.classList.remove('drag-over');
    const data = safeJSON(e.dataTransfer.getData('text/plain'));
    if (!data || data.listId !== list.id) return;
    const listEl = card.closest('.list');
    const listTasks = getState().lists.find(l => l.id === list.id).tasks;
    const fromIdx = listTasks.findIndex(t => t.id === data.taskId);
    const toIdx = listTasks.findIndex(t => t.id === task.id);
    if (fromIdx < 0 || toIdx < 0 || fromIdx === toIdx) return;
    const insertAt = (e.offsetY < card.offsetHeight / 2) ? toIdx : toIdx + 1;
    reorderTask(list.id, fromIdx, insertAt > fromIdx ? insertAt - 1 : insertAt);
    rerender(listEl);
  });

  return card;
}

function createTaskForm({ defaults = {}, submitLabel = 'Add', onSubmit }) {
  const form = document.createElement('form');
  form.className = 'card task-form';
  form.innerHTML = `
      <div style="display:flex; gap:8px; align-items:center; margin-bottom:8px;">
        <input name="title" placeholder="Task title" required style="flex:1; padding:10px; border:1px solid #d9dbe3; border-radius:10px;" />
        <input type="date" name="due" aria-label="Due date" style="padding:10px; border:1px solid #d9dbe3; border-radius:10px;" />
        <input type="time" name="time" aria-label="Due time" style="padding:10px; border:1px solid #d9dbe3; border-radius:10px;" />
      </div>
      <div style="display:flex; gap:8px; align-items:center;">
        <input name="tag" placeholder="Tag (optional)" style="flex:1; padding:10px; border:1px solid #d9dbe3; border-radius:10px;" />
        <button type="submit" class="btn" style="padding:10px 14px; border-radius:10px; border:1px solid #e6e7eb; background:#fff; font-weight:600;">${submitLabel}</button>
        <button type="button" class="btn cancel" style="padding:10px 14px; border-radius:10px; border:1px solid #e6e7eb; background:#fff;">Cancel</button>
      </div>
      <div class="muted" style="margin-top:6px; font-size:12px;">Defaults to today — change if needed.</div>
    `;
  form.title.value = defaults.title || '';
  form.due.value = defaults.due || todayISO();
  form.time.value = defaults.time || '';
  form.tag.value = defaults.tag || '';

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const vals = {
      title: form.title.value.trim(),
      due: form.due.value,
      time: form.time.value,
      tag: form.tag.value.trim()
    };
    if (!vals.title) return;
    onSubmit(vals);
  });
  form.querySelector('.cancel').addEventListener('click', () => {
    // replace the form with nothing; parent will re-render on next call
    const list = form.closest('.list');
    if (list) rerender(list);
    else form.remove();
  });
  return form;
}

function rerender(listEl) {
  // Replace a single list with a fresh one (cheap “local” rerender)
  const listId = listEl.dataset.listId;
  const next = renderList(getState().lists.find(l => l.id === listId));
  listEl.replaceWith(next);
}

function safeJSON(s) { try { return JSON.parse(s); } catch { return null; } }
function escapeHtml(s = '') { return s.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }

