/**
 * Student360 — goals.js
 * Goal creation, milestone toggling, progress calculation.
 */

document.addEventListener('DOMContentLoaded', () => {

  /* ── Data layer ─────────────────────────────────────────────────────────── */
  function getGoals() {
    const defaults = [
      {
        id: 1, title: 'Score 90%+ on Calculus Midterm', subject: 'Calculus II',
        startDate: '2026-10-01', targetDate: '2026-11-15',
        milestones: [
          { id: 1, text: 'Review Chapters 1-3', done: true },
          { id: 2, text: 'Complete past year paper 1', done: true },
          { id: 3, text: 'Complete past year paper 2', done: false },
        ],
      },
      {
        id: 2, title: 'Finish CS Final Project', subject: 'Computer Science',
        startDate: '2026-10-01', targetDate: '2026-12-01',
        milestones: [
          { id: 1, text: 'Database Schema Design', done: true },
          { id: 2, text: 'API Implementation', done: false },
          { id: 3, text: 'Frontend Integration', done: false },
          { id: 4, text: 'Deployment', done: false },
        ],
      },
    ];
    return JSON.parse(localStorage.getItem('s360_goals') || JSON.stringify(defaults));
  }
  function saveGoals(goals) {
    localStorage.setItem('s360_goals', JSON.stringify(goals));
  }

  /* ── DOM refs ─────────────────────────────────────────────────────────────*/
  const goalsContainer = document.getElementById('goals-container');
  const createGoalForm = document.getElementById('create-goal-form');

  if (!goalsContainer) return;

  /* ── Rendering ──────────────────────────────────────────────────────────── */
  function renderGoals() {
    const goals = getGoals();

    goalsContainer.innerHTML = goals.map(goal => {
      const done  = goal.milestones.filter(m => m.done).length;
      const total = goal.milestones.length;
      const pct   = total ? Math.round((done / total) * 100) : 0;

      const milestoneRows = goal.milestones.map(m => `
        <div class="task-item" data-goal="${goal.id}" data-milestone="${m.id}">
          <input type="checkbox" class="task-checkbox milestone-toggle" ${m.done ? 'checked' : ''}>
          <div class="task-content">
            <div class="task-title" ${m.done ? 'style="text-decoration:line-through;"' : ''}>${m.text}</div>
          </div>
        </div>
      `).join('');

      return `
        <div class="dashboard-panel goal-card" data-goal-id="${goal.id}" style="margin-bottom:1.5rem;">
          <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:1.5rem;">
            <div>
              <h2 style="font-family:var(--font-serif);font-size:1.25rem;margin-bottom:0.25rem;">${goal.title}</h2>
              <p class="text-faint" style="font-size:0.875rem;">${goal.subject} &bull; Target: ${S360.formatDate(goal.targetDate)}</p>
            </div>
            <div style="text-align:right;">
              <span class="tabular-nums" style="font-size:1.5rem;font-family:var(--font-serif);">${pct}%</span>
              <span class="text-faint" style="font-size:0.875rem;display:block;">${done} of ${total} milestones</span>
            </div>
          </div>
          <div class="progress-track" style="margin-bottom:1.5rem;">
            <div class="progress-fill" style="width:${pct}%;${pct===100?'background-color:var(--green);':''}"></div>
          </div>
          <div>
            <h3 style="font-size:0.875rem;font-weight:600;margin-bottom:0.75rem;">Milestones</h3>
            ${milestoneRows}
          </div>
          <button class="btn btn-outline goal-delete" data-id="${goal.id}" style="margin-top:1rem;color:var(--red);border-color:var(--red-soft);font-size:0.75rem;">Delete Goal</button>
        </div>`;
    }).join('');

    // Milestone toggles
    goalsContainer.querySelectorAll('.milestone-toggle').forEach(cb => {
      cb.addEventListener('change', () => {
        const goalId = +cb.closest('[data-goal]').dataset.goal;
        const milId  = +cb.closest('[data-milestone]').dataset.milestone;
        const goals  = getGoals().map(g => {
          if (g.id !== goalId) return g;
          return { ...g, milestones: g.milestones.map(m => m.id === milId ? { ...m, done: cb.checked } : m) };
        });
        saveGoals(goals);
        S360.toast(cb.checked ? 'Milestone complete! 🎯' : 'Milestone unchecked.', cb.checked ? 'success' : 'info');
        renderGoals();
      });
    });

    // Delete goal
    goalsContainer.querySelectorAll('.goal-delete').forEach(btn => {
      btn.addEventListener('click', () => {
        saveGoals(getGoals().filter(g => g.id !== +btn.dataset.id));
        S360.toast('Goal deleted.', 'info');
        renderGoals();
      });
    });
  }

  /* ── Create goal form ───────────────────────────────────────────────────── */
  if (createGoalForm) {
    createGoalForm.addEventListener('submit', e => {
      e.preventDefault();
      const titleEl     = createGoalForm.querySelector('[name="title"]');
      const subjectEl   = createGoalForm.querySelector('[name="subject"]');
      const startEl     = createGoalForm.querySelector('[name="startDate"]');
      const targetEl    = createGoalForm.querySelector('[name="targetDate"]');
      const msTextarea  = createGoalForm.querySelector('[name="milestones"]');

      if (!titleEl.value.trim()) { S360.toast('Goal title is required.', 'error'); return; }

      const milestoneLines = (msTextarea ? msTextarea.value : '').split('\n').filter(l => l.trim());
      const milestones = milestoneLines.map((text, i) => ({ id: i + 1, text: text.trim(), done: false }));

      const goal = {
        id:          Date.now(),
        title:       titleEl.value.trim(),
        subject:     subjectEl  ? subjectEl.value  : '',
        startDate:   startEl    ? startEl.value    : S360.today(),
        targetDate:  targetEl   ? targetEl.value   : '',
        milestones,
      };

      const goals = getGoals();
      goals.unshift(goal);
      saveGoals(goals);
      createGoalForm.reset();
      S360.toast('Goal created!', 'success');
      renderGoals();
    });
  }

  renderGoals();
});
