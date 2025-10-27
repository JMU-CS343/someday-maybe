// src/views/boards.js
// Boards (Dashboard) view: renders lists + tasks with add/edit, sorting,
// and drag-to-reprioritize. Supports two layouts:
//   - "Swipe" (horizontal lane scroller)
//   - "Grid"  (CSS Grid; pager hidden)
// The layout toggle is mounted in the header (next to the gear) so it never
// covers board content. Keyboard shortcuts: G = grid, S = swipe.

let hotkeysBound = false; // avoid rebinding global key handlers across rerenders

(() => {
  // ---- Dependencies provided by state.js and UI helpers ---------------------
  const {
    getState, addList, renameList, deleteList,
    addTask, updateTask, reorderTask,
    dateTimeMs, formatDateTime, todayISO, removeTask
  } = window;
  const { openMenu } = window;

  // Persisted layout preference (localStorage)
  const MODE_KEY = 'board-view'; // 'swipe' | 'grid'

  // ==========================================================================
  // Header-mounted layout toggle (lives next to the gear)
  // Rebuilt on each render so it always matches current state and stays unique.
  // ==========================================================================
  function mountLayoutToggle(isGrid, rerender) {
    const bar = document.querySelector('.top-bar');
    const gear = document.getElementById('gearBtn');
    if (!bar || !gear) return; // defensive: if header is missing, skip

    // Remove prior toggle (prevents duplicates after rerender)
    document.getElementById('layoutToggle')?.remove();

    // Create toggle host just before the gear button
    const host = document.createElement('div');
    host.id = 'layoutToggle';
    host.setAttribute('role', 'tablist');
    host.setAttribute('aria-label', 'Board layout');

    host.innerHTML = `
      <div class="segmented">
        <!-- Swipe button: three slim vertical rectangles -->
        <button id="modeList" class="seg-btn ${!isGrid ? 'is-active' : ''}" role="tab"
                aria-selected="${!isGrid}" aria-controls="boards" title="Swipe">
          <svg width="32" height="20" viewBox="0 0 32 20" aria-hidden="true">
            <rect x="2"    y="1" width="7" height="18" rx="2"></rect>
            <rect x="12.5" y="1" width="7" height="18" rx="2"></rect>
            <rect x="23"   y="1" width="7" height="18" rx="2" style="opacity:.35"></rect>
          </svg>
        </button>

        <!-- Grid button: four equal squares -->
        <button id="modeGrid" class="seg-btn ${isGrid ? 'is-active' : ''}" role="tab"
                aria-selected="${isGrid}" aria-controls="boards" title="Grid">
          <svg width="32" height="20" viewBox="0 0 32 20" aria-hidden="true">
            <rect x="8"  y="2"  width="7" height="7" rx="2"></rect>
            <rect x="18" y="2"  width="7" height="7" rx="2"></rect>
            <rect x="8"  y="12" width="7" height="7" rx="2"></rect>
            <rect x="18" y="12" width="7" height="7" rx="2" style="opacity:.35"></rect>
          </svg>
        </button>
      </div>
    `;

    bar.insertBefore(host, gear);

    // Toggle handlers: persist mode, then ask caller to re-render
    host.querySelector('#modeList').addEventListener('click', () => {
      localStorage.setItem(MODE_KEY, 'swipe');
      rerender();
    });
    host.querySelector('#modeGrid').addEventListener('click', () => {
      localStorage.setItem(MODE_KEY, 'grid');
      rerender();
    });
  }

  // ==========================================================================
  // Public view renderer (called by main.js)
  // ==========================================================================
  window.renderBoards = function renderBoards(root) {
    const state = getState();
    const mode = localStorage.getItem(MODE_KEY) || 'swipe';
    const isGrid = mode === 'grid';

    // Keep the header toggle in sync with current mode
    mountLayoutToggle(isGrid, () => renderBoards(root));

    // Main surface; pager exists only in Swipe mode (hidden in Grid by CSS)
    root.innerHTML = `
      <main class="boards ${isGrid ? 'is-grid' : ''}" id="boards"></main>
      ${isGrid ? '' : `
        <div class="pager">
          <button id="prev" aria-label="Previous"><i class="fa-solid fa-arrow-left"></i></button>
          <button id="next" aria-label="Next"><i class="fa-solid fa-arrow-right"></i></button>
        </div>
      `}
    `;

    const boards = root.querySelector('#boards');

    // Render existing lists
    for (const list of state.lists) {
      boards.appendChild(renderList(list));
    }

    // “Add list” tile at the end
    const addTile = document.createElement('section');
    addTile.className = 'list';
    addTile.style.cssText = 'align-items:center; justify-content:center;';
    addTile.innerHTML = `<button class="add-list" title="Add new list"><i class="fa-solid fa-plus"></i></button>`;
    addTile.querySelector('.add-list').addEventListener('click', () => {
      const name = prompt('List name?');
      if (name) { addList(name); renderBoards(root); }
    });
    boards.appendChild(addTile);

    // Pager wiring (only relevant for Swipe)
    if (!isGrid) {
      const row = boards;
      // 380px ≈ one card width + gap; feels right for lane-to-lane paging
      root.querySelector('#next').onclick = () =>
        row.scrollBy({ left: 380, behavior: 'smooth' });
      root.querySelector('#prev').onclick = () =>
        row.scrollBy({ left: -380, behavior: 'smooth' });
    }

    // One-time global hotkeys; only act if Boards is currently mounted
    if (!hotkeysBound) {
      document.addEventListener('keydown', (e) => {
        // Don’t steal focus from inputs/editors
        if (e.target.matches('input, textarea, [contenteditable="true"]')) return;
        if (!document.getElementById('boards')) return;

        const k = e.key.toLowerCase();
        if (k === 'g') { localStorage.setItem(MODE_KEY, 'grid'); renderBoards(root); }
        if (k === 's') { localStorage.setItem(MODE_KEY, 'swipe'); renderBoards(root); }
      });
      hotkeysBound = true;
    }
  };

  // ==========================================================================
  // Internal helpers
  // ==========================================================================

  // fromList: uid, fromCard: uid, toList: uid, toCard: ?uid, side: 'top' | 'bottom'
  function reorderCards(fromList, fromCard, toList, toCard, side) {
    const state = getState();
    const fromListData = state.lists.find(l => l.id === fromList);
    const toListData = state.lists.find(l => l.id === toList);

    if (fromListData == null || toListData == null) return;

    if (toCard == null || toListData.sort == 'date') {
      if (fromList == toList) return;

      const fromCardData = fromListData.tasks.find(t => t.id == fromCard);

      removeTask(fromList, fromCard);
      addTask(toList, fromCardData);
    } else if (fromList == toList) {
      const fromCardIndex = fromListData.tasks.findIndex(t => t.id === fromCard);
      const toCardIndex = fromListData.tasks.findIndex(t => t.id === toCard);

      reorderTask(fromList, fromCardIndex, toCardIndex);
    } else {
      const fromCardData = fromListData.tasks.find(t => t.id == fromCard);
      const toCardIndex = toListData.tasks.findIndex(t => t.id === toCard);
      const toListLength = toListData.tasks.length;

      removeTask(fromList, fromCard);
      addTask(toList, fromCardData);

      const toIndex = side == 'top' ? toCardIndex : toCardIndex + 1;

      reorderTask(toList, toListLength, toIndex);
    }

    const fromListElement = document.querySelector(`[data-list-id="${fromList}"]`);
    rerender(fromListElement);

    if (fromList != toList) {
      const toListElement = document.querySelector(`[data-list-id="${toList}"]`);
      rerender(toListElement);
    }
  }

  // Render a single list column (header + tasks + add/task)
  function renderList(list) {
    const node = document.createElement('section');
    node.className = 'list';
    node.dataset.listId = list.id;

    let sort;
    switch (list.sort) {
      case "custom":
        sort = "Custom";
        break;
      default:
        sort = "Date";
        break;
    }

    node.innerHTML = `
      <div class="list-header">
        <h2 class="list-title m-0">${list.title}</h2>

        <div class="row">
          <div class="col">
            <div class="dropdown dropdown-sort">
              <button class="btn btn-menu whitespace-nowrap" type="button" data-bs-toggle="dropdown" aria-expanded="false">
                <i class="fa-solid fa-sort"></i>
                ${sort}
              </button>
              <ul class="dropdown-menu">
                <li><a class="dropdown-item" data-option="date" href="#">Date</a></li>
                <li><a class="dropdown-item" data-option="custom" href="#">Custom</a></li>
              </ul>
            </div>
          </div>

          <div class="col">
            <button class="btn btn-menu btn-icon list-menu" type="button" title="List menu">
              <i class="fa-solid fa-ellipsis"></i>
            </button>
          </div>
        </div>
      </div>

      <div class="tasks"></div>
      <div class="add-wrap">
        <button class="add-task"><i class="fa-solid fa-plus"></i></button>
      </div>
    `;

    // ⋯ menu: rename / delete
    node.querySelector('.list-menu').addEventListener('click', (e) => {
      openMenu(
        e.currentTarget,
        `
          <button data-act="rename">✎ Rename list</button>
          <button data-act="delete" class="danger">🗑 Delete list</button>
        `,
        (act) => {
          if (act === 'rename') {
            const name = prompt('Rename list:', list.title);
            if (name) { renameList(list.id, name); rerender(node); }
          } else if (act === 'delete') {
            if (confirm('Delete this list and all its tasks?')) {
              deleteList(list.id);
              node.remove();
            }
          }
        },
      );
    });

    node.querySelectorAll('.dropdown-sort .dropdown-item')
      .forEach(btn => btn.addEventListener('click', () => {
        list.sort = btn.dataset.option;
        rerender(node);
      }));

    list.tasks = list.tasks.filter(t => t != null && t != undefined);

    // Task rendering with deterministic sort
    const host = node.querySelector('.tasks');
    const tasks = [...list.tasks];
    if (list.sort === 'custom') {
      tasks.sort((a, b) => (a.rank ?? 0) - (b.rank ?? 0));
    } else {
      tasks.sort((a, b) =>
        dateTimeMs(a) - dateTimeMs(b) ||
        (a.rank ?? 0) - (b.rank ?? 0) ||
        a.title.localeCompare(b.title)
      );
    }
    tasks.forEach(t => host.appendChild(renderCard(list, t)));

    // Add-task launcher (inserts a small form above the task list)
    node.querySelector('.add-task').addEventListener('click', () => {
      const existing = node.querySelector('form.task-form');
      if (existing) existing.remove();

      host.before(createTaskForm({
        onSubmit: (vals) => { addTask(list.id, vals); rerender(node); },
        defaults: { tag: list.title, due: todayISO(), time: '' },
        submitLabel: 'Add'
      }));
      node.querySelector('input[name="title"]').focus();
    });

    // Allow dropping a dragged task to the END of this list
    node.addEventListener('dragover', (e) => e.preventDefault());
    node.addEventListener('drop', (e) => {
      e.preventDefault();
      const data = safeJSON(e.dataTransfer.getData('text/plain'));
      reorderCards(data.listId, data.taskId, list.id, null, 'bottom');
    });

    return node;
  }

  // Render a single task card with checkbox, click-to-edit, and DnD reorder
  function renderCard(list, task) {
    const card = document.createElement('article');
    card.className = 'sm-card';
    card.draggable = true;          // native DnD
    card.tabIndex = 0;             // keyboard focusable
    card.style.cursor = 'pointer';
    card.dataset.taskId = task.id;

    card.innerHTML = `
      <div class="chip">${escapeHtml(task.tag || list.title)}</div>
      <div class="checkbox" role="checkbox" aria-checked="${task.done ? 'true' : 'false'}" tabindex="0">
        <input type="checkbox" ${task.done ? 'checked' : ''}/>
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M20.3 5.7a1 1 0 0 1 0 1.4l-10 10a1 1 0 0 1-1.4 0l-5-5a1 1 0 0 1 1.4-1.4L9 14.59 18.89 4.7a1 1 0 0 1 1.41 0Z"/>
        </svg>
      </div>
      <div class="task-title">${escapeHtml(task.title)}</div>
      <div class="muted due">Due: ${escapeHtml(formatDateTime(task.due, task.time))}</div>
    `;

    // === Toggle complete (use native checkbox change) ===
    const cb = card.querySelector('.checkbox');
    const input = cb.querySelector('input');

    function setDone(val) {
      updateTask(list.id, task.id, { done: val })
      cb.setAttribute('aria-checked', String(val));
      input.checked = val;
      task.done = val;
      rerender(card.closest('.list'));
    }

    // Prevent the card “edit-on-click” from firing when you hit the checkbox
    input.addEventListener('click', (e) => e.stopPropagation());

    // Use the checkbox’s own toggle as the source of truth
    input.addEventListener('change', () => setDone(input.checked));


    // Keyboard support on the faux checkbox
    cb.addEventListener('keydown', (e) => {
      if (e.key === ' ' || e.key === 'Enter') {
        e.preventDefault();
        setDone(!input.checked);
      }
    });


    // Drag & drop reorder within same list (drop above/below the target card)
    card.addEventListener('dragstart', (e) => {
      e.dataTransfer.setData('text/plain', JSON.stringify({ listId: list.id, taskId: task.id }));
      card.classList.add('dragging');
    });
    card.addEventListener('dragend', () => card.classList.remove('dragging'));
    card.addEventListener('dragover', (e) => { e.preventDefault(); card.classList.add('drag-over'); });
    card.addEventListener('dragleave', () => card.classList.remove('drag-over'));
    card.addEventListener('drop', (e) => {
      e.preventDefault();
      e.stopPropagation();
      card.classList.remove('drag-over');

      const data = safeJSON(e.dataTransfer.getData('text/plain'));

      const side = (e.offsetY < card.offsetHeight / 2) ? 'top' : 'bottom';
      reorderCards(data.listId, data.taskId, list.id, task.id, side);
    });

    return card;
  }

  // Inline add/edit task form (replaces a card on edit; shown above list for add)
  function createTaskForm({ defaults = {}, submitLabel = 'Add', onSubmit }) {
    const form = document.createElement('form');
    form.className = 'card task-form';
    form.innerHTML = `
      <div style="display:flex; gap:8px; align-items:center; margin-bottom:8px;">
        <input name="title" placeholder="Task title" required
               style="flex:1; padding:10px; border:1px solid #d9dbe3; border-radius:10px;" />
        <input type="date" name="due"  aria-label="Due date"
               style="padding:10px; border:1px solid #d9dbe3; border-radius:10px;" />
        <input type="time" name="time" aria-label="Due time"
               style="padding:10px; border:1px solid #d9dbe3; border-radius:10px;" />
      </div>
      <div style="display:flex; gap:8px; align-items:center;">
        <input name="tag" placeholder="Tag (optional)"
               style="flex:1; padding:10px; border:1px solid #d9dbe3; border-radius:10px;" />
        <button type="submit" class="btn"
                style="padding:10px 14px; border-radius:10px; border:1px solid #e6e7eb; background:#fff; font-weight:600;">
          ${submitLabel}
        </button>
        <button type="button" class="btn cancel"
                style="padding:10px 14px; border-radius:10px; border:1px solid #e6e7eb; background:#fff;">
          Cancel
        </button>
      </div>
      <div class="muted" style="margin-top:6px; font-size:12px;">
        Defaults to today — change if needed.
      </div>
    `;

    // Pre-fill defaults
    form.title.value = defaults.title || '';
    form.due.value = defaults.due || todayISO();
    form.time.value = defaults.time || '';
    form.tag.value = defaults.tag || '';

    // Submit + cancel
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
      const list = form.closest('.list');
      if (list) rerender(list);
      else form.remove();
    });

    return form;
  }

  // Rebuild a single list in place (cheap, local refresh)
  function rerender(listEl) {
    const listId = listEl.dataset.listId;
    const next = renderList(getState().lists.find(l => l.id === listId));
    listEl.replaceWith(next);
  }

  // Small utilities
  function safeJSON(s) { try { return JSON.parse(s); } catch { return null; } }
  function escapeHtml(s = '') {
    return s.replace(/[&<>"']/g, c => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[c]));
  }
})();
