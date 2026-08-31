/**
 * Student360 — admin.js
 * Admin portal: student search/filter, student status management, announcements.
 */

document.addEventListener('DOMContentLoaded', () => {

  /* ── Students Table ────────────────────────────────────────────────────── */
  const studentsTable = document.getElementById('students-table-body');

  let STUDENTS = JSON.parse(localStorage.getItem('s360_admin_students') || 'null') || [
    { id:'stu-001', name:'Jane Doe',     email:'jane@student360.edu',     course:'B.Sc. Computer Science', score:84,  status:'Active',   lastSeen:'2026-10-24' },
    { id:'stu-002', name:'Mark Johnson', email:'mark.j@student360.edu',   course:'B.Sc. Physics',          score:62,  status:'At Risk',  lastSeen:'2026-10-22' },
    { id:'stu-003', name:'Sarah Lee',    email:'sarah.lee@student360.edu',course:'B.A. Literature',        score:null,status:'Inactive', lastSeen:'2026-10-10' },
    { id:'stu-004', name:'Alex Chen',    email:'alex.c@student360.edu',   course:'B.Sc. Computer Science', score:91,  status:'Active',   lastSeen:'2026-10-24' },
    { id:'stu-005', name:'Priya Nair',   email:'priya.n@student360.edu',  course:'B.Sc. Physics',          score:77,  status:'Active',   lastSeen:'2026-10-23' },
  ];

  function saveStudents() {
    localStorage.setItem('s360_admin_students', JSON.stringify(STUDENTS));
  }

  if (studentsTable) {
    const searchEl  = document.getElementById('student-search');
    const courseEl  = document.getElementById('student-course-filter');
    const statusEl  = document.getElementById('student-status-filter');

    function statusDot(status) {
      const map = { 'Active':'status-active', 'At Risk':'status-warning', 'Inactive':'status-inactive', 'Suspended':'status-inactive' };
      return `<span class="status-indicator ${map[status] || ''}"></span>${status}`;
    }

    function renderStudents() {
      let rows = [...STUDENTS];
      const q       = searchEl ? searchEl.value.toLowerCase() : '';
      const course  = courseEl ? courseEl.value : 'All Courses';
      const status  = statusEl ? statusEl.value : 'All Statuses';

      if (q)      rows = rows.filter(s => s.name.toLowerCase().includes(q) || s.email.toLowerCase().includes(q));
      if (course !== 'All Courses')   rows = rows.filter(s => s.course === course);
      if (status !== 'All Statuses')  rows = rows.filter(s => s.status === status);

      if (!rows.length) {
        studentsTable.innerHTML = '<tr><td colspan="5" style="padding:2rem;text-align:center;" class="text-faint">No students found.</td></tr>';
        return;
      }

      studentsTable.innerHTML = rows.map(s => `
        <tr data-id="${s.id}">
          <td>
            <div style="font-weight:500;">${s.name}</div>
            <div class="text-faint" style="font-size:0.75rem;">${s.email}</div>
          </td>
          <td>${s.course}</td>
          <td class="tabular-nums">${s.score != null ? s.score + '%' : '—'}</td>
          <td>${statusDot(s.status)}</td>
          <td style="text-align:right;">
            <a href="student-details.html?id=${s.id}" class="btn btn-outline" style="padding:0.25rem 0.5rem;font-size:0.75rem;">View</a>
            <button class="btn btn-outline suspend-btn" data-id="${s.id}" style="padding:0.25rem 0.5rem;font-size:0.75rem;color:var(--red);border-color:var(--red-soft);">
              ${s.status === 'Suspended' ? 'Unsuspend' : 'Suspend'}
            </button>
          </td>
        </tr>
      `).join('');

      // Suspend / unsuspend
      studentsTable.querySelectorAll('.suspend-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          const stu = STUDENTS.find(s => s.id === btn.dataset.id);
          if (!stu) return;
          stu.status = stu.status === 'Suspended' ? 'Active' : 'Suspended';
          saveStudents();
          S360.toast(`${stu.name} is now ${stu.status}.`, 'info');
          renderStudents();
        });
      });
    }

    if (searchEl) searchEl.addEventListener('input', renderStudents);
    if (courseEl) courseEl.addEventListener('change', renderStudents);
    if (statusEl) statusEl.addEventListener('change', renderStudents);

    renderStudents();
  }

  /* ── Announcements Management ─────────────────────────────────────────── */
  const announcementsBody = document.getElementById('announcements-table-body');
  const announcementForm  = document.getElementById('new-announcement-form');

  function getAnnouncements() {
    const defaults = [
      { id:1, title:'Upcoming System Maintenance', audience:'All Students', date:'2026-10-24', priority:'High' },
      { id:2, title:'New Resources for Calculus II', audience:'Calculus II cohort', date:'2026-10-22', priority:'Normal' },
      { id:3, title:'Welcome to the Fall Semester', audience:'All Students', date:'2026-09-01', priority:'Normal' },
    ];
    return JSON.parse(localStorage.getItem('s360_announcements') || JSON.stringify(defaults));
  }
  function saveAnnouncements(anns) {
    localStorage.setItem('s360_announcements', JSON.stringify(anns));
  }

  if (announcementsBody) {
    function renderAnnouncements() {
      const anns = getAnnouncements();
      announcementsBody.innerHTML = anns.map(a => `
        <tr>
          <td style="font-weight:500;">${a.title}</td>
          <td class="text-faint">${a.audience}</td>
          <td class="tabular-nums text-faint">${a.date}</td>
          <td><span class="status-indicator ${a.priority === 'High' ? 'status-inactive' : 'status-active'}"></span>${a.priority}</td>
          <td style="text-align:right;">
            <button class="btn btn-outline ann-delete" data-id="${a.id}" style="padding:0.25rem 0.5rem;font-size:0.75rem;color:var(--red);border-color:var(--red-soft);">Delete</button>
          </td>
        </tr>
      `).join('');

      announcementsBody.querySelectorAll('.ann-delete').forEach(btn => {
        btn.addEventListener('click', () => {
          saveAnnouncements(getAnnouncements().filter(a => a.id != btn.dataset.id));
          S360.toast('Announcement deleted.', 'info');
          renderAnnouncements();
        });
      });
    }

    renderAnnouncements();

    if (announcementForm) {
      announcementForm.addEventListener('submit', e => {
        e.preventDefault();
        const titleEl    = announcementForm.querySelector('[name="title"]');
        const audienceEl = announcementForm.querySelector('[name="audience"]');
        const priorityEl = announcementForm.querySelector('[name="priority"]');

        if (!titleEl.value.trim()) { S360.toast('Title is required.', 'error'); return; }

        const newAnn = {
          id:       Date.now(),
          title:    titleEl.value.trim(),
          audience: audienceEl ? audienceEl.value : 'All Students',
          priority: priorityEl ? priorityEl.value : 'Normal',
          date:     S360.today(),
        };

        const anns = getAnnouncements();
        anns.unshift(newAnn);
        saveAnnouncements(anns);
        announcementForm.reset();
        S360.toast('Announcement published!', 'success');
        renderAnnouncements();
      });
    }
  }

  /* ── AI Management toggles ───────────────────────────────────────────────*/
  const saveTogglesBtn = document.getElementById('save-toggles-btn');
  if (saveTogglesBtn) {
    saveTogglesBtn.addEventListener('click', () => {
      S360.toast('AI feature configuration saved.', 'success');
    });
  }

  const saveSystemPromptBtn = document.getElementById('save-system-prompt-btn');
  if (saveSystemPromptBtn) {
    saveSystemPromptBtn.addEventListener('click', () => {
      S360.toast('System instructions updated.', 'success');
    });
  }

  /* ── Growth Score weights validator ─────────────────────────────────────*/
  const weightsForm = document.getElementById('growth-weights-form');
  const weightTotal = document.getElementById('weight-total');
  if (weightsForm && weightTotal) {
    function updateTotal() {
      const inputs = weightsForm.querySelectorAll('input[type="number"]');
      let sum = 0;
      inputs.forEach(inp => { sum += parseFloat(inp.value) || 0; });
      weightTotal.textContent = sum + '%';
      weightTotal.style.color = sum === 100 ? 'var(--green)' : 'var(--red)';
    }
    weightsForm.querySelectorAll('input[type="number"]').forEach(inp => inp.addEventListener('input', updateTotal));

    weightsForm.addEventListener('submit', e => {
      e.preventDefault();
      const inputs = weightsForm.querySelectorAll('input[type="number"]');
      let sum = 0;
      inputs.forEach(inp => { sum += parseFloat(inp.value) || 0; });
      if (sum !== 100) { S360.toast('Weights must add up to exactly 100%.', 'error'); return; }
      S360.toast('Growth Score weights saved!', 'success');
    });
  }
});
