// src/views/calendar.js
// Read-only month grid based on tasks' due dates/times (non-module version).

// TODO: https://holidayapi.com/

(() => {
  // Pull needed helpers from globals exposed by state.js
  const { getState, dateTimeMs, holidayGet } = window;

  // Expose renderer as a global for main.js
  window.renderCalendar = function renderCalendar(root) {
    const now = new Date();
    let y = now.getFullYear();
    let m = now.getMonth();

    const wrap = document.createElement('section');
    wrap.id = 'calendar-view';
    root.innerHTML = '';
    root.appendChild(wrap);

    draw();

    function draw() {
      // Collect tasks and bucket by YYYY-MM-DD
      const lists = (getState().lists || []);
      const tasks = lists.flatMap(l => l.tasks || []);
      const byDate = new Map();
      for (const t of tasks) {
        if (!t || !t.due) continue;
        if (!byDate.has(t.due)) byDate.set(t.due, []);
        byDate.get(t.due).push(t);
      }

      const first = new Date(y, m, 1);
      const startDay = first.getDay();
      const daysInMonth = new Date(y, m + 1, 0).getDate();
      const monthName = first.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });

      wrap.innerHTML = `
        <div class="cal-head">
          <button class="btn" id="calPrev" aria-label="Previous month">◀</button>
          <h2>${monthName}</h2>
          <button class="btn" id="calNext" aria-label="Next month">▶</button>
        </div>
        <div class="cal-dow">${['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => `<div>${d}</div>`).join('')}</div>
        <div class="cal-grid"></div>
      `;

      const grid = wrap.querySelector('.cal-grid');

      // Leading blanks
      for (let i = 0; i < startDay; i++) grid.appendChild(document.createElement('div'));

      // Days of month
      for (let day = 1; day <= daysInMonth; day++) {
        const cell = document.createElement('div');
        cell.className = 'cal-cell';

        const dateStr =
          `${y}-${String(m + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

        const head = document.createElement('div');
        head.classList.add("cal-cell-head", "row", "align-items-center");
        head.innerHTML = `
          <div class="col-auto cal-date">${day}</div>
          <div class="col cal-holiday whitespace-nowrap overflow-scroll">
            <i class="fa-solid fa-spinner spinner"></i>
          </div>
        `;
        cell.appendChild(head);

        const holidayElem = head.querySelector('.cal-holiday');

        const items = (byDate.get(dateStr) || [])
          .slice() // don’t mutate original
          .sort((a, b) => dateTimeMs(a) - dateTimeMs(b));

        for (const t of items.slice(0, 4)) {
          const s = document.createElement('div');
          s.className = 'cal-item';
          const time = t.time
            ? new Date(`${dateStr}T${t.time}`)
              .toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' }) + ' · '
            : '';
          s.textContent = time + t.title;
          cell.appendChild(s);
        }

        if (items.length > 4) {
          const more = document.createElement('div');
          more.className = 'cal-item';
          more.textContent = `+${items.length - 4} more`;
          cell.appendChild(more);
        }

        holidayGet(y, m + 1, day)
          .then(holiday => {
            if (holiday) {
              holidayElem.textContent = holiday.name;
            } else {
              holidayElem.innerHTML = "";
            }
          })
          .catch(err => {
            console.log(err);
          });

        grid.appendChild(cell);
      }

      // Nav handlers
      wrap.querySelector('#calPrev').onclick = () => {
        m--; if (m < 0) { m = 11; y--; } draw();
      };
      wrap.querySelector('#calNext').onclick = () => {
        m++; if (m > 11) { m = 0; y++; } draw();
      };
    }
  };
})();

