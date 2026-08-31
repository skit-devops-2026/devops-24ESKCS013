/**
 * Student360 — admin.js
 * Enhanced admin interactions: collapsible sidebar, mobile drawer, stat count-up,
 * sortable table columns, status filter chips, empty states, in-page confirmation modals,
 * AI dirty state indicators, subject tree toggles, and Growth Score weights validator.
 */

document.addEventListener('DOMContentLoaded', () => {

  /* ── 1. Admin Sidebar (Collapse & Mobile Drawer) ────────────────────────── */
  const sidebar = document.querySelector('.admin-sidebar');
  const collapseToggle = document.getElementById('sidebar-collapse-toggle');
  const mobileToggle = document.getElementById('admin-menu-toggle');
  const backdrop = document.getElementById('sidebar-backdrop');

  // Restore collapsed state
  const isCollapsed = localStorage.getItem('s360_admin_sidebar_collapsed') === 'true';
  if (sidebar && isCollapsed && window.innerWidth > 768) {
    sidebar.classList.add('collapsed');
  }

  if (collapseToggle && sidebar) {
    collapseToggle.addEventListener('click', () => {
      sidebar.classList.toggle('collapsed');
      localStorage.setItem('s360_admin_sidebar_collapsed', sidebar.classList.contains('collapsed'));
    });
  }

  if (mobileToggle && sidebar && backdrop) {
    mobileToggle.addEventListener('click', () => {
      sidebar.classList.add('mobile-open');
      backdrop.classList.add('active');
    });

    backdrop.addEventListener('click', () => {
      sidebar.classList.remove('mobile-open');
      backdrop.classList.remove('active');
    });
  }

  // Active route auto-highlighting
  const currentPage = window.location.pathname.split('/').pop() || 'dashboard.html';
  document.querySelectorAll('.admin-sidebar .sidebar-link').forEach(link => {
    const href = link.getAttribute('href');
    if (href === currentPage || (currentPage === 'student-details.html' && href === 'students.html')) {
      link.classList.add('active');
    } else {
      link.classList.remove('active');
    }
  });

  /* ── 2. In-Page Confirmation Modal Helper ────────────────────────────────── */
  function showConfirmModal({ title, message, confirmText = 'Confirm', confirmStyle = 'danger', onConfirm }) {
    let modalEl = document.getElementById('admin-confirm-modal');
    if (!modalEl) {
      modalEl = document.createElement('div');
      modalEl.id = 'admin-confirm-modal';
      modalEl.className = 'confirm-modal-backdrop';
      modalEl.innerHTML = `
        <div class="confirm-modal-box" role="dialog" aria-modal="true" aria-labelledby="confirm-modal-title">
          <h3 id="confirm-modal-title" class="confirm-modal-title"></h3>
          <p id="confirm-modal-desc" class="confirm-modal-desc"></p>
          <div class="confirm-modal-actions">
            <button type="button" class="btn btn-outline" id="confirm-modal-cancel">Cancel</button>
            <button type="button" class="btn btn-primary" id="confirm-modal-proceed"></button>
          </div>
        </div>
      `;
      document.body.appendChild(modalEl);
    }

    const titleEl = modalEl.querySelector('#confirm-modal-title');
    const descEl = modalEl.querySelector('#confirm-modal-desc');
    const cancelBtn = modalEl.querySelector('#confirm-modal-cancel');
    const proceedBtn = modalEl.querySelector('#confirm-modal-proceed');

    titleEl.textContent = title;
    descEl.textContent = message;
    proceedBtn.textContent = confirmText;

    if (confirmStyle === 'danger') {
      proceedBtn.style.backgroundColor = 'var(--red)';
      proceedBtn.style.borderColor = 'var(--red)';
      proceedBtn.style.color = '#ffffff';
    } else {
      proceedBtn.style.backgroundColor = 'var(--ink)';
      proceedBtn.style.borderColor = 'var(--ink)';
      proceedBtn.style.color = '#ffffff';
    }

    modalEl.classList.add('active');

    const closeModal = () => {
      modalEl.classList.remove('active');
      cancelBtn.removeEventListener('click', closeModal);
      proceedBtn.removeEventListener('click', confirmHandler);
    };

    const confirmHandler = () => {
      closeModal();
      if (typeof onConfirm === 'function') onConfirm();
    };

    cancelBtn.addEventListener('click', closeModal);
    proceedBtn.addEventListener('click', confirmHandler);
    modalEl.addEventListener('click', e => {
      if (e.target === modalEl) closeModal();
    });
  }

  /* ── 3. Number Count-Up Animation (Dashboard Stats) ──────────────────────── */
  const countUpElements = document.querySelectorAll('[data-count]');
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  if (countUpElements.length > 0) {
    countUpElements.forEach(el => {
      const target = parseFloat(el.getAttribute('data-count'));
      const prefix = el.getAttribute('data-prefix') || '';
      const suffix = el.getAttribute('data-suffix') || '';
      const decimals = parseInt(el.getAttribute('data-decimals') || '0', 10);
      const duration = 1000; // ms

      if (prefersReducedMotion || isNaN(target)) {
        el.textContent = `${prefix}${decimals > 0 ? target.toFixed(decimals) : target.toLocaleString()}${suffix}`;
        return;
      }

      let startTime = null;
      const animateCount = timestamp => {
        if (!startTime) startTime = timestamp;
        const progress = Math.min((timestamp - startTime) / duration, 1);
        // easeOutQuart
        const ease = 1 - Math.pow(1 - progress, 4);
        const current = target * ease;

        el.textContent = `${prefix}${decimals > 0 ? current.toFixed(decimals) : Math.floor(current).toLocaleString()}${suffix}`;

        if (progress < 1) {
          requestAnimationFrame(animateCount);
        } else {
          el.textContent = `${prefix}${decimals > 0 ? target.toFixed(decimals) : target.toLocaleString()}${suffix}`;
        }
      };
      requestAnimationFrame(animateCount);
    });
  }

  /* ── 4. Expandable "Attention Required" Accordions ────────────────────────── */
  document.querySelectorAll('.attention-item-header').forEach(header => {
    header.addEventListener('click', () => {
      const details = header.nextElementSibling;
      if (details && details.classList.contains('attention-details')) {
        details.classList.toggle('is-open');
      }
    });
  });

  /* ── 5. Students Table (Sorting & Filter Chips) ──────────────────────────── */
  const studentsTable = document.getElementById('students-table-body');
  if (studentsTable) {
    let STUDENTS = JSON.parse(localStorage.getItem('s360_admin_students') || 'null') || [
      { id:'stu-001', name:'Jane Doe',     email:'jane@student360.edu',     course:'B.Sc. Computer Science', score:84,  status:'Active',   lastSeen:'2026-10-24' },
      { id:'stu-002', name:'Mark Johnson', email:'mark.j@student360.edu',   course:'B.Sc. Physics',          score:62,  status:'At Risk',  lastSeen:'2026-10-22' },
      { id:'stu-003', name:'Sarah Lee',    email:'sarah.lee@student360.edu',course:'B.A. Literature',        score:null,status:'Inactive', lastSeen:'2026-10-10' },
      { id:'stu-004', name:'Alex Chen',    email:'alex.c@student360.edu',   course:'B.Sc. Computer Science', score:91,  status:'Active',   lastSeen:'2026-10-24' },
      { id:'stu-005', name:'Priya Nair',   email:'priya.n@student360.edu',  course:'B.Sc. Physics',          score:77,  status:'Active',   lastSeen:'2026-10-23' },
    ];

    const saveStudents = () => localStorage.setItem('s360_admin_students', JSON.stringify(STUDENTS));

    const searchEl = document.getElementById('student-search');
    const courseEl = document.getElementById('student-course-filter');
    const filterChips = document.querySelectorAll('.status-chips .filter-chip');

    let currentStatusFilter = 'All';
    let sortColumn = 'name';
    let sortAsc = true;

    function statusDot(status) {
      const map = {
        'Active': 'status-active',
        'At Risk': 'status-warning',
        'Inactive': 'status-inactive',
        'Suspended': 'status-danger'
      };
      return `<span class="status-indicator ${map[status] || ''}"></span>${status}`;
    }

    function renderStudents() {
      let rows = [...STUDENTS];
      const q = searchEl ? searchEl.value.toLowerCase().trim() : '';
      const course = courseEl ? courseEl.value : 'All Courses';

      if (q) rows = rows.filter(s => s.name.toLowerCase().includes(q) || s.email.toLowerCase().includes(q));
      if (course !== 'All Courses') rows = rows.filter(s => s.course === course);
      if (currentStatusFilter !== 'All') rows = rows.filter(s => s.status === currentStatusFilter);

      // Sorting
      rows.sort((a, b) => {
        let valA = a[sortColumn];
        let valB = b[sortColumn];

        if (sortColumn === 'score') {
          valA = valA == null ? -1 : valA;
          valB = valB == null ? -1 : valB;
          return sortAsc ? valA - valB : valB - valA;
        }

        valA = (valA || '').toString().toLowerCase();
        valB = (valB || '').toString().toLowerCase();
        if (valA < valB) return sortAsc ? -1 : 1;
        if (valA > valB) return sortAsc ? 1 : -1;
        return 0;
      });

      if (!rows.length) {
        studentsTable.innerHTML = `
          <tr>
            <td colspan="5">
              <div class="admin-empty-state">
                <svg class="empty-state-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
                <div class="empty-state-title">No students found</div>
                <div class="empty-state-desc">Try adjusting your filters or search keywords.</div>
              </div>
            </td>
          </tr>`;
        return;
      }

      studentsTable.innerHTML = rows.map(s => `
        <tr data-id="${s.id}">
          <td>
            <div style="font-weight:500;">${s.name}</div>
            <div class="text-faint" style="font-size:0.75rem;">${s.email}</div>
          </td>
          <td>${s.course}</td>
          <td class="tabular-nums font-semibold">${s.score != null ? s.score + '%' : '—'}</td>
          <td>${statusDot(s.status)}</td>
          <td style="text-align:right;">
            <a href="student-details.html?id=${s.id}" class="btn btn-outline" style="padding:0.25rem 0.6rem;font-size:0.75rem;">View</a>
            <button class="btn btn-outline suspend-btn" data-id="${s.id}" style="padding:0.25rem 0.6rem;font-size:0.75rem;color:${s.status === 'Suspended' ? 'var(--green)' : 'var(--red)'};border-color:${s.status === 'Suspended' ? 'var(--green)' : 'var(--red-soft)'};">
              ${s.status === 'Suspended' ? 'Unsuspend' : 'Suspend'}
            </button>
          </td>
        </tr>
      `).join('');

      // Suspend / Unsuspend with confirm dialog
      studentsTable.querySelectorAll('.suspend-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          const stu = STUDENTS.find(s => s.id === btn.dataset.id);
          if (!stu) return;

          const isSuspended = stu.status === 'Suspended';
          const actionText = isSuspended ? 'Unsuspend' : 'Suspend';

          showConfirmModal({
            title: `${actionText} Student Account`,
            message: isSuspended
              ? `Are you sure you want to restore access for ${stu.name}? They will be able to log in immediately.`
              : `Are you sure you want to suspend ${stu.name}? Their portal access will be temporarily locked.`,
            confirmText: `${actionText} Account`,
            confirmStyle: isSuspended ? 'primary' : 'danger',
            onConfirm: () => {
              stu.status = isSuspended ? 'Active' : 'Suspended';
              saveStudents();
              S360.toast(`${stu.name} is now ${stu.status}.`, 'info');
              renderStudents();
            }
          });
        });
      });
    }

    // Filter chip clicks
    filterChips.forEach(chip => {
      chip.addEventListener('click', () => {
        filterChips.forEach(c => c.classList.remove('active'));
        chip.classList.add('active');
        currentStatusFilter = chip.getAttribute('data-status') || 'All';
        renderStudents();
      });
    });

    if (searchEl) searchEl.addEventListener('input', renderStudents);
    if (courseEl) courseEl.addEventListener('change', renderStudents);

    // Sort column headers
    document.querySelectorAll('.admin-table th.sortable').forEach(th => {
      th.addEventListener('click', () => {
        const col = th.getAttribute('data-col');
        if (sortColumn === col) {
          sortAsc = !sortAsc;
        } else {
          sortColumn = col;
          sortAsc = true;
        }

        document.querySelectorAll('.admin-table th.sortable').forEach(header => {
          header.classList.remove('sort-asc', 'sort-desc');
        });

        th.classList.add(sortAsc ? 'sort-asc' : 'sort-desc');
        renderStudents();
      });
    });

    renderStudents();
  }

  /* ── 6. Announcements Management ─────────────────────────────────────────── */
  const announcementsBody = document.getElementById('announcements-table-body');
  const announcementForm = document.getElementById('new-announcement-form');

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

      if (!anns.length) {
        announcementsBody.innerHTML = `
          <tr>
            <td colspan="5">
              <div class="admin-empty-state">
                <svg class="empty-state-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                </svg>
                <div class="empty-state-title">No announcements published</div>
                <div class="empty-state-desc">Use the form to broadcast an update to your student cohorts.</div>
              </div>
            </td>
          </tr>`;
        return;
      }

      announcementsBody.innerHTML = anns.map(a => {
        const pClass = a.priority.toLowerCase();
        return `
          <tr>
            <td style="font-weight:500;">${a.title}</td>
            <td class="text-faint">${a.audience}</td>
            <td class="tabular-nums text-faint">${a.date}</td>
            <td><span class="badge-priority ${pClass}">${a.priority}</span></td>
            <td style="text-align:right;">
              <button class="btn btn-outline ann-delete" data-id="${a.id}" style="padding:0.25rem 0.6rem;font-size:0.75rem;color:var(--red);border-color:var(--red-soft);">Delete</button>
            </td>
          </tr>`;
      }).join('');

      announcementsBody.querySelectorAll('.ann-delete').forEach(btn => {
        btn.addEventListener('click', () => {
          const id = btn.dataset.id;
          const ann = getAnnouncements().find(a => a.id == id);

          showConfirmModal({
            title: 'Delete Announcement',
            message: `Are you sure you want to delete "${ann ? ann.title : 'this announcement'}"? This action cannot be undone.`,
            confirmText: 'Delete Announcement',
            confirmStyle: 'danger',
            onConfirm: () => {
              saveAnnouncements(getAnnouncements().filter(a => a.id != id));
              S360.toast('Announcement removed.', 'info');
              renderAnnouncements();
            }
          });
        });
      });
    }

    renderAnnouncements();

    if (announcementForm) {
      announcementForm.addEventListener('submit', e => {
        e.preventDefault();
        const titleEl = announcementForm.querySelector('[name="title"]');
        const audienceEl = announcementForm.querySelector('[name="audience"]');
        const priorityEl = announcementForm.querySelector('[name="priority"]');

        if (!titleEl || !titleEl.value.trim()) {
          S360.toast('Please provide a title.', 'error');
          return;
        }

        const newAnn = {
          id: Date.now(),
          title: titleEl.value.trim(),
          audience: audienceEl ? audienceEl.value : 'All Students',
          priority: priorityEl ? priorityEl.value : 'Normal',
          date: S360.today(),
        };

        const anns = getAnnouncements();
        anns.unshift(newAnn);
        saveAnnouncements(anns);
        announcementForm.reset();
        S360.toast('Announcement successfully broadcasted!', 'success');
        renderAnnouncements();
      });
    }
  }

  /* ── 7. Resources Management ─────────────────────────────────────────────── */
  const resourcesBody = document.getElementById('resources-table-body');
  const resourceForm = document.getElementById('new-resource-form');

  function getResources() {
    const defaults = [
      { id:1, title:'Calculus Midterm Formula Sheet', type:'PDF Document', subject:'Calculus II', status:'Published' },
      { id:2, title:'Kinematics Lecture Recording', type:'Video', subject:'Physics 101', status:'Published' },
      { id:3, title:'Advanced Data Structures Notes', type:'External Link', subject:'Computer Science', status:'Draft' },
    ];
    return JSON.parse(localStorage.getItem('s360_admin_resources') || JSON.stringify(defaults));
  }
  function saveResources(res) {
    localStorage.setItem('s360_admin_resources', JSON.stringify(res));
  }

  if (resourcesBody) {
    function renderResources() {
      const resList = getResources();

      if (!resList.length) {
        resourcesBody.innerHTML = `
          <tr>
            <td colspan="5">
              <div class="admin-empty-state">
                <svg class="empty-state-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
                <div class="empty-state-title">No resources available</div>
                <div class="empty-state-desc">Upload course files or external links to share with enrolled students.</div>
              </div>
            </td>
          </tr>`;
        return;
      }

      resourcesBody.innerHTML = resList.map(r => `
        <tr>
          <td style="font-weight:500;">${r.title}</td>
          <td class="text-faint">${r.type}</td>
          <td>${r.subject}</td>
          <td><span class="status-indicator ${r.status === 'Published' ? 'status-active' : 'status-inactive'}"></span>${r.status}</td>
          <td style="text-align:right;">
            <button class="btn btn-outline res-toggle-status" data-id="${r.id}" style="padding:0.25rem 0.5rem;font-size:0.75rem;">${r.status === 'Published' ? 'Unpublish' : 'Publish'}</button>
            <button class="btn btn-outline res-delete" data-id="${r.id}" style="padding:0.25rem 0.5rem;font-size:0.75rem;color:var(--red);border-color:var(--red-soft);">Delete</button>
          </td>
        </tr>
      `).join('');

      resourcesBody.querySelectorAll('.res-toggle-status').forEach(btn => {
        btn.addEventListener('click', () => {
          const item = getResources().find(r => r.id == btn.dataset.id);
          if (!item) return;
          item.status = item.status === 'Published' ? 'Draft' : 'Published';
          saveResources(getResources().map(r => r.id === item.id ? item : r));
          S360.toast(`Resource status set to ${item.status}.`, 'info');
          renderResources();
        });
      });

      resourcesBody.querySelectorAll('.res-delete').forEach(btn => {
        btn.addEventListener('click', () => {
          const item = getResources().find(r => r.id == btn.dataset.id);
          showConfirmModal({
            title: 'Delete Resource',
            message: `Are you sure you want to remove "${item ? item.title : 'this resource'}"?`,
            confirmText: 'Delete Resource',
            confirmStyle: 'danger',
            onConfirm: () => {
              saveResources(getResources().filter(r => r.id != btn.dataset.id));
              S360.toast('Resource deleted.', 'info');
              renderResources();
            }
          });
        });
      });
    }

    renderResources();

    if (resourceForm) {
      resourceForm.addEventListener('submit', e => {
        e.preventDefault();
        const titleEl = resourceForm.querySelector('[name="title"]');
        const typeEl = resourceForm.querySelector('[name="type"]');
        const subjectEl = resourceForm.querySelector('[name="subject"]');
        const submitter = e.submitter;
        const isDraft = submitter && submitter.getAttribute('data-status') === 'Draft';

        if (!titleEl || !titleEl.value.trim()) {
          S360.toast('Resource title is required.', 'error');
          return;
        }

        const newRes = {
          id: Date.now(),
          title: titleEl.value.trim(),
          type: typeEl ? typeEl.value : 'PDF Document',
          subject: subjectEl ? subjectEl.value : 'Calculus II',
          status: isDraft ? 'Draft' : 'Published'
        };

        const resList = getResources();
        resList.unshift(newRes);
        saveResources(resList);
        resourceForm.reset();
        S360.toast(`Resource saved as ${newRes.status}!`, 'success');
        renderResources();
      });
    }
  }

  /* ── 8. AI Management (Character Count & Dirty Indicator) ────────────────── */
  const promptTextarea = document.getElementById('ai-system-prompt');
  const charCounter = document.getElementById('ai-char-counter');
  const unsavedBanner = document.getElementById('ai-unsaved-banner');
  const savePromptBtn = document.getElementById('save-system-prompt-btn');
  const saveTogglesBtn = document.getElementById('save-toggles-btn');

  let isPromptDirty = false;

  if (promptTextarea && charCounter) {
    const updateCount = () => {
      const len = promptTextarea.value.length;
      charCounter.textContent = `${len.toLocaleString()} characters`;
    };
    updateCount();

    promptTextarea.addEventListener('input', () => {
      updateCount();
      isPromptDirty = true;
      if (unsavedBanner) unsavedBanner.classList.add('visible');
    });
  }

  document.querySelectorAll('.ai-feature-toggle').forEach(input => {
    input.addEventListener('change', () => {
      if (unsavedBanner) unsavedBanner.classList.add('visible');
    });
  });

  if (savePromptBtn) {
    savePromptBtn.addEventListener('click', () => {
      isPromptDirty = false;
      if (unsavedBanner) unsavedBanner.classList.remove('visible');
      S360.toast('System prompt instructions saved successfully!', 'success');
    });
  }

  if (saveTogglesBtn) {
    saveTogglesBtn.addEventListener('click', () => {
      if (unsavedBanner) unsavedBanner.classList.remove('visible');
      S360.toast('AI feature capabilities updated!', 'success');
    });
  }

  /* ── 9. Subjects Tree View (Expand/Collapse) ────────────────────────────── */
  document.querySelectorAll('.tree-subject').forEach(header => {
    header.addEventListener('click', e => {
      // Don't collapse if clicking buttons inside tree-actions
      if (e.target.closest('.tree-actions')) return;
      const node = header.closest('.tree-node');
      if (node) {
        node.classList.toggle('is-collapsed');
      }
    });
  });

  /* ── 10. Growth Score Weights Validator (Settings) ──────────────────────── */
  const weightsForm = document.getElementById('growth-weights-form');
  const weightBadge = document.getElementById('weight-total-badge');
  const weightFeedback = document.getElementById('weight-feedback-text');

  if (weightsForm) {
    const weightInputs = weightsForm.querySelectorAll('input[type="number"]');

    function calculateTotal() {
      let sum = 0;
      weightInputs.forEach(inp => {
        sum += parseFloat(inp.value) || 0;
      });

      if (weightBadge) {
        weightBadge.textContent = `${sum}%`;
        if (sum === 100) {
          weightBadge.className = 'weight-badge is-valid';
          if (weightFeedback) weightFeedback.textContent = 'Balanced (Exactly 100%)';
        } else {
          weightBadge.className = 'weight-badge is-invalid';
          const diff = 100 - sum;
          if (weightFeedback) {
            weightFeedback.textContent = diff > 0 ? `${diff}% remaining` : `${Math.abs(diff)}% over budget`;
          }
        }
      }
      return sum;
    }

    weightInputs.forEach(inp => {
      inp.addEventListener('input', calculateTotal);
    });
    calculateTotal();

    weightsForm.addEventListener('submit', e => {
      e.preventDefault();
      const sum = calculateTotal();
      if (sum !== 100) {
        S360.toast(`Weights must total 100% (currently ${sum}%).`, 'error');
        return;
      }
      S360.toast('Growth Score weights updated successfully!', 'success');
    });
  }
});
