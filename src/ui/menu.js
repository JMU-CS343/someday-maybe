// src/ui/menu.js
// Tiny popover anchored to an element; closes on outside click.

window.openMenu = function openMenu(anchor, html, onClick) {
  closeMenu();
  const m = document.createElement('div');
  m.className = 'menu-pop';
  m.innerHTML = html;
  document.body.appendChild(m);
  const r = anchor.getBoundingClientRect();
  m.style.left = (r.left + window.scrollX) + 'px';
  m.style.top  = (r.bottom + window.scrollY + 6) + 'px';
  m.addEventListener('click', e => {
    const btn = e.target.closest('button');
    if (!btn) return;
    onClick(btn.dataset.act, btn);
    closeMenu();
  });
  setTimeout(() => document.addEventListener('mousedown', onOutside, { once: true }));
  window.__menu = m;

  function onOutside(e) {
    if (!m.contains(e.target)) closeMenu();
  }
};

window.closeMenu = function closeMenu() {
  if (window.__menu) {
    window.__menu.remove();
    window.__menu = null;
  }
};

window.openThemeMenu = function (anchor) {
  openMenu(anchor, `
    <button data-act="theme-default">Default theme</button>
    <button data-act="theme-purple">Purple theme</button>
  `, (act) => {
    console.log('[menu] clicked act =', act);
    if (act === 'theme-default') {
      setTheme('default');
    }
    if (act === 'theme-purple') {
      setTheme('purple');
    }
  });
};

document.addEventListener('DOMContentLoaded', () => {
  const btn = document.querySelector('#menu-btn');
  if (btn) {
    btn.addEventListener('click', (e) => {
      openThemeMenu(e.currentTarget);
    });
  } else {
    console.warn('[menu] #menu-btn not found, theme menu will not open');
  }
});

document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('button[data-theme]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const theme = e.currentTarget.dataset.theme;
      // use the global from state.js
      setTheme(theme);
    });
  });
});

// ================================
// Mobile drawer sidebar toggle
// ================================
(() => {
  const navToggle   = document.getElementById('navToggle');
  const navBackdrop = document.getElementById('navBackdrop');

  if (!navToggle || !navBackdrop) {
    console.log('[drawer] navToggle or navBackdrop missing');
    return;
  }

  console.log('[drawer] hamburger wired');

  function isMobile() {
    return window.innerWidth <= 844;
  }

  function toggleSidebar() {
    if (!isMobile()) {
      console.log('[drawer] click ignored (not mobile width)');
      return;
    }

    const open = !document.body.classList.contains('sidebar-open');
    document.body.classList.toggle('sidebar-open', open);
    navToggle.setAttribute('aria-expanded', open ? 'true' : 'false');
    console.log('[drawer] sidebar-open =', open);
  }

  function closeSidebar() {
    document.body.classList.remove('sidebar-open');
    navToggle.setAttribute('aria-expanded', 'false');
    console.log('[drawer] sidebar closed');
  }

  // Click hamburger
  navToggle.addEventListener('click', toggleSidebar);

  // Click backdrop closes
  navBackdrop.addEventListener('click', closeSidebar);

  // ESC closes
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeSidebar();
  });

  // Resize out of mobile = force-close
  window.addEventListener('resize', () => {
    if (!isMobile()) closeSidebar();
  });
})();




