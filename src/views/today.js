// src/views/today.js
// Shows all tasks due today across all lists (non-module)

(() => {
  const { getState, todayISO, dateTimeMs, formatDateTime, updateTask } = window;

  window.renderToday = function renderToday(root) {
    const today = todayISO();

    // gather all tasks due today
    const lists = (getState().lists || []);
    const items = [];
    for (const l of lists) {
      for (const t of (l.tasks || [])) {
        if (t.due === today) items.push({ list: l, task: t });
      }
    }

    // sort by time, then title
    items.sort((a, b) =>
      dateTimeMs(a.task) - dateTimeMs(b.task) ||
      a.task.title.localeCompare(b.task.title)
    );

    // shell
    root.innerHTML = "";
    const wrap = document.createElement('section');
    wrap.className = 'list'; // reuse your nice list/card styles
    wrap.innerHTML = `
      <div class="list-header">
        <h2 class="list-title">Today — ${new Date(today + "T00:00").toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' })}</h2>
      </div>
      <div class="tasks"></div>
    `;
    root.appendChild(wrap);

    const host = wrap.querySelector('.tasks');

    if (items.length === 0) {
      const empty = document.createElement('div');
      empty.className = 'card';
      empty.innerHTML = `
        <div class="task-title">Nothing due today 🎉</div>
        <div class="muted">Add a task on any board and set its date to today.</div>
      `;
      host.appendChild(empty);
      return;
    }

    for (const { list, task } of items) {
      host.appendChild(renderTodayCard(list, task, today));
    }
  };

  function renderTodayCard(list, task, dateStr) {
    const card = document.createElement('article');
    card.className = 'sm-card';
    card.tabIndex = 0;

    const time = task.time
      ? new Date(`${dateStr}T${task.time}`).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' }) + ' · '
      : '';

    card.innerHTML = `
      <div class="chip">${escapeHtml(list.title)}</div>
      <div class="checkbox" role="checkbox" aria-checked="${task.done ? 'true' : 'false'}" tabindex="0">
        <input type="checkbox" ${task.done ? 'checked' : ''}/>
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20.3 5.7a1 1 0 0 1 0 1.4l-10 10a1 1 0 0 1-1.4 0l-5-5a1 1 0 0 1 1.4-1.4L9 14.59 18.89 4.7a1 1 0 0 1 1.41 0Z"/></svg>
      </div>
      <div class="task-title">${escapeHtml(task.title)}</div>
      <div class="muted">${escapeHtml(time + (formatDateTime(task.due, task.time) || ''))}</div>
    `;

    const cb = card.querySelector('.checkbox');
    const input = cb.querySelector('input');
    const toggleDone = () => {
      updateTask(list.id, task.id, { done: !task.done });
      cb.setAttribute('aria-checked', String(!task.done));
      input.checked = !task.done;
    };
    cb.addEventListener('click', (e) => { e.stopPropagation(); toggleDone(); });
    cb.addEventListener('keydown', (e) => {
      if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); toggleDone(); }
    });

    return card;
  }

  function escapeHtml(s = '') {
    return s.replace(/[&<>"']/g, c => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[c]));
  }
})();
