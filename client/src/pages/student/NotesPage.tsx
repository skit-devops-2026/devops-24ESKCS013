import React, { useState, useEffect } from 'react';
import { Plus } from 'lucide-react';
import { useToast } from '../../context/ToastContext';
import { PageHeader } from '../../components/PageHeader';
import {
  getNotes,
  createNote,
  updateNote,
  deleteNote,
  getSubjects,
  NoteItem,
  SubjectItem,
} from '../../services/student.service';

export function NotesPage() {
  const { toast, confirmModal } = useToast();
  const [notes, setNotes] = useState<NoteItem[]>([]);
  const [subjects, setSubjects] = useState<SubjectItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Search & filter
  const [search, setSearch] = useState('');
  const [selectedTag, setSelectedTag] = useState('');

  // Note editor modal
  const [showModal, setShowModal] = useState(false);
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [tagsInput, setTagsInput] = useState('');
  const [subjectId, setSubjectId] = useState('');
  const [isPinned, setIsPinned] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  async function loadData() {
    setLoading(true);
    setError(null);
    try {
      const [notesData, subjectsData] = await Promise.all([
        getNotes(search, selectedTag),
        getSubjects(),
      ]);
      setNotes(notesData);
      setSubjects(subjectsData);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load notes');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, [search, selectedTag]);

  function handleOpenCreate() {
    setEditingNoteId(null);
    setTitle('');
    setContent('');
    setTagsInput('');
    setSubjectId('');
    setIsPinned(false);
    setShowModal(true);
  }

  function handleOpenEdit(note: NoteItem) {
    setEditingNoteId(note._id);
    setTitle(note.title);
    setContent(note.content);
    setTagsInput(note.tags.join(', '));
    setSubjectId(note.subjectId || '');
    setIsPinned(note.isPinned);
    setShowModal(true);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    setSubmitting(true);

    const tags = tagsInput
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean);

    try {
      if (editingNoteId) {
        await updateNote(editingNoteId, {
          title,
          content,
          tags,
          subjectId: subjectId || null,
          isPinned,
        });
      } else {
        await createNote({
          title,
          content,
          tags,
          subjectId: subjectId || null,
          isPinned,
        });
      }
      setShowModal(false);
      toast.success(editingNoteId ? 'Note updated successfully' : 'Note created successfully');
      loadData();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to save note');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(id: string) {
    const confirmed = await confirmModal({
      title: 'Delete Lecture Note',
      message: 'Are you sure you want to delete this note? This action cannot be undone.',
      confirmText: 'Delete Note',
      isDestructive: true,
    });
    if (!confirmed) return;

    try {
      await deleteNote(id);
      setNotes((prev) => prev.filter((n) => n._id !== id));
      toast.success('Note deleted');
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Delete failed');
    }
  }

  // Extract unique tags for tag filter pill list
  const allTags = Array.from(new Set(notes.flatMap((n) => n.tags)));

  return (
    <div className="container" style={{ padding: '1rem' }}>
      <PageHeader
        badge="Personal Notebook"
        badgeType="gold"
        title="Lecture Notes & Summaries"
        description="Markdown-ready study notes with subject tagging, search, and revision summaries."
        backTo="/student/dashboard"
        backLabel="Back to Dashboard"
        actions={
          <button onClick={handleOpenCreate} className="btn btn-primary" style={{ gap: '0.4rem' }}>
            <Plus size={16} />
            <span>New Lecture Note</span>
          </button>
        }
      />

      {/* Search and Tag filter toolbar */}
      <div className="card" style={{ padding: '1.25rem 1.5rem', marginBottom: '2rem' }}>
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap', marginBottom: allTags.length > 0 ? '1rem' : '0' }}>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search notes by keyword or concept..."
            style={{ flex: 1, minWidth: '240px', padding: '0.5rem 0.85rem', borderRadius: '4px', border: '1px solid var(--rule-strong)', fontSize: '0.9rem' }}
          />
          {search && (
            <button onClick={() => setSearch('')} className="btn btn-secondary" style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem' }}>
              Clear
            </button>
          )}
        </div>

        {allTags.length > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--ink-soft)', fontWeight: 600 }}>Filter by Tag:</span>
            <button
              onClick={() => setSelectedTag('')}
              className={`badge ${!selectedTag ? 'badge-gold' : 'badge-green'}`}
              style={{ cursor: 'pointer', border: 'none' }}
            >
              All
            </button>
            {allTags.map((t) => (
              <button
                key={t}
                onClick={() => setSelectedTag(selectedTag === t ? '' : t)}
                className={`badge ${selectedTag === t ? 'badge-gold' : 'badge-green'}`}
                style={{ cursor: 'pointer', border: 'none' }}
              >
                #{t}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Notes Grid */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '4rem 1rem', color: 'var(--ink-soft)' }}>Loading your notebook...</div>
      ) : error ? (
        <div style={{ background: 'var(--red-soft)', color: 'var(--red)', padding: '1rem', borderRadius: '6px' }}>{error}</div>
      ) : notes.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '4rem 1rem' }}>
          <h3 style={{ fontSize: '1.25rem', marginBottom: '0.5rem' }}>No lecture notes recorded</h3>
          <p style={{ color: 'var(--ink-soft)', marginBottom: '1.5rem' }}>Record lecture summaries, exam formulas, or key concepts.</p>
          <button onClick={handleOpenCreate} className="btn btn-secondary">
            + Write First Note
          </button>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.5rem' }}>
          {notes.map((note) => (
            <div
              key={note._id}
              className="card"
              style={{
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                borderTop: note.isPinned ? '3px solid var(--gold)' : '1px solid var(--rule)',
              }}
            >
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                  {note.subjectCode ? <span className="badge badge-gold">{note.subjectCode}</span> : <span />}
                  {note.isPinned && <span style={{ fontSize: '0.8rem', color: 'var(--gold-ink)', fontWeight: 600 }}>📌 Pinned</span>}
                </div>

                <h3 style={{ fontSize: '1.25rem', marginBottom: '0.5rem', color: 'var(--ink)' }}>{note.title}</h3>

                {/* Safe plain text preview */}
                <p
                  style={{
                    fontSize: '0.875rem',
                    color: 'var(--ink-soft)',
                    marginBottom: '1rem',
                    lineHeight: 1.5,
                    maxHeight: '120px',
                    overflow: 'hidden',
                    whiteSpace: 'pre-line',
                  }}
                >
                  {note.content || '(Empty content)'}
                </p>

                {/* Tags */}
                {note.tags.length > 0 && (
                  <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
                    {note.tags.map((t) => (
                      <span key={t} style={{ fontSize: '0.75rem', color: 'var(--ink-soft)', background: 'var(--paper)', padding: '0.15rem 0.45rem', borderRadius: '4px' }}>
                        #{t}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <div style={{ borderTop: '1px solid var(--rule)', paddingTop: '0.75rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.75rem', color: 'var(--ink-faint)' }}>
                  Updated {new Date(note.updatedAt).toLocaleDateString()}
                </span>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button onClick={() => handleOpenEdit(note)} className="btn btn-secondary" style={{ padding: '0.25rem 0.6rem', fontSize: '0.75rem' }}>
                    Edit
                  </button>
                  <button onClick={() => handleDelete(note._id)} style={{ fontSize: '0.75rem', color: 'var(--red)', cursor: 'pointer' }}>
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Editor Modal */}
      {showModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: '1rem' }}>
          <div className="card" style={{ maxWidth: '600px', width: '100%', padding: '2rem' }}>
            <h3 style={{ fontSize: '1.5rem', marginBottom: '1.25rem' }}>
              {editingNoteId ? 'Edit Lecture Note' : 'Create Lecture Note'}
            </h3>
            <form onSubmit={handleSave}>
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.35rem' }}>Title</label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. B-Trees &amp; Indexing Strategy"
                  style={{ width: '100%', padding: '0.5rem 0.75rem', borderRadius: '4px', border: '1px solid var(--rule-strong)' }}
                />
              </div>

              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.35rem' }}>Note Content</label>
                <textarea
                  rows={8}
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="Type lecture notes, code snippets, or revision points..."
                  style={{ width: '100%', padding: '0.5rem 0.75rem', borderRadius: '4px', border: '1px solid var(--rule-strong)', fontFamily: 'monospace' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.35rem' }}>Associated Subject</label>
                  <select
                    value={subjectId}
                    onChange={(e) => setSubjectId(e.target.value)}
                    style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid var(--rule-strong)' }}
                  >
                    <option value="">-- No Subject --</option>
                    {subjects.map((s) => (
                      <option key={s._id} value={s._id}>
                        {s.code} — {s.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.35rem' }}>Tags (Comma separated)</label>
                  <input
                    type="text"
                    value={tagsInput}
                    onChange={(e) => setTagsInput(e.target.value)}
                    placeholder="e.g. DBMS, Midsem, Trees"
                    style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid var(--rule-strong)' }}
                  />
                </div>
              </div>

              <div style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <input
                  id="pinNote"
                  type="checkbox"
                  checked={isPinned}
                  onChange={(e) => setIsPinned(e.target.checked)}
                />
                <label htmlFor="pinNote" style={{ fontSize: '0.875rem', cursor: 'pointer' }}>
                  Pin this note to the top of my notebook
                </label>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                <button type="button" onClick={() => setShowModal(false)} className="btn btn-secondary">
                  Cancel
                </button>
                <button type="submit" disabled={submitting} className="btn btn-primary">
                  {submitting ? 'Saving...' : 'Save Note'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
