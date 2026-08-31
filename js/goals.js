/**
 * Student360 — goals.js
 * Goal creation, milestone toggling, progress calculation.
 * Phase 2.5: animated progress bars, goal completion celebration, milestone UX.
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
  const milestonesArea = document.getElementById('milestones-area');
  const addMilestoneBtn = document.getElementById('add-milestone-btn');

  if (!goalsContainer) return;

  /* ── Milestone form builder ─────────────────────────────────────────────── */
  let milestoneCount = 1;

  function addMilestoneRow(value = '') {
    if (!milestonesArea) return;
    const idx = milestoneCount++;
    const row = document.createElement('div');
    row.className = 'milestone-row';
    row.innerHTML = `
      <input type="text" name="milestone_${idx}" class="form-control milestone-row-input"
        placeholder="e.g. Read chapter ${idx}" value="${value}" aria-label="Milestone ${idx}">
      <button type="button" class="milestone-remove-btn" aria-label="Remove milestone ${idx}">✕</button>
    `;
    row.querySelector('.milestone-remove-btn').addEventListener('click', () => {
      row.style.opacity = '0';
      row.style.transform = 'translateX(-8px)';
      row.style.transition = 'opacity 0.2s, transform 0.2s';
      setTimeout(() => row.remove(), 200);
    });
    milestonesArea.appendChild(row);
  }

  // Pre-populate with 2 rows
  if (milestonesArea && milestonesArea.children.length === 0) {
    addMilestoneRow();
    addMilestoneRow();
  }

  if (addMilestoneBtn) {
    addMilestoneBtn.addEventListener('click', () => addMilestoneRow());
  }

  /* ── Rendering ──────────────────────────────────────────────────────────── */
  function renderGoals() {
    const goals = getGoals();

    if (goals.length === 0) {
      goalsContainer.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-icon">🎯</div>
          <div class="empty-state-title">No goals yet</div>
          <div class="empty-state-desc">Set your first goal and break it into milestones to start tracking your progress.</div>
        </div>`;
      return;
    }

    goalsContainer.innerHTML = goals.map(goal => {
      const done  = goal.milestones.filter(m => m.done).length;
      const total = goal.milestones.length;
      const pct   = total ? Math.round((done / total) * 100) : 0;

      const milestoneRows = goal.milestones.map(m => `
        <div class="task-item" data-goal="${goal.id}" data-milestone="${m.id}">
          <input type="checkbox" class="task-checkbox milestone-toggle" ${m.done ? 'checked' : ''}
            aria-label="${m.done ? 'Unmark' : 'Mark'} milestone '${m.text}'">
          <div class="task-content">
            <div class="task-title" ${m.done ? 'style="text-decoration:line-through;color:var(--ink-faint);"' : ''}>${m.text}</div>
          </div>
        </div>
      `).join('');

      const fillColor = pct === 100 ? 'var(--green)' : 'var(--gold)';

      return `
        <div class="dashboard-panel goal-card" data-goal-id="${goal.id}" style="margin-bottom:1.5rem;">
          <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:1rem;">
            <div>
              <h2 style="font-family:var(--font-serif);font-size:1.25rem;margin-bottom:0.25rem;">${goal.title}</h2>
              <p class="text-faint" style="font-size:0.875rem;">${goal.subject} &bull; Target: ${S360.formatDate(goal.targetDate)}</p>
            </div>
            <div style="text-align:right; flex-shrink:0; margin-left:1rem;">
              <span class="tabular-nums" style="font-size:1.5rem;font-family:var(--font-serif);${pct===100?'color:var(--green);':''}">${pct}%</span>
              <span class="text-faint" style="font-size:0.875rem;display:block;">${done} of ${total} milestones</span>
            </div>
          </div>
          <div class="progress-track" style="margin-bottom:1.25rem; height:6px;">
            <div class="goal-progress-fill progress-fill" data-pct="${pct}" style="background-color:${fillColor};"></div>
          </div>
          <div>
            <h3 style="font-size:0.875rem;font-weight:600;margin-bottom:0.75rem;">Milestones</h3>
            ${milestoneRows}
          </div>
          <button class="btn btn-outline goal-delete" data-id="${goal.id}"
            style="margin-top:1rem;color:var(--red);border-color:var(--red-soft);font-size:0.75rem;"
            aria-label="Delete goal '${goal.title}'">Delete Goal</button>
        </div>`;
    }).join('');

    // Trigger progress bar animation
    requestAnimationFrame(() => {
      goalsContainer.querySelectorAll('.goal-progress-fill[data-pct]').forEach(fill => {
        requestAnimationFrame(() => {
          fill.style.width = fill.dataset.pct + '%';
        });
      });
    });

    // Milestone toggles — animate progress without full re-render
    goalsContainer.querySelectorAll('.milestone-toggle').forEach(cb => {
      cb.addEventListener('change', () => {
        const goalId = +cb.closest('[data-goal]').dataset.goal;
        const milId  = +cb.closest('[data-milestone]').dataset.milestone;
        const goals  = getGoals().map(g => {
          if (g.id !== goalId) return g;
          return { ...g, milestones: g.milestones.map(m => m.id === milId ? { ...m, done: cb.checked } : m) };
        });
        saveGoals(goals);

        // Animate the progress fill on the specific card
        const card = goalsContainer.querySelector(`[data-goal-id="${goalId}"]`);
        if (card) {
          const goal  = goals.find(g => g.id === goalId);
          const done  = goal.milestones.filter(m => m.done).length;
          const total = goal.milestones.length;
          const pct   = total ? Math.round((done / total) * 100) : 0;
          const fill  = card.querySelector('.goal-progress-fill');
          const pctEl = card.querySelector('.tabular-nums');
          const doneEl = card.querySelector('.text-faint');

          if (fill) fill.style.width = pct + '%';
          if (fill && pct === 100) fill.style.backgroundColor = 'var(--green)';
          if (pctEl) pctEl.textContent = pct + '%';
          if (doneEl) doneEl.textContent = `${done} of ${total} milestones`;

          // Strike-through the milestone text
          const titleEl = cb.closest('.task-item').querySelector('.task-title');
          if (titleEl) {
            titleEl.style.textDecoration = cb.checked ? 'line-through' : '';
            titleEl.style.color = cb.checked ? 'var(--ink-faint)' : '';
          }

          // Celebrate if 100%
          if (pct === 100) {
            card.classList.add('goal-celebrate');
            S360.toast('🎯 Goal complete! Excellent work!', 'success');
            setTimeout(() => card.classList.remove('goal-celebrate'), 2000);
          }
        }

        S360.toast(cb.checked ? 'Milestone complete! 🎯' : 'Milestone unchecked.', cb.checked ? 'success' : 'info');
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
      const titleEl   = createGoalForm.querySelector('[name="title"]');
      const subjectEl = createGoalForm.querySelector('[name="subject"]');
      const startEl   = createGoalForm.querySelector('[name="startDate"]');
      const targetEl  = createGoalForm.querySelector('[name="targetDate"]');

      if (!titleEl.value.trim()) { S360.toast('Goal title is required.', 'error'); return; }

      // Collect milestone rows
      const milestoneInputs = createGoalForm.querySelectorAll('.milestone-row-input');
      const milestones = [];
      let idx = 1;
      milestoneInputs.forEach(inp => {
        if (inp.value.trim()) {
          milestones.push({ id: idx++, text: inp.value.trim(), done: false });
        }
      });

      const goal = {
        id:         Date.now(),
        title:      titleEl.value.trim(),
        subject:    subjectEl  ? subjectEl.value   : '',
        startDate:  startEl    ? startEl.value     : S360.today(),
        targetDate: targetEl   ? targetEl.value    : '',
        milestones,
      };

      const goals = getGoals();
      goals.unshift(goal);
      saveGoals(goals);
      createGoalForm.reset();

      // Clear milestone rows and re-add 2 empty ones
      if (milestonesArea) {
        milestonesArea.innerHTML = '';
        milestoneCount = 1;
        addMilestoneRow();
        addMilestoneRow();
      }

      S360.toast('Goal created!', 'success');
      renderGoals();
    });
  }

  renderGoals();
});
