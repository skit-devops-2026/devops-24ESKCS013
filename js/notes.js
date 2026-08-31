/**
 * Student360 — notes.js
 * Notes listing, search, tag filtering, and the note editor.
 * Phase 2.5: tag chips, autosave indicator, empty states.
 */

document.addEventListener('DOMContentLoaded', () => {

  /* ── Data layer ─────────────────────────────────────────────────────────── */
  function getNotes() {
    const defaults = [
      { id:1, title:'Integration by Parts — Key Formulas', subject:'Calculus II', tags:['formulas','exam-prep'], content:'∫u dv = uv − ∫v du\n\nRemember the LIATE rule for choosing u: Logarithmic, Inverse trig, Algebraic, Trigonometric, Exponential.', updatedAt:'2026-10-22T14:30:00Z' },
      { id:2, title:'Newton\'s Laws Summary', subject:'Physics 101', tags:['fundamentals'], content:'1st Law: An object at rest stays at rest...\n2nd Law: F = ma\n3rd Law: Every action has an equal and opposite reaction.', updatedAt:'2026-10-21T10:00:00Z' },
    ];
    return JSON.parse(localStorage.getItem('s360_notes') || JSON.stringify(defaults));
  }
  function saveNotes(notes) {
    localStorage.setItem('s360_notes', JSON.stringify(notes));
  }

  /* ─────────────────────────────────────────────────────────────────────────
     NOTES LISTING PAGE (notes.html)
  ──────────────────────────────────────────────────────────────────────────*/
  const notesGrid   = document.getElementById('notes-grid');
  const noteSearch  = document.getElementById('note-search');
  const noteSubjFlt = document.getElementById('note-subject-filter');
  const newNoteBtn  = document.getElementById('new-note-btn');
  const emptyState  = document.getElementById('notes-empty-state');
  const noResults   = document.getElementById('notes-no-results');

  if (notesGrid) {
    function renderNotes() {
      let notes = getNotes();
      
      // Total notes empty check
      if (notes.length === 0) {
        notesGrid.innerHTML = '';
        if (emptyState) emptyState.style.display = 'flex';
        if (noResults) noResults.style.display = 'none';
        return;
      }
      if (emptyState) emptyState.style.display = 'none';

      const q = noteSearch ? noteSearch.value.toLowerCase() : '';
      const subj = noteSubjFlt ? noteSubjFlt.value : 'All Subjects';

      if (q) notes = notes.filter(n => n.title.toLowerCase().includes(q) || n.content.toLowerCase().includes(q));
      if (subj !== 'All Subjects') notes = notes.filter(n => n.subject === subj);

      // Filter mismatch empty check
      if (!notes.length) {
        notesGrid.innerHTML = '';
        if (noResults) noResults.style.display = 'flex';
        return;
      }
      if (noResults) noResults.style.display = 'none';

      notesGrid.innerHTML = notes.map(n => `
        <div class="note-card" data-id="${n.id}" tabindex="0" aria-label="Note: ${n.title}"
             onclick="window.location.href='note-editor.html?id=${n.id}'"
             onkeydown="if(event.key==='Enter') window.location.href='note-editor.html?id=${n.id}'">
          <div class="note-card-header">
            <span class="note-tag">${n.subject}</span>
            ${n.tags.map(t => `<span class="note-tag" style="background:var(--paper);border:1px solid var(--rule);">${t}</span>`).join('')}
          </div>
          <h3 class="note-card-title">${n.title}</h3>
          <p class="note-card-preview">${n.content.substring(0, 120)}${n.content.length > 120 ? '…' : ''}</p>
          <div style="display:flex;justify-content:space-between;align-items:center;margin-top:1rem;">
            <span class="text-faint" style="font-size:0.75rem;">${S360.formatDate(n.updatedAt)}</span>
            <button class="btn btn-outline note-delete" data-id="${n.id}" 
              style="padding:0.2rem 0.5rem;font-size:0.75rem;color:var(--red);border-color:var(--red-soft);" 
              aria-label="Delete note"
              onclick="event.stopPropagation()">Delete</button>
          </div>
        </div>
      `).join('');

      notesGrid.querySelectorAll('.note-delete').forEach(btn => {
        btn.addEventListener('click', () => {
          saveNotes(getNotes().filter(n => n.id != btn.dataset.id));
          S360.toast('Note deleted.', 'info');
          renderNotes();
        });
      });
    }

    if (noteSearch) noteSearch.addEventListener('input', renderNotes);
    if (noteSubjFlt) noteSubjFlt.addEventListener('change', renderNotes);

    if (newNoteBtn) {
      newNoteBtn.addEventListener('click', () => {
        window.location.href = 'note-editor.html';
      });
    }

    renderNotes();
  }

  /* ─────────────────────────────────────────────────────────────────────────
     NOTE EDITOR PAGE (note-editor.html)
  ──────────────────────────────────────────────────────────────────────────*/
  const editorForm    = document.getElementById('note-editor-form');
  const editorTitle   = document.getElementById('editor-title');
  const editorSubject = document.getElementById('editor-subject');
  const editorTags    = document.getElementById('editor-tags'); // hidden input now
  const editorContent = document.getElementById('editor-content');
  const saveNoteBtn   = document.getElementById('save-note-btn');
  const deleteNoteBtn = document.getElementById('delete-note-btn');
  const wordCountEl   = document.getElementById('word-count');
  
  // Tag chips elements
  const tagChipsArea  = document.getElementById('tag-chips-area');
  const tagChipInput  = document.getElementById('tag-chip-input');
  
  // Autosave indicator
  const autosaveInd   = document.getElementById('autosave-indicator');

  if (editorForm) {
    const params = new URLSearchParams(window.location.search);
    const editId = params.get('id') ? +params.get('id') : null;
    let currentNote = null;
    let currentTags = [];

    /* ── Tag Chips Logic ────────────────────────────────────────────────── */
    function renderTagChips() {
      if (!tagChipsArea || !tagChipInput || !editorTags) return;
      
      // Remove existing chip elements (but keep the input)
      tagChipsArea.querySelectorAll('.tag-chip').forEach(el => el.remove());
      
      // Render chips before input
      currentTags.forEach((tag, idx) => {
        const chip = document.createElement('span');
        chip.className = 'tag-chip';
        chip.innerHTML = `${tag} <button type="button" class="tag-chip-remove" data-idx="${idx}" aria-label="Remove tag ${tag}">✕</button>`;
        tagChipsArea.insertBefore(chip, tagChipInput);
      });
      
      // Update hidden input
      editorTags.value = currentTags.join(',');
      
      // Bind remove handlers
      tagChipsArea.querySelectorAll('.tag-chip-remove').forEach(btn => {
        btn.addEventListener('click', (e) => {
          const idxToRemove = +e.currentTarget.dataset.idx;
          const chipEl = e.currentTarget.parentElement;
          
          // Animate out
          chipEl.classList.add('removing');
          setTimeout(() => {
            currentTags.splice(idxToRemove, 1);
            renderTagChips();
          }, 150);
        });
      });
    }
    
    if (tagChipsArea && tagChipInput) {
      // Focus input when clicking anywhere in the area
      tagChipsArea.addEventListener('click', () => tagChipInput.focus());
      
      tagChipInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ',') {
          e.preventDefault();
          const val = tagChipInput.value.trim().replace(',', '');
          if (val && !currentTags.includes(val)) {
            currentTags.push(val);
            tagChipInput.value = '';
            renderTagChips();
          } else {
            tagChipInput.value = '';
          }
        } else if (e.key === 'Backspace' && tagChipInput.value === '' && currentTags.length > 0) {
          // Remove last tag on backspace if input is empty
          currentTags.pop();
          renderTagChips();
        }
      });
      
      tagChipInput.addEventListener('blur', () => {
        const val = tagChipInput.value.trim().replace(',', '');
        if (val && !currentTags.includes(val)) {
          currentTags.push(val);
          renderTagChips();
        }
        tagChipInput.value = '';
      });
    }

    /* ── Init Data ──────────────────────────────────────────────────────── */
    if (editId) {
      currentNote = getNotes().find(n => n.id === editId);
      if (currentNote) {
        editorTitle.value   = currentNote.title;
        editorSubject.value = currentNote.subject;
        currentTags         = currentNote.tags || [];
        editorContent.value = currentNote.content;
      }
    }
    
    updateWordCount();
    renderTagChips();

    function updateWordCount() {
      if (!wordCountEl || !editorContent) return;
      const text = editorContent.value.trim();
      const words = text ? text.split(/\s+/).filter(Boolean).length : 0;
      wordCountEl.textContent = `${words} word${words !== 1 ? 's' : ''}`;
    }
    if (editorContent) editorContent.addEventListener('input', updateWordCount);

    if (saveNoteBtn) {
      saveNoteBtn.addEventListener('click', () => {
        const title   = editorTitle   ? editorTitle.value.trim()   : '';
        const subject = editorSubject ? editorSubject.value        : '';
        const content = editorContent ? editorContent.value.trim() : '';
        const tags    = currentTags;

        if (!title)   { S360.toast('Please enter a note title.', 'error'); return; }
        if (!content) { S360.toast('Note is empty.', 'error'); return; }

        let notes = getNotes();
        if (editId && currentNote) {
          notes = notes.map(n => n.id === editId ? { ...n, title, subject, tags, content, updatedAt: new Date().toISOString() } : n);
          
          // Show autosave indicator for 2 seconds instead of navigating away immediately
          saveNotes(notes);
          if (autosaveInd) {
            autosaveInd.classList.add('visible');
            setTimeout(() => autosaveInd.classList.remove('visible'), 2000);
          } else {
            S360.toast('Note saved!', 'success');
          }
          
        } else {
          notes.unshift({ id: Date.now(), title, subject, tags, content, updatedAt: new Date().toISOString() });
          saveNotes(notes);
          S360.toast('Note created!', 'success');
          setTimeout(() => { window.location.href = 'notes.html'; }, 600);
        }
      });
    }

    if (deleteNoteBtn && editId) {
      deleteNoteBtn.style.display = '';
      deleteNoteBtn.addEventListener('click', () => {
        if (!confirm('Delete this note?')) return;
        saveNotes(getNotes().filter(n => n.id !== editId));
        S360.toast('Note deleted.', 'info');
        setTimeout(() => { window.location.href = 'notes.html'; }, 600);
      });
    }
  }
});
