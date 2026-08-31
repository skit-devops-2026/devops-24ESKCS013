/**
 * Student360 — study.js
 * Manages the live study timer and session logging on study.html.
 * Phase 2.5 additions: timer state ring, heatmap custom tooltip, session fade-in.
 */

document.addEventListener('DOMContentLoaded', () => {
  /* ── State ──────────────────────────────────────────────────────────────── */
  let timerInterval = null;
  let elapsedSeconds = 0;
  let sessionMaxSeconds = 0; // for ring progress
  let isRunning = false;

  // LocalStorage data store (mock — Phase 3 replaces with API)
  function getSessions() {
    return JSON.parse(localStorage.getItem('s360_study_sessions') || '[]');
  }
  function saveSessions(sessions) {
    localStorage.setItem('s360_study_sessions', JSON.stringify(sessions));
  }

  /* ── DOM refs ─────────────────────────────────────────────────────────────*/
  const display      = document.getElementById('timer-display');
  const startBtn     = document.getElementById('timer-start');
  const pauseBtn     = document.getElementById('timer-pause');
  const stopBtn      = document.getElementById('timer-stop');
  const subjectSel   = document.getElementById('timer-subject');
  const typeSel      = document.getElementById('timer-type');
  const noteInput    = document.getElementById('timer-note');
  const sessionList  = document.getElementById('session-list');
  const ringWrap     = document.getElementById('timer-ring-wrap');
  const ringProgress = document.getElementById('timer-ring-progress');
  const stateLabel   = document.getElementById('timer-state-label');

  if (!display) return; // Not on study page

  /* ── Timer helpers ──────────────────────────────────────────────────────── */
  function formatTime(secs) {
    const h = String(Math.floor(secs / 3600)).padStart(2, '0');
    const m = String(Math.floor((secs % 3600) / 60)).padStart(2, '0');
    const s = String(secs % 60).padStart(2, '0');
    return `${h}:${m}:${s}`;
  }

  // Ring: circumference = 2π × 70 ≈ 440
  const RING_C = 440;

  function updateRing(state) {
    if (!ringWrap) return;
    ringWrap.dataset.state = state;
    if (stateLabel) {
      const labels = { stopped: 'Ready', running: 'Focused', paused: 'Paused' };
      stateLabel.textContent = labels[state] || '';
      stateLabel.style.color = state === 'running' ? 'var(--gold-ink)' :
                               state === 'paused'  ? 'var(--ink-soft)' : 'var(--ink-faint)';
    }

    if (ringProgress) {
      if (state === 'stopped') {
        ringProgress.style.strokeDashoffset = RING_C;
        return;
      }
      // Target: 45-minute session = full ring
      const targetSeconds = 45 * 60;
      const progress = Math.min(elapsedSeconds / targetSeconds, 1);
      const offset = RING_C - (RING_C * progress);
      ringProgress.style.strokeDashoffset = offset;
    }
  }

  function tick() {
    elapsedSeconds++;
    display.textContent = formatTime(elapsedSeconds);
    updateRing('running');
  }

  /* ── Timer controls ─────────────────────────────────────────────────────── */
  if (startBtn) {
    startBtn.addEventListener('click', () => {
      if (isRunning) return;
      if (!subjectSel.value) { S360.toast('Please select a subject first.', 'error'); return; }
      isRunning = true;
      timerInterval = setInterval(tick, 1000);
      startBtn.disabled = true;
      pauseBtn.disabled = false;
      stopBtn.disabled  = false;
      updateRing('running');
      S360.toast('Session started. Stay focused!', 'info');
    });
  }

  let resumeHandler = null;

  if (pauseBtn) {
    pauseBtn.addEventListener('click', () => {
      if (!isRunning && pauseBtn.textContent.trim() !== 'Resume') return;

      if (isRunning) {
        // Pause
        isRunning = false;
        clearInterval(timerInterval);
        pauseBtn.textContent = 'Resume';
        updateRing('paused');
        resumeHandler = () => {
          isRunning = true;
          timerInterval = setInterval(tick, 1000);
          pauseBtn.textContent = 'Pause';
          updateRing('running');
        };
        pauseBtn.addEventListener('click', resumeHandler, { once: true });
      }
    });
  }

  if (stopBtn) {
    stopBtn.addEventListener('click', () => {
      if (elapsedSeconds < 60) {
        S360.toast('Session too short (< 1 min). Keep going!', 'warning');
        return;
      }
      clearInterval(timerInterval);
      isRunning = false;

      const session = {
        id:        Date.now(),
        subject:   subjectSel.value,
        type:      typeSel ? typeSel.value : 'Study',
        note:      noteInput ? noteInput.value.trim() : '',
        duration:  elapsedSeconds,
        date:      new Date().toISOString(),
      };

      const sessions = getSessions();
      sessions.unshift(session);
      saveSessions(sessions);

      S360.toast(`Session saved — ${S360.formatMinutes(Math.round(elapsedSeconds / 60))} logged for ${session.subject}!`, 'success');

      // Reset UI
      elapsedSeconds = 0;
      display.textContent = '00:00:00';
      startBtn.disabled = false;
      pauseBtn.disabled = true;
      stopBtn.disabled  = true;
      pauseBtn.textContent = 'Pause';
      if (noteInput) noteInput.value = '';
      updateRing('stopped');

      renderSessions(true); // true = animate new entry
    });
  }

  /* ── Session list renderer ──────────────────────────────────────────────── */
  function renderSessions(animateFirst = false) {
    if (!sessionList) return;
    const sessions = getSessions();

    if (sessions.length === 0) {
      sessionList.innerHTML = '<li class="text-faint" style="padding:1rem; font-size:0.875rem; text-align:center;">No sessions logged yet. Start the timer above.</li>';
      return;
    }

    sessionList.innerHTML = sessions.slice(0, 10).map((s, idx) => `
      <li class="activity-item${animateFirst && idx === 0 ? ' session-new' : ''}" style="transition:opacity 0.3s;">
        <div class="activity-time">${new Date(s.date).toLocaleDateString('en-US',{month:'short',day:'numeric'})}</div>
        <div class="activity-desc">
          <strong>${s.subject}</strong> — ${s.type} — ${S360.formatMinutes(Math.round(s.duration / 60))}
          ${s.note ? `<br><span class="text-faint">${s.note}</span>` : ''}
        </div>
        <button class="btn btn-outline" style="padding:0.2rem 0.5rem;font-size:0.75rem;color:var(--red);border-color:var(--red-soft);"
          data-id="${s.id}" aria-label="Delete session for ${s.subject}">Delete</button>
      </li>
    `).join('');

    // Delete handlers
    sessionList.querySelectorAll('[data-id]').forEach(btn => {
      btn.addEventListener('click', () => {
        const updated = getSessions().filter(s => s.id != btn.dataset.id);
        saveSessions(updated);
        renderSessions();
        S360.toast('Session removed.', 'info');
      });
    });
  }

  renderSessions();

  /* ── Weekly heatmap updater (reads stored sessions) ──────────────────────*/
  const heatCells = document.querySelectorAll('.heat-cell[data-date]');
  if (heatCells.length) {
    const sessions = getSessions();
    const minutesByDate = {};
    sessions.forEach(s => {
      const d = s.date.split('T')[0];
      minutesByDate[d] = (minutesByDate[d] || 0) + Math.round(s.duration / 60);
    });
    heatCells.forEach(cell => {
      const mins = minutesByDate[cell.dataset.date] || 0;
      let intensity = 0;
      if (mins >= 240) intensity = 1;
      else if (mins >= 120) intensity = 0.7;
      else if (mins >= 60)  intensity = 0.45;
      else if (mins > 0)    intensity = 0.2;

      if (intensity) {
        cell.style.backgroundColor = `rgba(184,151,76,${intensity})`;
        cell.style.borderColor = `rgba(184,151,76,0.8)`;
      }

      // Rich tooltip via data-tooltip (CSS picks it up)
      cell.dataset.tooltip = mins ? `${cell.dataset.date} · ${mins} mins` : `${cell.dataset.date} · No data`;
    });
  }

  // Init ring to stopped state
  updateRing('stopped');
});
