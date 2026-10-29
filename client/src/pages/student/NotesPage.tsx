import React, { useState, useEffect, useRef } from 'react';
import {
  Plus,
  Search,
  Pin,
  Trash2,
  Edit3,
  Tag,
  Eye,
  Code,
  List,
  ListOrdered,
  Heading1,
  Heading2,
  Bold,
  Italic,
  Quote,
  Link2,
  X,
  BookOpen,
} from 'lucide-react';
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
import { renderMarkdown } from '../../utils/markdown';

export function NotesPage() {
  const { toast, confirmModal } = useToast();
  const [notes, setNotes] = useState<NoteItem[]>([]);
  const [subjects, setSubjects] = useState<SubjectItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Search & filter
  const [search, setSearch] = useState('');
  const [selectedTag, setSelectedTag] = useState('');
  const [selectedSubjectFilter, setSelectedSubjectFilter] = useState('all');

  // Note editor modal
  const [showModal, setShowModal] = useState(false);
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [tagsInput, setTagsInput] = useState('');
  const [subjectId, setSubjectId] = useState('');
  const [isPinned, setIsPinned] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Mobile Editor Tab: 'edit' vs 'preview'
  const [activeEditorTab, setActiveEditorTab] = useState<'edit' | 'preview'>('edit');

  const textareaRef = useRef<HTMLTextAreaElement>(null);

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
    setActiveEditorTab('edit');
    setShowModal(true);
  }

  function handleOpenEdit(note: NoteItem) {
    setEditingNoteId(note._id);
    setTitle(note.title);
    setContent(note.content);
    setTagsInput(note.tags.join(', '));
    setSubjectId(note.subjectId || '');
    setIsPinned(note.isPinned);
    setActiveEditorTab('edit');
    setShowModal(true);
  }

  // Formatting helpers for the markdown toolbar
  function insertFormatting(prefix: string, suffix: string = '', defaultText: string = '') {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const currentVal = textarea.value;

    const selectedText = currentVal.substring(start, end) || defaultText;
    const replacement = `${prefix}${selectedText}${suffix}`;

    const nextVal = currentVal.substring(0, start) + replacement + currentVal.substring(end);
    setContent(nextVal);

    // Restore cursor position
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(
        start + prefix.length,
        start + prefix.length + selectedText.length
      );
    }, 0);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    setSubmitting(true);

    const tags = tagsInput
      .split(',')
      .map((t) => t.trim().replace(/^#/, ''))
      .filter(Boolean);

    try {
      if (editingNoteId) {
        await updateNote(editingNoteId, {
          title: title.trim(),
          content,
          tags,
          subjectId: subjectId || null,
          isPinned,
        });
        toast.success('Note updated successfully');
      } else {
        await createNote({
          title: title.trim(),
          content,
          tags,
          subjectId: subjectId || null,
          isPinned,
        });
        toast.success('Note created successfully');
      }
      setShowModal(false);
      loadData();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to save note');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleTogglePin(note: NoteItem) {
    try {
      await updateNote(note._id, { isPinned: !note.isPinned });
      setNotes((prev) =>
        prev.map((n) => (n._id === note._id ? { ...n, isPinned: !note.isPinned } : n))
      );
      toast.success(note.isPinned ? 'Note unpinned' : 'Note pinned to top');
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Pin failed');
    }
  }

  async function handleDelete(id: string) {
    const confirmed = await confirmModal({
      title: 'Delete Lecture Note',
      message: 'Are you sure you want to delete this lecture note? This action cannot be undone.',
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

  // Extract unique tags
  const allTags = Array.from(new Set(notes.flatMap((n) => n.tags)));

  // Filter notes by subject filter in addition to backend search & tag
  const displayedNotes = notes
    .filter((n) => {
      if (selectedSubjectFilter !== 'all' && n.subjectId !== selectedSubjectFilter) {
        return false;
      }
      return true;
    })
    .sort((a, b) => {
      // Pinned notes always surface to top
      if (a.isPinned && !b.isPinned) return -1;
      if (!a.isPinned && b.isPinned) return 1;
      return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
    });

  return (
    <div className="container" style={{ padding: '1rem' }}>
      <PageHeader
        badge="Personal Notebook"
        badgeType="gold"
        title="Lecture Notes & Summaries"
        description="Markdown-powered notebook with split-pane live preview, tag categorization, course linkage, and sanitization."
        backTo="/student/dashboard"
        backLabel="Back to Dashboard"
        actions={
          <button onClick={handleOpenCreate} className="btn btn-primary" style={{ gap: '0.4rem' }}>
            <Plus size={16} />
            <span>New Lecture Note</span>
          </button>
        }
      />

      {/* Search and Filters Toolbar */}
      <div className="card" style={{ padding: '1rem 1.25rem', marginBottom: '1.5rem' }}>
        <div
          style={{
            display: 'flex',
            gap: '1rem',
            alignItems: 'center',
            flexWrap: 'wrap',
            marginBottom: allTags.length > 0 ? '0.75rem' : '0',
          }}
        >
          <div style={{ position: 'relative', flex: '1 1 240px' }}>
            <Search
              size={16}
              style={{
                position: 'absolute',
                left: '0.75rem',
                top: '50%',
                transform: 'translateY(-50%)',
                color: 'var(--ink-soft)',
              }}
            />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search notes by keyword, formula, or concept..."
              className="input-field"
              style={{ paddingLeft: '2.25rem', width: '100%', fontSize: '0.875rem' }}
            />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--ink)' }}>
              Course:
            </span>
            <select
              value={selectedSubjectFilter}
              onChange={(e) => setSelectedSubjectFilter(e.target.value)}
              className="input-field"
              style={{ fontSize: '0.85rem', padding: '0.4rem 0.6rem' }}
            >
              <option value="all">All Courses</option>
              {subjects.map((s) => (
                <option key={s._id} value={s._id}>
                  {s.code} — {s.name}
                </option>
              ))}
            </select>
          </div>

          {search && (
            <button
              onClick={() => setSearch('')}
              className="btn btn-secondary"
              style={{ padding: '0.4rem 0.75rem', fontSize: '0.8rem' }}
            >
              Clear
            </button>
          )}
        </div>

        {/* Tag pills bar */}
        {allTags.length > 0 && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
              flexWrap: 'wrap',
              borderTop: '1px solid var(--border)',
              paddingTop: '0.75rem',
            }}
          >
            <span
              style={{
                fontSize: '0.78rem',
                color: 'var(--ink-soft)',
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                gap: '0.25rem',
              }}
            >
              <Tag size={13} /> Tags:
            </span>
            <button
              onClick={() => setSelectedTag('')}
              className={`badge ${!selectedTag ? 'badge-gold' : 'badge-green'}`}
              style={{ cursor: 'pointer', border: 'none', fontSize: '0.75rem' }}
            >
              All
            </button>
            {allTags.map((t) => (
              <button
                key={t}
                onClick={() => setSelectedTag(selectedTag === t ? '' : t)}
                className={`badge ${selectedTag === t ? 'badge-gold' : 'badge-green'}`}
                style={{ cursor: 'pointer', border: 'none', fontSize: '0.75rem' }}
              >
                #{t}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Notes Grid */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '4rem 1rem', color: 'var(--ink-soft)' }}>
          Loading your lecture notes...
        </div>
      ) : error ? (
        <div
          style={{
            background: 'var(--crimson-soft)',
            color: 'var(--crimson)',
            padding: '1rem',
            borderRadius: '6px',
          }}
        >
          {error}
        </div>
      ) : displayedNotes.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '4rem 1rem' }}>
          <BookOpen
            size={40}
            style={{ color: 'var(--brand-gold)', margin: '0 auto 1rem', opacity: 0.8 }}
          />
          <h3 style={{ fontSize: '1.25rem', marginBottom: '0.5rem', color: 'var(--ink)' }}>
            No lecture notes found
          </h3>
          <p
            style={{
              color: 'var(--ink-soft)',
              marginBottom: '1.5rem',
              maxWidth: '400px',
              margin: '0 auto 1.5rem',
            }}
          >
            Write lecture notes with markdown support, formula cheatsheets, and concept revisions.
          </p>
          <button onClick={handleOpenCreate} className="btn btn-secondary">
            + Write First Note
          </button>
        </div>
      ) : (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 340px), 1fr))',
            gap: '1.25rem',
          }}
        >
          {displayedNotes.map((note) => (
            <div
              key={note._id}
              className="card"
              style={{
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                borderTop: note.isPinned
                  ? '3px solid var(--brand-gold)'
                  : '1px solid var(--border)',
                boxShadow: note.isPinned ? 'var(--shadow-md)' : 'var(--shadow-sm)',
                padding: '1.25rem',
              }}
            >
              <div>
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: '0.5rem',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    {note.subjectCode ? (
                      <span className="badge badge-gold" style={{ fontSize: '0.72rem' }}>
                        {note.subjectCode}
                      </span>
                    ) : (
                      <span className="badge badge-blue" style={{ fontSize: '0.72rem' }}>
                        General
                      </span>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() => handleTogglePin(note)}
                    className="btn btn-ghost"
                    style={{
                      padding: '0.2rem',
                      color: note.isPinned ? 'var(--brand-gold)' : 'var(--ink-soft)',
                    }}
                    title={note.isPinned ? 'Unpin note' : 'Pin note to top'}
                  >
                    {note.isPinned ? <Pin size={16} fill="var(--brand-gold)" /> : <Pin size={16} />}
                  </button>
                </div>

                <h3
                  style={{
                    fontSize: '1.15rem',
                    fontWeight: 700,
                    marginBottom: '0.5rem',
                    color: 'var(--ink)',
                  }}
                >
                  {note.title}
                </h3>

                {/* Sanitized Excerpt / Snippet */}
                <div
                  style={{
                    fontSize: '0.85rem',
                    color: 'var(--ink-soft)',
                    marginBottom: '1rem',
                    lineHeight: 1.5,
                    maxHeight: '120px',
                    overflow: 'hidden',
                    position: 'relative',
                  }}
                  dangerouslySetInnerHTML={{
                    __html: renderMarkdown(note.content || '*(No content)*'),
                  }}
                />

                {/* Tags */}
                {note.tags.length > 0 && (
                  <div
                    style={{
                      display: 'flex',
                      gap: '0.35rem',
                      flexWrap: 'wrap',
                      marginBottom: '0.75rem',
                    }}
                  >
                    {note.tags.map((t) => (
                      <span
                        key={t}
                        onClick={() => setSelectedTag(t)}
                        style={{
                          fontSize: '0.72rem',
                          color: 'var(--ink-soft)',
                          background: 'var(--surface-muted)',
                          border: '1px solid var(--border)',
                          padding: '0.15rem 0.45rem',
                          borderRadius: '4px',
                          cursor: 'pointer',
                        }}
                      >
                        #{t}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <div
                style={{
                  borderTop: '1px solid var(--border)',
                  paddingTop: '0.75rem',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <span style={{ fontSize: '0.75rem', color: 'var(--ink-soft)' }}>
                  Updated {new Date(note.updatedAt).toLocaleDateString()}
                </span>
                <div style={{ display: 'flex', gap: '0.4rem' }}>
                  <button
                    onClick={() => handleOpenEdit(note)}
                    className="btn btn-secondary"
                    style={{ padding: '0.25rem 0.55rem', fontSize: '0.75rem', gap: '0.25rem' }}
                  >
                    <Edit3 size={13} />
                    <span>Edit</span>
                  </button>
                  <button
                    onClick={() => handleDelete(note._id)}
                    className="btn btn-ghost"
                    style={{ padding: '0.25rem', color: 'var(--crimson)' }}
                    title="Delete note"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Split-Pane Markdown Editor Modal */}
      {showModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '1rem',
          }}
        >
          <div
            className="card"
            style={{
              maxWidth: '960px',
              width: '100%',
              maxHeight: '92vh',
              overflowY: 'auto',
              padding: '1.75rem',
              display: 'flex',
              flexDirection: 'column',
              boxShadow: 'var(--shadow-xl)',
            }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '1.25rem',
              }}
            >
              <div>
                <span className="badge badge-gold" style={{ marginBottom: '0.25rem' }}>
                  Markdown Editor
                </span>
                <h3 style={{ fontSize: '1.35rem', color: 'var(--ink)', margin: 0 }}>
                  {editingNoteId ? 'Edit Lecture Note' : 'Create Lecture Note'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="btn btn-ghost"
                style={{ padding: '0.35rem' }}
              >
                <X size={18} />
              </button>
            </div>

            <form
              onSubmit={handleSave}
              style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}
            >
              {/* Note Title */}
              <div>
                <label
                  style={{
                    display: 'block',
                    fontSize: '0.85rem',
                    fontWeight: 600,
                    marginBottom: '0.35rem',
                    color: 'var(--ink)',
                  }}
                >
                  Note Title
                </label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Dynamic Programming: Memoization vs Tabulation"
                  className="input-field"
                  style={{ width: '100%', fontSize: '1rem', fontWeight: 600 }}
                />
              </div>

              {/* Course & Tags row */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                  gap: '1rem',
                }}
              >
                <div>
                  <label
                    style={{
                      display: 'block',
                      fontSize: '0.85rem',
                      fontWeight: 600,
                      marginBottom: '0.35rem',
                      color: 'var(--ink)',
                    }}
                  >
                    Associated Course
                  </label>
                  <select
                    value={subjectId}
                    onChange={(e) => setSubjectId(e.target.value)}
                    className="input-field"
                    style={{ width: '100%' }}
                  >
                    <option value="">-- No Course (General Note) --</option>
                    {subjects.map((s) => (
                      <option key={s._id} value={s._id}>
                        {s.code} — {s.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label
                    style={{
                      display: 'block',
                      fontSize: '0.85rem',
                      fontWeight: 600,
                      marginBottom: '0.35rem',
                      color: 'var(--ink)',
                    }}
                  >
                    Tags (Comma separated)
                  </label>
                  <input
                    type="text"
                    value={tagsInput}
                    onChange={(e) => setTagsInput(e.target.value)}
                    placeholder="e.g. algorithms, midsem, dp"
                    className="input-field"
                    style={{ width: '100%' }}
                  />
                </div>
              </div>

              {/* Mobile Tab Toggle for Edit vs Preview (visible on small screens) */}
              <div
                className="show-on-mobile-only"
                style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.25rem' }}
              >
                <button
                  type="button"
                  onClick={() => setActiveEditorTab('edit')}
                  className={`btn ${activeEditorTab === 'edit' ? 'btn-primary' : 'btn-secondary'}`}
                  style={{ flex: 1, padding: '0.4rem', fontSize: '0.8rem', gap: '0.3rem' }}
                >
                  <Edit3 size={14} />
                  <span>Editor</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveEditorTab('preview')}
                  className={`btn ${activeEditorTab === 'preview' ? 'btn-primary' : 'btn-secondary'}`}
                  style={{ flex: 1, padding: '0.4rem', fontSize: '0.8rem', gap: '0.3rem' }}
                >
                  <Eye size={14} />
                  <span>Live Preview</span>
                </button>
              </div>

              {/* Markdown Formatting Toolbar */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.25rem',
                  flexWrap: 'wrap',
                  backgroundColor: 'var(--surface-muted)',
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--radius-sm)',
                  padding: '0.35rem 0.5rem',
                }}
              >
                <button
                  type="button"
                  onClick={() => insertFormatting('# ', '', 'Header 1')}
                  className="btn btn-ghost"
                  style={{ padding: '0.25rem 0.4rem' }}
                  title="Heading 1"
                >
                  <Heading1 size={15} />
                </button>
                <button
                  type="button"
                  onClick={() => insertFormatting('## ', '', 'Header 2')}
                  className="btn btn-ghost"
                  style={{ padding: '0.25rem 0.4rem' }}
                  title="Heading 2"
                >
                  <Heading2 size={15} />
                </button>
                <button
                  type="button"
                  onClick={() => insertFormatting('**', '**', 'bold text')}
                  className="btn btn-ghost"
                  style={{ padding: '0.25rem 0.4rem' }}
                  title="Bold"
                >
                  <Bold size={15} />
                </button>
                <button
                  type="button"
                  onClick={() => insertFormatting('*', '*', 'italic text')}
                  className="btn btn-ghost"
                  style={{ padding: '0.25rem 0.4rem' }}
                  title="Italic"
                >
                  <Italic size={15} />
                </button>
                <button
                  type="button"
                  onClick={() => insertFormatting('`', '`', 'code')}
                  className="btn btn-ghost"
                  style={{ padding: '0.25rem 0.4rem' }}
                  title="Inline Code"
                >
                  <Code size={15} />
                </button>
                <button
                  type="button"
                  onClick={() => insertFormatting('- ', '', 'List item')}
                  className="btn btn-ghost"
                  style={{ padding: '0.25rem 0.4rem' }}
                  title="Bullet List"
                >
                  <List size={15} />
                </button>
                <button
                  type="button"
                  onClick={() => insertFormatting('1. ', '', 'Numbered item')}
                  className="btn btn-ghost"
                  style={{ padding: '0.25rem 0.4rem' }}
                  title="Numbered List"
                >
                  <ListOrdered size={15} />
                </button>
                <button
                  type="button"
                  onClick={() => insertFormatting('> ', '', 'Quote text')}
                  className="btn btn-ghost"
                  style={{ padding: '0.25rem 0.4rem' }}
                  title="Blockquote"
                >
                  <Quote size={15} />
                </button>
                <button
                  type="button"
                  onClick={() => insertFormatting('[', '](https://example.com)', 'Link title')}
                  className="btn btn-ghost"
                  style={{ padding: '0.25rem 0.4rem' }}
                  title="Link"
                >
                  <Link2 size={15} />
                </button>
              </div>

              {/* Split Pane Editor (Desktop side-by-side, mobile tabbed) */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 380px), 1fr))',
                  gap: '1rem',
                  minHeight: '280px',
                }}
              >
                {/* Editor Pane */}
                <div
                  style={{
                    display: activeEditorTab === 'edit' ? 'flex' : 'none',
                    flexDirection: 'column',
                  }}
                  className="editor-pane"
                >
                  <textarea
                    ref={textareaRef}
                    rows={12}
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    placeholder="Type lecture notes, concepts, or code snippets with markdown syntax..."
                    className="input-field"
                    style={{
                      width: '100%',
                      height: '100%',
                      minHeight: '260px',
                      fontFamily: 'monospace',
                      fontSize: '0.875rem',
                      lineHeight: 1.5,
                      resize: 'vertical',
                    }}
                  />
                </div>

                {/* Live Preview Pane */}
                <div
                  style={{
                    display: activeEditorTab === 'preview' ? 'flex' : 'flex',
                    flexDirection: 'column',
                    backgroundColor: 'var(--surface-muted)',
                    borderRadius: 'var(--radius-sm)',
                    border: '1px solid var(--border)',
                    padding: '1rem',
                    overflowY: 'auto',
                    minHeight: '260px',
                    maxHeight: '400px',
                  }}
                  className="preview-pane"
                >
                  <span
                    style={{
                      fontSize: '0.72rem',
                      fontWeight: 700,
                      textTransform: 'uppercase',
                      color: 'var(--ink-soft)',
                      marginBottom: '0.5rem',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.3rem',
                    }}
                  >
                    <Eye size={12} /> Live Rendered Preview
                  </span>

                  <div
                    style={{ fontSize: '0.875rem', color: 'var(--ink)' }}
                    dangerouslySetInnerHTML={{
                      __html: renderMarkdown(
                        content || '*(Live preview will appear here as you write markdown)*'
                      ),
                    }}
                  />
                </div>
              </div>

              {/* Pin Checkbox */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  marginTop: '0.25rem',
                }}
              >
                <input
                  id="pinNote"
                  type="checkbox"
                  checked={isPinned}
                  onChange={(e) => setIsPinned(e.target.checked)}
                  style={{ accentColor: 'var(--brand-gold)', width: '1.1rem', height: '1.1rem' }}
                />
                <label
                  htmlFor="pinNote"
                  style={{
                    fontSize: '0.85rem',
                    cursor: 'pointer',
                    color: 'var(--ink)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.35rem',
                  }}
                >
                  <Pin size={14} />
                  <span>Pin this note to the top of my notebook</span>
                </label>
              </div>

              {/* Actions */}
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'flex-end',
                  gap: '0.75rem',
                  marginTop: '0.5rem',
                }}
              >
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="btn btn-secondary"
                >
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
