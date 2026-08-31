/**
 * Student360 — main.js
 * Shared utilities: sidebar active-link, toast notifications, logout, helpers.
 */

/* ─── Sidebar active link ─────────────────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', () => {
  const currentPath = window.location.pathname.split('/').pop();
  document.querySelectorAll('.sidebar-link').forEach(link => {
    const href = (link.getAttribute('href') || '').split('/').pop();
    if (href && href === currentPath) {
      link.classList.add('active');
    } else {
      link.classList.remove('active');
    }
  });

  // Logout links
  document.querySelectorAll('a[href="../index.html"], a[href="index.html"]').forEach(el => {
    if (el.textContent.trim().toLowerCase().includes('logout')) {
      el.addEventListener('click', e => {
        e.preventDefault();
        S360.clearSession();
        window.location.href = el.getAttribute('href');
      });
    }
  });
});

/* ─── Toast notification system ──────────────────────────────────────────── */
window.S360 = window.S360 || {};

S360.toast = function (message, type = 'info', duration = 3000) {
  let container = document.getElementById('s360-toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 's360-toast-container';
    container.style.cssText = `
      position: fixed; bottom: 1.5rem; right: 1.5rem;
      display: flex; flex-direction: column; gap: 0.5rem; z-index: 9999;
    `;
    document.body.appendChild(container);
  }

  const colors = {
    info:    { bg: 'var(--ink)',        color: 'var(--paper)' },
    success: { bg: 'var(--green)',      color: 'var(--paper)' },
    error:   { bg: 'var(--red)',        color: 'var(--paper)' },
    warning: { bg: 'var(--gold-ink)',   color: 'var(--paper)' },
  };
  const c = colors[type] || colors.info;

  const toast = document.createElement('div');
  toast.style.cssText = `
    background: ${c.bg}; color: ${c.color};
    padding: 0.75rem 1.25rem; border-radius: 4px;
    font-size: 0.875rem; font-family: var(--font-sans);
    box-shadow: 0 4px 16px rgba(0,0,0,0.15);
    transform: translateX(120%); transition: transform 0.25s ease;
    max-width: 320px;
  `;
  toast.textContent = message;
  container.appendChild(toast);

  requestAnimationFrame(() => {
    requestAnimationFrame(() => { toast.style.transform = 'translateX(0)'; });
  });

  setTimeout(() => {
    toast.style.transform = 'translateX(120%)';
    setTimeout(() => toast.remove(), 300);
  }, duration);
};

/* ─── Simple localStorage session helpers ────────────────────────────────── */
S360.getSession = function () {
  try { return JSON.parse(localStorage.getItem('s360_session') || 'null'); }
  catch { return null; }
};

S360.setSession = function (data) {
  localStorage.setItem('s360_session', JSON.stringify(data));
};

S360.clearSession = function () {
  localStorage.removeItem('s360_session');
};

/* ─── Format helpers ─────────────────────────────────────────────────────── */
S360.formatMinutes = function (mins) {
  if (mins < 60) return `${mins}m`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m ? `${h}h ${m}m` : `${h}h`;
};

S360.formatDate = function (dateStr) {
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
};

S360.today = function () {
  return new Date().toISOString().split('T')[0];
};

/* ── == uiux-student-track additions == ────────────────────────────── */

/**
 * S360.initSidebar()
 * Handles:
 *  - Desktop collapse toggle (icon-only mode), persisted in localStorage
 *  - Mobile drawer open/close with backdrop
 * Call after DOMContentLoaded on every student page (auto-called below).
 */
S360.initSidebar = function () {
  const sidebar = document.querySelector('.sidebar');
  if (!sidebar) return;

  // ── Desktop collapse ───────────────────────────────────────────────
  const collapseBtn = document.querySelector('.sidebar-collapse-btn');
  const COLLAPSED_KEY = 's360_sidebar_collapsed';

  function applySidebarState(collapsed) {
    if (collapsed) {
      sidebar.classList.add('collapsed');
      if (collapseBtn) collapseBtn.setAttribute('aria-label', 'Expand sidebar');
    } else {
      sidebar.classList.remove('collapsed');
      if (collapseBtn) collapseBtn.setAttribute('aria-label', 'Collapse sidebar');
    }
  }

  // Restore persisted state
  const savedCollapsed = localStorage.getItem(COLLAPSED_KEY) === 'true';
  applySidebarState(savedCollapsed);

  if (collapseBtn) {
    collapseBtn.addEventListener('click', () => {
      const nowCollapsed = !sidebar.classList.contains('collapsed');
      localStorage.setItem(COLLAPSED_KEY, nowCollapsed);
      applySidebarState(nowCollapsed);
    });
  }

  // ── Mobile drawer ──────────────────────────────────────────────────
  let backdrop = document.querySelector('.sidebar-backdrop');
  if (!backdrop) {
    backdrop = document.createElement('div');
    backdrop.className = 'sidebar-backdrop';
    backdrop.setAttribute('aria-hidden', 'true');
    document.body.appendChild(backdrop);
  }

  const hamburger = document.querySelector('.sidebar-hamburger');

  function openMobileNav() {
    sidebar.classList.add('mobile-open');
    backdrop.classList.add('open');
    document.body.style.overflow = 'hidden';
    if (hamburger) hamburger.setAttribute('aria-expanded', 'true');
  }

  function closeMobileNav() {
    sidebar.classList.remove('mobile-open');
    backdrop.classList.remove('open');
    document.body.style.overflow = '';
    if (hamburger) hamburger.setAttribute('aria-expanded', 'false');
  }

  if (hamburger) hamburger.addEventListener('click', openMobileNav);
  backdrop.addEventListener('click', closeMobileNav);

  // Close on Escape
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && sidebar.classList.contains('mobile-open')) closeMobileNav();
  });
};

/**
 * S360.countUp(element, target, duration)
 * Animates a number from 0 → target inside `element` over `duration` ms.
 * Respects prefers-reduced-motion.
 */
S360.countUp = function (el, target, duration = 900) {
  if (!el) return;
  const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (prefersReduced) { el.textContent = target; return; }

  const start = performance.now();
  const startVal = 0;

  function step(now) {
    const elapsed = now - start;
    const progress = Math.min(elapsed / duration, 1);
    const eased = 1 - Math.pow(1 - progress, 3); // ease-out cubic
    const current = Math.round(startVal + (target - startVal) * eased);
    el.textContent = current;
    if (progress < 1) requestAnimationFrame(step);
  }

  requestAnimationFrame(step);
};

/**
 * S360.initProgressBars()
 * Triggers animated width on .progress-fill elements with data-pct attribute
 * using IntersectionObserver so they animate on first paint into viewport.
 */
S360.initProgressBars = function () {
  const fills = document.querySelectorAll('.progress-fill[data-pct]');
  if (!fills.length) return;

  const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const el = entry.target;
        const pct = el.dataset.pct;
        if (prefersReduced) {
          el.style.width = pct + '%';
        } else {
          requestAnimationFrame(() => {
            el.style.width = pct + '%';
          });
        }
        observer.unobserve(el);
      }
    });
  }, { threshold: 0.1 });

  fills.forEach(el => observer.observe(el));
};

// Auto-init sidebar and progress bars on DOMContentLoaded
document.addEventListener('DOMContentLoaded', () => {
  S360.initSidebar();
  S360.initProgressBars();
});
