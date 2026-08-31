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
