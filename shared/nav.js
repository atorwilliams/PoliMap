// nav.js — shared banner behaviour for all pages with .top-banner
// 1. Keeps --banner-h in sync with the real rendered banner height, so the
//    map offset and sidebars never rely on hardcoded pixel values.
// 2. On small screens, injects a hamburger button that collapses .main-nav
//    into a dropdown panel (styles in styles.css under "Mobile nav").
(function () {
  const banner = document.querySelector('.top-banner');
  if (!banner) return;

  // ── Banner height → CSS variable ─────────────────────────────────────────
  const root = document.documentElement;
  function setBannerHeight() {
    root.style.setProperty('--banner-h', banner.offsetHeight + 'px');
  }
  if ('ResizeObserver' in window) {
    new ResizeObserver(setBannerHeight).observe(banner);
  }
  window.addEventListener('resize', setBannerHeight);
  setBannerHeight();

  // ── Hamburger toggle ─────────────────────────────────────────────────────
  const container = banner.querySelector('.banner-container');
  const nav = banner.querySelector('.main-nav');
  if (!container || !nav) return;

  const btn = document.createElement('button');
  btn.className = 'nav-toggle';
  btn.setAttribute('aria-label', 'Menu');
  btn.setAttribute('aria-expanded', 'false');
  btn.innerHTML = '<span></span><span></span><span></span>';
  container.appendChild(btn);

  function setOpen(open) {
    banner.classList.toggle('nav-open', open);
    btn.setAttribute('aria-expanded', String(open));
  }

  btn.addEventListener('click', () => setOpen(!banner.classList.contains('nav-open')));

  // Close the menu when a nav item is chosen. The province switcher button
  // (.nav-province-btn) only expands its own sublist, so it stays open.
  nav.addEventListener('click', (e) => {
    if (e.target.closest('.nav-btn, .province-drop-item')) setOpen(false);
  });

  // Close on tap outside the banner or on Escape.
  document.addEventListener('click', (e) => {
    if (banner.classList.contains('nav-open') && !e.target.closest('.top-banner')) setOpen(false);
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') setOpen(false);
  });
})();

// ── Collapsible map controls (small screens) ───────────────────────────────
// Legend/Layers panels collapse to their header pill; tapping the header
// expands them. Desktop is untouched.
(function () {
  const stack = document.getElementById('map-controls-stack');
  if (!stack) return;

  const mq = window.matchMedia('(max-width: 768px)');
  const controls = stack.querySelectorAll('.map-control');

  function applyDefault() {
    controls.forEach((c) => c.classList.toggle('collapsed', mq.matches));
  }
  applyDefault();
  mq.addEventListener('change', applyDefault);

  controls.forEach((c) => {
    const header = c.querySelector('.control-header');
    if (!header) return;
    header.addEventListener('click', () => {
      if (mq.matches) c.classList.toggle('collapsed');
    });
  });

  // After choosing a layer on mobile, tuck the panel away again
  stack.addEventListener('click', (e) => {
    const btn = e.target.closest('.layer-btn');
    if (btn && mq.matches) {
      const panel = btn.closest('.map-control');
      if (panel) panel.classList.add('collapsed');
    }
  });
})();

// ── Swipe-down to close bottom sheets (small screens) ──────────────────────
// Sidebars are created dynamically per click, so handlers are delegated.
// A downward drag from the top of a scrolled-to-top sheet follows the finger;
// past the threshold it animates out and triggers the sheet's own close button.
(function () {
  const mq = window.matchMedia('(max-width: 768px)');
  let sheet = null;
  let startX = 0;
  let startY = 0;
  let deltaY = 0;
  let dragging = false;

  document.addEventListener('touchstart', (e) => {
    if (!mq.matches) return;
    const s = e.target.closest('.party-sidebar.open, .member-detail-sidebar.open, .preview-sheet.open');
    if (!s) return;
    sheet = s;
    startX = e.touches[0].clientX;
    startY = e.touches[0].clientY;
    deltaY = 0;
    dragging = false;
  }, { passive: true });

  document.addEventListener('touchmove', (e) => {
    if (!sheet) return;
    const t = e.touches[0];
    deltaY = t.clientY - startY;

    if (!dragging) {
      const horizontal = Math.abs(t.clientX - startX) > Math.abs(deltaY);
      if (horizontal || deltaY < -8) { sheet = null; return; }
      if (deltaY > 8 && sheet.scrollTop <= 0) {
        dragging = true;
        sheet.style.transition = 'none';
      }
    }

    if (dragging) {
      e.preventDefault();
      sheet.style.transform = 'translateY(' + Math.max(0, deltaY) + 'px)';
    }
  }, { passive: false });

  document.addEventListener('touchend', () => {
    if (!sheet) return;
    const s = sheet;
    sheet = null;
    if (!dragging) return;
    dragging = false;

    if (deltaY > 90) {
      s.style.transition = 'transform 0.25s ease';
      s.style.transform = 'translateY(100%)';
      setTimeout(() => {
        const close = s.querySelector('#sidebar-close-btn, .preview-sheet-close');
        if (close) close.click();
        else s.remove();
      }, 240);
    } else {
      s.style.transition = '';
      s.style.transform = '';
    }
  });
})();
