/**
 * Student360 — study.js
 * Manages the live study timer and session logging on study.html.
 */

document.addEventListener('DOMContentLoaded', () => {
  /* ── State ──────────────────────────────────────────────────────────────── */
  let timerInterval = null;
  let elapsedSeconds = 0;
  let isRunning = false;

  // LocalStorage data store (mock — Phase 3 replaces with API)
  function getSessions() {
    return JSON.parse(localStorage.getItem('s360_study_sessions') || '[]');
  }
  function saveSessions(sessions) {
    localStorage.setItem('s360_study_sessions', JSON.stringify(sessions));
  }

  /* ── DOM refs ─────────────────────────────────────────────────────────────*/
  const display     = document.getElementById('timer-display');
  const startBtn    = document.getElementById('timer-start');
  const pauseBtn    = document.getElementById('timer-pause');
  const stopBtn     = document.getElementById('timer-stop');
  const subjectSel  = document.getElementById('timer-subject');
  const typeSel     = document.getElementById('timer-type');
  const noteInput   = document.getElementById('timer-note');
  const sessionList = document.getElementById('session-list');

  if (!display) return; // Not on study page

  /* ── Timer helpers ──────────────────────────────────────────────────────── */
  function formatTime(secs) {
    const h = String(Math.floor(secs / 3600)).padStart(2, '0');
    const m = String(Math.floor((secs % 3600) / 60)).padStart(2, '0');
    const s = String(secs % 60).padStart(2, '0');
    return `${h}:${m}:${s}`;
  }

  function tick() {
    elapsedSeconds++;
    display.textContent = formatTime(elapsedSeconds);
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
      S360.toast('Session started. Stay focused!', 'info');
    });
  }

  if (pauseBtn) {
    pauseBtn.addEventListener('click', () => {
      if (!isRunning) return;
      isRunning = false;
      clearInterval(timerInterval);
      pauseBtn.textContent = 'Resume';
      pauseBtn.addEventListener('click', resumeHandler, { once: true });
    });

    function resumeHandler() {
      isRunning = true;
      timerInterval = setInterval(tick, 1000);
      pauseBtn.textContent = 'Pause';
    }
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
      if (noteInput) noteInput.value = '';

      renderSessions();
    });
  }

  /* ── Session list renderer ──────────────────────────────────────────────── */
  function renderSessions() {
    if (!sessionList) return;
    const sessions = getSessions();

    if (sessions.length === 0) {
      sessionList.innerHTML = '<li class="text-faint" style="padding:1rem; font-size:0.875rem;">No sessions logged yet. Start the timer above.</li>';
      return;
    }

    sessionList.innerHTML = sessions.slice(0, 10).map(s => `
      <li class="activity-item">
        <div class="activity-time">${new Date(s.date).toLocaleDateString('en-US',{month:'short',day:'numeric'})}</div>
        <div class="activity-desc">
          <strong>${s.subject}</strong> — ${s.type} — ${S360.formatMinutes(Math.round(s.duration / 60))}
          ${s.note ? `<br><span class="text-faint">${s.note}</span>` : ''}
        </div>
        <button class="btn btn-outline" style="padding:0.2rem 0.5rem;font-size:0.75rem;" data-id="${s.id}">Delete</button>
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
      // 0 = 0%, 60 = low, 120 = mid, 240+ = high
      let intensity = 0;
      if (mins >= 240) intensity = 1;
      else if (mins >= 120) intensity = 0.7;
      else if (mins >= 60)  intensity = 0.45;
      else if (mins > 0)    intensity = 0.2;
      cell.style.backgroundColor = intensity
        ? `rgba(184,151,76,${intensity})`  // gold tint for heat
        : '';
      cell.title = mins ? `${mins} mins studied` : 'No data';
    });
  }
});
