// src/main.js
// Bootstraps the app, handles nav routing + theme + sidebar modes.

import { renderBoards } from './views/boards.js';
import { renderCalendar } from './views/calendar.js';

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
  else renderBoards(app);
}

// Sidebar interactions
navToggle?.addEventListener('click', () => {
  document.body.classList.toggle('sidebar-open');   // slide drawer on small screens
});
navBackdrop?.addEventListener('click', () => {
  document.body.classList.remove('sidebar-open');
});
collapseBtn?.addEventListener('click', () => {
  document.body.classList.toggle('sidebar-collapsed'); // icon rail on desktop
});
mqSmall.addEventListener?.('change', e => {
  if (!e.matches) document.body.classList.remove('sidebar-open'); // cleanup on resize
});

// Nav clicks (auto-close drawer on small)
sidebar.addEventListener('click', (e) => {
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
