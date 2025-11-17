// src/main.js
// Bootstraps the app, handles view routing, and all sidebar behaviors:
// - Desktop (≥1190px): full sidebar, can collapse to rail
// - Rail   (845–1189): icon rail with hover "peek" and optional pin
// - Drawer (≤844px)   : off-canvas sidebar toggled by hamburger/backdrop

// ------------------------ DOM refs ------------------------
const app = document.getElementById('app');
const sidebar = document.getElementById('sidebar');
const navToggle = document.getElementById('navToggle');    // hamburger (drawer)
const navBackdrop = document.getElementById('navBackdrop');  // overlay for drawer
const collapseBtn = document.getElementById('collapseBtn');  // bottom chevron

// Search input (in the top bar)
const searchInput = document.getElementById('taskSearch');

// global search term (empty = no filtering)
window.currentSearch = '';

// ---------------------- Breakpoints -----------------------
// Mirror the CSS breakpoints exactly so behavior/UI stay in lockstep.
const mqSmall = window.matchMedia('(max-width: 844px)');
const mqRail = window.matchMedia('(max-width: 1189px) and (min-width: 845px)');

// ------------------------ Router -------------------------
// Renders the requested view and updates active state in the sidebar.
function setView(view) {
  localStorage.setItem('someday-view', view);
  document.body.setAttribute('data-view', view);

  rerenderView();
}

function rerenderView() {
  let view = localStorage.getItem('someday-view') || 'boards';

  // Update active highlight in the sidebar nav
  [...(sidebar?.querySelectorAll('.nav-item') || [])].forEach(btn => {
    btn.classList.toggle('is-active', btn.dataset.view === view);
  });

  // Render into #app
  if (view === 'calendar') {
    window.renderCalendar?.(app);
  } else if (view === 'today') {
    window.renderToday?.(app);
  } else {
    window.renderBoards?.(app); // default: Dashboard/Boards
  }
}

// ------------------ State/ARIA sync helper ----------------
// Keeps the chevron’s aria-label/expanded (and hamburger’s expanded) in sync.
function syncCollapseAffordance() {
  // Drawer (≤844)
  if (mqSmall.matches) {
    const open = document.body.classList.contains('sidebar-open');
    collapseBtn?.setAttribute('aria-label', open ? 'Close navigation' : 'Open navigation');
    collapseBtn?.setAttribute('aria-expanded', String(open));
    navToggle?.setAttribute('aria-expanded', String(open));
    return;
  }

  // Rail (845–1189)
  if (mqRail.matches) {
    const pinned = document.body.classList.contains('sidebar-peek-pinned');
    const showing = pinned || document.body.classList.contains('sidebar-peek-hover');
    collapseBtn?.setAttribute('aria-label', pinned ? 'Unpin sidebar' : 'Pin sidebar');
    collapseBtn?.setAttribute('aria-expanded', String(showing));
    navToggle?.setAttribute('aria-expanded', 'false'); // hamburger hidden in rail
    return;
  }

  // Desktop (≥1190)
  const collapsed = document.body.classList.contains('sidebar-collapsed');
  collapseBtn?.setAttribute('aria-label', collapsed ? 'Expand sidebar' : 'Collapse sidebar');
  collapseBtn?.setAttribute('aria-expanded', String(!collapsed));
  navToggle?.setAttribute('aria-expanded', 'false'); // hamburger hidden on desktop
}

// ------------------ Sidebar interactions -----------------
// Drawer: hamburger toggles the open class (safe to call at any size).
navToggle?.addEventListener('click', () => {
  const isOpen = document.body.classList.toggle('sidebar-open');
  navToggle.setAttribute('aria-expanded', String(isOpen));
  syncCollapseAffordance();
});

// Drawer: clicking the backdrop closes it.
navBackdrop?.addEventListener('click', () => {
  document.body.classList.remove('sidebar-open');
  navToggle?.setAttribute('aria-expanded', 'false');
  syncCollapseAffordance();
});

