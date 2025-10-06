// src/ui/menu.js
// Tiny popover anchored to an element; closes on outside click.

export function openMenu(anchor, html, onClick) {
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
  }
  
  export function closeMenu() {
    if (window.__menu) {
      window.__menu.remove();
      window.__menu = null;
    }
  }
  