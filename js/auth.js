/**
 * Student360 — auth.js
 * Handles student/admin login and registration forms with validation.
 */

document.addEventListener('DOMContentLoaded', () => {

  /* ── Student Login ──────────────────────────────────────────────────────── */
  const studentLoginForm = document.getElementById('student-login-form');
  if (studentLoginForm) {
    studentLoginForm.addEventListener('submit', e => {
      e.preventDefault();
      const email = document.getElementById('login-email').value.trim();
      const password = document.getElementById('login-password').value;

      if (!email || !password) {
        S360.toast('Please fill in all fields.', 'error');
        return;
      }

      // Mock auth — in Phase 3 this will call POST /api/auth/student/login
      const mockStudent = { id: 'stu-001', name: 'Jane Doe', role: 'student', email };
      S360.setSession(mockStudent);
      S360.toast('Welcome back, ' + mockStudent.name + '!', 'success');
      setTimeout(() => { window.location.href = '../student/dashboard.html'; }, 800);
    });
  }

  /* ── Student Register ───────────────────────────────────────────────────── */
  const studentRegisterForm = document.getElementById('student-register-form');
  if (studentRegisterForm) {
    studentRegisterForm.addEventListener('submit', e => {
      e.preventDefault();
      const name = document.getElementById('reg-name').value.trim();
      const email = document.getElementById('reg-email').value.trim();
      const password = document.getElementById('reg-password').value;
      const confirmPw = document.getElementById('reg-confirm-password').value;
      const course = document.getElementById('reg-course').value;

      if (!name || !email || !password || !confirmPw || !course) {
        S360.toast('Please complete all fields.', 'error'); return;
      }
      if (password !== confirmPw) {
        S360.toast('Passwords do not match.', 'error'); return;
      }
      if (password.length < 8) {
        S360.toast('Password must be at least 8 characters.', 'error'); return;
      }

      // Mock registration
      const newStudent = { id: 'stu-new-' + Date.now(), name, role: 'student', email, course };
      S360.setSession(newStudent);
      S360.toast('Account created! Redirecting…', 'success');
      setTimeout(() => { window.location.href = '../student/dashboard.html'; }, 800);
    });

    // Real-time password strength indicator
    const pwInput = document.getElementById('reg-password');
    const strengthBar = document.getElementById('pw-strength-bar');
    if (pwInput && strengthBar) {
      pwInput.addEventListener('input', () => {
        const len = pwInput.value.length;
        let pct = 0, color = 'var(--red)';
        if (len >= 12) { pct = 100; color = 'var(--green)'; }
        else if (len >= 8) { pct = 66; color = 'var(--gold-ink)'; }
        else if (len > 0) { pct = 33; color = 'var(--red)'; }
        strengthBar.style.width = pct + '%';
        strengthBar.style.backgroundColor = color;
      });
    }
  }

  /* ── Admin Login ────────────────────────────────────────────────────────── */
  const adminLoginForm = document.getElementById('admin-login-form');
  if (adminLoginForm) {
    adminLoginForm.addEventListener('submit', e => {
      e.preventDefault();
      const email = document.getElementById('admin-email').value.trim();
      const password = document.getElementById('admin-password').value;

      if (!email || !password) {
        S360.toast('Please fill in all fields.', 'error'); return;
      }

      // Mock admin auth
      const mockAdmin = { id: 'adm-001', name: 'Administrator', role: 'admin', email };
      S360.setSession(mockAdmin);
      S360.toast('Welcome, Admin!', 'success');
      setTimeout(() => { window.location.href = '../admin/dashboard.html'; }, 800);
    });
  }
});
