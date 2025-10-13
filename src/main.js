// src/main.js
// Bootstraps the app, handles nav routing + theme + sidebar modes.

// import { renderBoards } from './views/boards.js';
// import { renderCalendar } from './views/calendar.js';

const app = document.getElementById('app');
const sidebar = document.getElementById('sidebar');

const navToggle   = document.getElementById('navToggle');   // ☰ in header (small screens)
const navBackdrop = document.getElementById('navBackdrop'); // dark overlay for drawer
const collapseBtn = document.getElementById('collapseBtn'); // collapse to icon rail (desktop)

const mqSmall  = window.matchMedia('(max-width: 640px)');   // “really small” breakpoint

// Simple router
function setView(view) {
  localStorage.setItem('someday-view', view);
  [...sidebar.querySelectorAll('.nav-item')].forEach(b =>
    b.classList.toggle('is-active', b.dataset.view === view)
  );
  if (view === 'calendar') renderCalendar(app);
  else if (view === 'today')    window.renderToday(app);   // <— new
  else                          window.renderBoards(app);
}

// Sidebar interactions
navToggle?.addEventListener('click', () => {
  if (!mqSmall.matches) return;                 // desktop: do nothing (desktop already works)
  document.body.classList.toggle('sidebar-open');   // mobile: slide drawer
});

navBackdrop?.addEventListener('click', () => {
  if (!mqSmall.matches) return;
  document.body.classList.remove('sidebar-open');
});

collapseBtn?.addEventListener('click', () => {
  // desktop icon-rail collapse (keep your existing desktop behavior)
  if (mqSmall.matches) return;                  // ignore on mobile
  document.body.classList.toggle('sidebar-collapsed');
});

// On resize up from mobile, clean up drawer state
mqSmall.addEventListener?.('change', e => {
  if (!e.matches) document.body.classList.remove('sidebar-open');
});

// Nav clicks (auto-close drawer on mobile)
sidebar?.addEventListener('click', (e) => {
  const btn = e.target.closest('.nav-item');
  if (!btn) return;
  setView(btn.dataset.view);
  if (mqSmall.matches) document.body.classList.remove('sidebar-open');
});

// Initial route
setView(localStorage.getItem('someday-view') || 'boards');

// Theme popover
const gear = document.getElementById('gearBtn');
const panel = document.getElementById('settings');
gear.addEventListener('click', () => {
  panel.style.display = panel.style.display === 'block' ? 'none' : 'block';
});
window.addEventListener('click', (e) => {
  if (!panel.contains(e.target) && !gear.contains(e.target)) panel.style.display = 'none';
});
panel.querySelectorAll('.btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.body.classList.toggle('theme-purple', btn.dataset.theme === 'purple');
    panel.style.display = 'none';
  });
});
