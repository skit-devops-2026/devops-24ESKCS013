/**
 * Student360 — tasks.js
 * Task creation, completion toggling, filtering, and delete.
 */

document.addEventListener('DOMContentLoaded', () => {

  /* ── Data layer ─────────────────────────────────────────────────────────── */
  function getTasks() {
    const defaults = [
      { id:1, title:'Submit Physics Lab Report',  subject:'Physics 101',   priority:'High',   dueDate:'2026-10-23', estMins:120, done:false },
      { id:2, title:'Read Physics Chapter 4',      subject:'Physics 101',   priority:'Medium', dueDate:'2026-10-24', estMins:45,  done:false },
      { id:3, title:'Complete CS Assignment 2',    subject:'Computer Sci',  priority:'High',   dueDate:'2026-10-24', estMins:90,  done:false },
      { id:4, title:'Calculus Practice Set',       subject:'Calculus II',   priority:'Low',    dueDate:'2026-10-24', estMins:60,  done:true  },
      { id:5, title:'Prepare for Calculus Midterm',subject:'Calculus II',   priority:'High',   dueDate:'2026-10-28', estMins:240, done:false },
    ];
    return JSON.parse(localStorage.getItem('s360_tasks') || JSON.stringify(defaults));
  }
  function saveTasks(tasks) {
    localStorage.setItem('s360_tasks', JSON.stringify(tasks));
  }

  /* ── DOM refs ─────────────────────────────────────────────────────────────*/
  const taskListEl   = document.getElementById('task-list');
  const newTaskForm  = document.getElementById('new-task-form');
  const filterStatus = document.getElementById('filter-status');
  const filterSubj   = document.getElementById('filter-subject');
  const searchInput  = document.getElementById('task-search');

  if (!taskListEl) return;

  /* ── Rendering ──────────────────────────────────────────────────────────── */
  function isOverdue(task) {
    return !task.done && task.dueDate && task.dueDate < S360.today();
  }
  function isToday(task) {
    return !task.done && task.dueDate === S360.today();
  }

  function renderTasks() {
    let tasks = getTasks();

    // Filters
    const statusFilter = filterStatus ? filterStatus.value : 'All Tasks';
    const subjFilter   = filterSubj   ? filterSubj.value   : 'All Subjects';
    const q            = searchInput  ? searchInput.value.toLowerCase() : '';

    if (statusFilter === 'Pending')   tasks = tasks.filter(t => !t.done);
    if (statusFilter === 'Completed') tasks = tasks.filter(t => t.done);
    if (statusFilter === 'Overdue')   tasks = tasks.filter(isOverdue);
    if (subjFilter !== 'All Subjects') tasks = tasks.filter(t => t.subject === subjFilter);
    if (q) tasks = tasks.filter(t => t.title.toLowerCase().includes(q) || t.subject.toLowerCase().includes(q));

    const overdue  = tasks.filter(isOverdue);
    const today    = tasks.filter(isToday);
    const upcoming = tasks.filter(t => !t.done && !isOverdue(t) && !isToday(t));
    const done     = tasks.filter(t => t.done);

    function taskRow(t) {
      const style = t.done ? 'style="text-decoration:line-through;color:var(--ink-faint);"' : '';
      return `
        <div class="task-item" data-id="${t.id}">
          <input type="checkbox" class="task-checkbox task-toggle" ${t.done ? 'checked' : ''}>
          <div class="task-content">
            <div class="task-title" ${style}>${t.title}</div>
            <div class="task-meta" ${style}>${t.subject} &bull; ${t.priority} Priority &bull; ${t.dueDate ? S360.formatDate(t.dueDate) : 'No due date'} &bull; ${S360.formatMinutes(t.estMins)} est.</div>
          </div>
          <button class="btn btn-outline task-delete" data-id="${t.id}" style="padding:0.2rem 0.5rem;font-size:0.75rem;color:var(--red);border-color:var(--red-soft);">✕</button>
        </div>`;
    }

    function section(label, tasks, borderColor) {
      if (!tasks.length) return '';
      return `
        <h2 style="font-size:1rem;margin-bottom:1rem;margin-top:2rem;${label==='Overdue'?'color:var(--red)':''}">${label}</h2>
        <div class="dashboard-panel" style="border-left:4px solid ${borderColor};">
          ${tasks.map(taskRow).join('')}
        </div>`;
    }

    taskListEl.innerHTML =
      section('Overdue',  overdue,  'var(--red)')   +
      section('Today',    today,    'var(--gold)')   +
      section('Upcoming', upcoming, 'var(--ink-faint)') +
      section('Done',     done,     'var(--green)');

    // Attach events
    taskListEl.querySelectorAll('.task-toggle').forEach(cb => {
      cb.addEventListener('change', () => {
        const id = +cb.closest('[data-id]').dataset.id;
        const tasks = getTasks().map(t => t.id === id ? { ...t, done: cb.checked } : t);
        saveTasks(tasks);
        S360.toast(cb.checked ? 'Task marked complete!' : 'Task reopened.', cb.checked ? 'success' : 'info');
        renderTasks();
      });
    });

    taskListEl.querySelectorAll('.task-delete').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = +btn.dataset.id;
        saveTasks(getTasks().filter(t => t.id !== id));
        S360.toast('Task deleted.', 'info');
        renderTasks();
      });
    });
  }

  /* ── New task form ──────────────────────────────────────────────────────── */
  if (newTaskForm) {
    newTaskForm.addEventListener('submit', e => {
      e.preventDefault();
      const titleEl   = newTaskForm.querySelector('[name="title"]');
      const subjEl    = newTaskForm.querySelector('[name="subject"]');
      const dueEl     = newTaskForm.querySelector('[name="dueDate"]');
      const prioEl    = newTaskForm.querySelector('[name="priority"]');
      const estEl     = newTaskForm.querySelector('[name="estMins"]');

      if (!titleEl.value.trim()) { S360.toast('Task title is required.', 'error'); return; }

      const task = {
        id:      Date.now(),
        title:   titleEl.value.trim(),
        subject: subjEl  ? subjEl.value  : '',
        dueDate: dueEl   ? dueEl.value   : '',
        priority:prioEl  ? prioEl.value  : 'Medium',
        estMins: estEl   ? (parseInt(estEl.value) || 30) : 30,
        done:    false,
      };

      const tasks = getTasks();
      tasks.unshift(task);
      saveTasks(tasks);
      newTaskForm.reset();
      S360.toast('Task added!', 'success');
      renderTasks();
    });
  }

  /* ── Filters / search ───────────────────────────────────────────────────── */
  [filterStatus, filterSubj, searchInput].forEach(el => {
    if (el) el.addEventListener('change', renderTasks);
  });
  if (searchInput) searchInput.addEventListener('input', renderTasks);

  renderTasks();
});