// Clean up drawer/rail state on breakpoint changes.
[mqSmall, mqRail].forEach(mq =>
  mq.addEventListener?.('change', () => {
    if (!mqSmall.matches) {
      document.body.classList.remove('sidebar-open');
      navToggle?.setAttribute('aria-expanded', 'false');
    }
    if (!mqRail.matches) {
      document.body.classList.remove('sidebar-peek', 'sidebar-peek-hover', 'sidebar-peek-pinned');
    }
    syncCollapseAffordance();
  })
);

// Rail (845–1189): hover to peek (non-pinned).
sidebar?.addEventListener('mouseenter', () => {
  if (!mqRail.matches) return;
  document.body.classList.add('sidebar-peek', 'sidebar-peek-hover');
  syncCollapseAffordance();
});
sidebar?.addEventListener('mouseleave', () => {
  if (!mqRail.matches) return;
  document.body.classList.remove('sidebar-peek-hover');
  if (!document.body.classList.contains('sidebar-peek-pinned')) {
    document.body.classList.remove('sidebar-peek');
  }
  syncCollapseAffordance();
});

// Chevron works in ALL modes:
// - Drawer:  open/close the drawer
// - Rail:    pin/unpin the peek overlay (makes it sticky)
// - Desktop: collapse/expand the full sidebar
collapseBtn?.addEventListener('click', (e) => {
  e.preventDefault();

  if (mqSmall.matches) {
    const nowOpen = document.body.classList.toggle('sidebar-open');
    navToggle?.setAttribute('aria-expanded', String(nowOpen));
    syncCollapseAffordance();
    return;
  }

  if (mqRail.matches) {
    const pinned = document.body.classList.toggle('sidebar-peek-pinned');
    if (pinned) {
      document.body.classList.add('sidebar-peek'); // ensure visible when pinned
    } else if (!document.body.classList.contains('sidebar-peek-hover')) {
      document.body.classList.remove('sidebar-peek');
    }
    syncCollapseAffordance();
    return;
  }

  // Desktop
  document.body.classList.toggle('sidebar-collapsed');
  syncCollapseAffordance();
});

// ESC closes any visible peek (rail).
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && document.body.classList.contains('sidebar-peek')) {
    document.body.classList.remove('sidebar-peek', 'sidebar-peek-pinned', 'sidebar-peek-hover');
    syncCollapseAffordance();
  }
});

// Clicking a sidebar nav item switches view; if in drawer, also close it.
sidebar?.addEventListener('click', (e) => {
  const btn = e.target.closest('.nav-item');
  if (!btn) return;
  setView(btn.dataset.view);
  if (mqSmall.matches) {
    document.body.classList.remove('sidebar-open');
    navToggle?.setAttribute('aria-expanded', 'false');
    syncCollapseAffordance();
  }
});

// ---------------------- Theme popover ---------------------
const gear = document.getElementById('gearBtn');
const panel = document.getElementById('settings');

gear?.addEventListener('click', () => {
  panel.style.display = panel.style.display === 'block' ? 'none' : 'block';
});
window.addEventListener('click', (e) => {
  if (!panel.contains(e.target) && !gear.contains(e.target)) {
    panel.style.display = 'none';
  }
});
panel?.querySelectorAll('.btn').forEach(btn => {
  btn.addEventListener('click', (e) => {
    e.preventDefault();

    const theme = btn.dataset.theme;
    if (theme === 'purple' || theme === 'default') {
      // update state + LS + DOM
      window.setTheme(theme);
    }

    panel.style.display = 'none';
  });
});

// ---------------------- Search wiring ----------------------
searchInput?.addEventListener('input', (e) => {
  window.currentSearch = (e.target.value || '').toLowerCase();

  // Re-render the current view so filtering applies everywhere
  const view = document.body.getAttribute('data-view') || 'boards';
  setView(view);
});

// ------------------------ Boot ---------------------------
// Render the last-view (default Boards) and sync ARIA/init state.
setView(localStorage.getItem('someday-view') || 'boards');
syncCollapseAffordance();
