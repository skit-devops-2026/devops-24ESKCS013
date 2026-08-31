/**
 * Student360 — analytics.js
 * Draws bar/donut charts using the Canvas API (no external dependencies).
 * Reads data from localStorage for a fully offline Phase 2 experience.
 */

document.addEventListener('DOMContentLoaded', () => {

  /* ── Helpers ─────────────────────────────────────────────────────────────*/
  function getSessions() {
    return JSON.parse(localStorage.getItem('s360_study_sessions') || '[]');
  }

  const SUBJECTS = ['Calculus II', 'Physics 101', 'Computer Science', 'Literature'];
  const COLORS   = ['#2C2C2C', '#5A5A5A', '#B8974C', '#4A7C59'];

  /* ── Study-time bar chart ────────────────────────────────────────────────*/
  const barCanvas = document.getElementById('study-time-chart');
  if (barCanvas) {
    const ctx = barCanvas.getContext('2d');
    const sessions = getSessions();

    // Aggregate by weekday (last 7 days)
    const dayLabels = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
    const minutesByDay = Array(7).fill(0);
    const today = new Date();

    sessions.forEach(s => {
      const d = new Date(s.date);
      const diff = Math.floor((today - d) / 86400000);
      if (diff < 7) {
        minutesByDay[d.getDay()] += Math.round(s.duration / 60);
      }
    });

    // Fallback mock data if nothing in storage
    const data = minutesByDay.some(v => v > 0) ? minutesByDay : [40, 95, 60, 120, 80, 30, 70];
    drawBarChart(ctx, barCanvas, data, dayLabels, '#2C2C2C');
  }

  /* ── Subject-breakdown donut ─────────────────────────────────────────────*/
  const donutCanvas = document.getElementById('subject-donut-chart');
  if (donutCanvas) {
    const ctx = donutCanvas.getContext('2d');
    const sessions = getSessions();
    const bySubject = {};
    sessions.forEach(s => {
      bySubject[s.subject] = (bySubject[s.subject] || 0) + s.duration;
    });

    const labels = Object.keys(bySubject).length ? Object.keys(bySubject) : SUBJECTS;
    const values = Object.keys(bySubject).length
      ? Object.values(bySubject)
      : [45, 25, 20, 10];

    drawDonutChart(ctx, donutCanvas, values, labels, COLORS);
  }

  /* ── Productivity trend (stars bar) ─────────────────────────────────────*/
  const trendCanvas = document.getElementById('productivity-chart');
  if (trendCanvas) {
    const ctx = trendCanvas.getContext('2d');
    const weekLabels = ['Week 1','Week 2','Week 3','Week 4'];
    const data = [3.2, 4.0, 4.0, 4.5];
    drawBarChart(ctx, trendCanvas, data, weekLabels, '#B8974C', 0, 5);
  }

  /* ── Canvas drawing functions ────────────────────────────────────────────*/
  function drawBarChart(ctx, canvas, data, labels, color, yMin = 0, yMax = null) {
    const W = canvas.width  = canvas.offsetWidth;
    const H = canvas.height = canvas.offsetHeight || 200;
    ctx.clearRect(0, 0, W, H);

    const padL = 40, padR = 20, padT = 10, padB = 30;
    const chartW = W - padL - padR;
    const chartH = H - padT - padB;
    const max = yMax !== null ? yMax : Math.max(...data, 1);
    const min = yMin;
    const barW = chartW / data.length;

    // Gridlines
    ctx.strokeStyle = 'rgba(0,0,0,0.07)';
    ctx.lineWidth   = 1;
    for (let i = 0; i <= 4; i++) {
      const y = padT + chartH - (i / 4) * chartH;
      ctx.beginPath(); ctx.moveTo(padL, y); ctx.lineTo(padL + chartW, y); ctx.stroke();
    }

    // Bars
    data.forEach((val, i) => {
      const pct = (val - min) / (max - min);
      const bH  = Math.max(pct * chartH, 2);
      const x   = padL + i * barW + barW * 0.2;
      const y   = padT + chartH - bH;
      const bW  = barW * 0.6;

      ctx.fillStyle = color;
      ctx.fillRect(x, y, bW, bH);

      // Label
      ctx.fillStyle = '#888';
      ctx.font = '11px Inter, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(labels[i] || '', x + bW / 2, H - 8);
    });
  }

  function drawDonutChart(ctx, canvas, values, labels, colors) {
    const W = canvas.width  = canvas.offsetWidth;
    const H = canvas.height = canvas.offsetHeight || 200;
    ctx.clearRect(0, 0, W, H);

    const cx = W / 2, cy = H / 2;
    const outerR = Math.min(cx, cy) - 20;
    const innerR = outerR * 0.6;
    const total  = values.reduce((a, b) => a + b, 0);
    let angle    = -Math.PI / 2;

    values.forEach((val, i) => {
      const slice = (val / total) * 2 * Math.PI;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.arc(cx, cy, outerR, angle, angle + slice);
      ctx.closePath();
      ctx.fillStyle = colors[i % colors.length];
      ctx.fill();
      angle += slice;
    });

    // Donut hole
    ctx.beginPath();
    ctx.arc(cx, cy, innerR, 0, 2 * Math.PI);
    ctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue('--paper-raised').trim() || '#F7F5F0';
    ctx.fill();
  }

  /* ── Consistency ratio live calc ─────────────────────────────────────────*/
  const consistencyEl = document.getElementById('consistency-value');
  if (consistencyEl) {
    const sessions = getSessions();
    if (sessions.length) {
      const uniqueDays = new Set(sessions.map(s => s.date.split('T')[0])).size;
      const spanDays = Math.max(
        Math.ceil((Date.now() - new Date(sessions[sessions.length - 1].date)) / 86400000), 1
      );
      const ratio = Math.min(Math.round((uniqueDays / spanDays) * 100), 100);
      consistencyEl.textContent = ratio + '%';

      const bar = document.getElementById('consistency-bar');
      if (bar) bar.style.width = ratio + '%';
    }
  }
});
