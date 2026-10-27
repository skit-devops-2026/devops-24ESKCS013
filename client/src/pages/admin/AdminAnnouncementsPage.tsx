import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getAnnouncements, createAnnouncement, deleteAnnouncement, AnnouncementItem } from '../../services/admin.service';
import { useToast } from '../../context/ToastContext';

export function AdminAnnouncementsPage() {
  const { toast, confirmModal } = useToast();
  const [announcements, setAnnouncements] = useState<AnnouncementItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState('');

  // Modal form state
  const [showModal, setShowModal] = useState(false);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [priority, setPriority] = useState<'normal' | 'urgent'>('normal');
  const [targetAudience, setTargetAudience] = useState<'all' | 'students' | 'faculty'>('all');
  const [status, setStatus] = useState<'draft' | 'published'>('published');
  const [submitting, setSubmitting] = useState(false);

  async function loadData() {
    setLoading(true);
    setError(null);
    try {
      const res = await getAnnouncements({ status: statusFilter });
      setAnnouncements(res.data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load announcements');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, [statusFilter]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim() || !content.trim()) return;
    setSubmitting(true);
    try {
      await createAnnouncement({
        title,
        content,
        priority,
        targetAudience,
        status,
      });
      setShowModal(false);
      setTitle('');
      setContent('');
      toast.success('Announcement published successfully');
      loadData();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to create announcement');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(id: string) {
    const ok = await confirmModal({
      title: 'Delete Announcement',
      message: 'Are you sure you want to permanently delete this announcement?',
      confirmText: 'Delete Announcement',
      isDestructive: true,
    });
    if (!ok) return;
    try {
      await deleteAnnouncement(id);
      setAnnouncements((prev) => prev.filter((a) => a._id !== id));
      toast.success('Announcement deleted');
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to delete announcement');
    }
  }

  return (
    <div className="container" style={{ padding: '2.5rem 1rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <span className="badge badge-gold" style={{ marginBottom: '0.5rem' }}>Campus Communications</span>
          <h1 style={{ fontSize: '2.25rem', color: 'var(--ink)' }}>Institutional Announcements</h1>
          <p style={{ color: 'var(--ink-soft)' }}>
            Broadcast academic bulletins, exam schedules, and holiday notifications to students and faculty.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <Link to="/admin/dashboard" className="btn btn-secondary">
            ← Dashboard
          </Link>
          <button onClick={() => setShowModal(true)} className="btn btn-primary">
            + Post Announcement
          </button>
        </div>
      </div>

      {error && (
        <div style={{ background: 'var(--red-light)', color: 'var(--red)', padding: '1rem', borderRadius: '6px', marginBottom: '1.5rem', border: '1px solid var(--red)' }}>
          ⚠️ {error}
        </div>
      )}

      {/* Filter tab bar */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem' }}>
        <button
          onClick={() => setStatusFilter('')}
          className={`btn ${statusFilter === '' ? 'btn-primary' : 'btn-secondary'}`}
          style={{ padding: '0.4rem 0.8rem', fontSize: '0.85rem' }}
        >
          All Announcements
        </button>
        <button
          onClick={() => setStatusFilter('published')}
          className={`btn ${statusFilter === 'published' ? 'btn-primary' : 'btn-secondary'}`}
          style={{ padding: '0.4rem 0.8rem', fontSize: '0.85rem' }}
        >
          Published Only
        </button>
        <button
          onClick={() => setStatusFilter('draft')}
          className={`btn ${statusFilter === 'draft' ? 'btn-primary' : 'btn-secondary'}`}
          style={{ padding: '0.4rem 0.8rem', fontSize: '0.85rem' }}
        >
          Drafts Only
        </button>
      </div>

      {/* Announcements Feed */}
      {loading ? (
        <div className="card" style={{ padding: '3rem', textAlign: 'center', color: 'var(--ink-soft)' }}>
          Loading announcements...
        </div>
      ) : announcements.length === 0 ? (
        <div className="card" style={{ padding: '3rem', textAlign: 'center' }}>
          <h3 style={{ fontSize: '1.25rem', marginBottom: '0.5rem' }}>No announcements found</h3>
          <p style={{ color: 'var(--ink-soft)', marginBottom: '1.5rem' }}>
            There are no announcements currently matching your filter.
          </p>
          <button onClick={() => setShowModal(true)} className="btn btn-primary">
            Create First Announcement
          </button>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {announcements.map((item) => (
            <div
              key={item._id}
              className="card"
              style={{
                borderLeft: item.priority === 'urgent' ? '4px solid var(--red)' : '4px solid var(--blue)',
                padding: '1.5rem',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '0.75rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span className={`badge ${item.priority === 'urgent' ? 'badge-gold' : 'badge-green'}`} style={{ textTransform: 'uppercase' }}>
                    {item.priority}
                  </span>
                  <span className="badge" style={{ background: 'var(--bg-muted)', color: 'var(--text-muted)' }}>
                    Audience: {item.targetAudience.toUpperCase()}
                  </span>
                  <span className={`badge ${item.status === 'published' ? 'badge-green' : 'badge-gold'}`}>
                    {item.status.toUpperCase()}
                  </span>
                </div>
                <button
                  onClick={() => handleDelete(item._id)}
                  className="btn btn-secondary"
                  style={{ padding: '0.3rem 0.6rem', fontSize: '0.8rem', color: 'var(--red)' }}
                >
                  Delete
                </button>
              </div>

              <h3 style={{ fontSize: '1.25rem', marginBottom: '0.5rem', color: 'var(--ink)' }}>{item.title}</h3>
              <p style={{ color: 'var(--ink-soft)', lineHeight: 1.6, whiteSpace: 'pre-wrap', marginBottom: '1rem' }}>
                {item.content}
              </p>

              <div style={{ fontSize: '0.8rem', color: 'var(--ink-soft)', borderTop: '1px solid var(--rule)', paddingTop: '0.75rem' }}>
                Published by <strong>{item.authorId?.name || 'Administrator'}</strong> on{' '}
                {new Date(item.createdAt).toLocaleDateString()}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Announcement Modal */}
      {showModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: '1rem' }}>
          <div className="card" style={{ maxWidth: '520px', width: '100%', padding: '2rem' }}>
            <h3 style={{ fontSize: '1.5rem', marginBottom: '1.25rem' }}>Post Campus Announcement</h3>
            <form onSubmit={handleCreate}>
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.35rem' }}>
                  Title
                </label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Schedule for Final Exam Form Submission"
                  style={{ width: '100%', padding: '0.5rem 0.75rem', borderRadius: '4px', border: '1px solid var(--rule-strong)' }}
                />
              </div>

              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.35rem' }}>
                  Content
                </label>
                <textarea
                  required
                  rows={4}
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="Enter detailed announcement message..."
                  style={{ width: '100%', padding: '0.5rem 0.75rem', borderRadius: '4px', border: '1px solid var(--rule-strong)', resize: 'vertical' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.75rem', marginBottom: '1.5rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.35rem' }}>
                    Priority
                  </label>
                  <select
                    value={priority}
                    onChange={(e) => setPriority(e.target.value as 'normal' | 'urgent')}
                    style={{ width: '100%', padding: '0.45rem', borderRadius: '4px', border: '1px solid var(--rule-strong)' }}
                  >
                    <option value="normal">Normal</option>
                    <option value="urgent">Urgent</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.35rem' }}>
                    Audience
                  </label>
                  <select
                    value={targetAudience}
                    onChange={(e) => setTargetAudience(e.target.value as 'all' | 'students' | 'faculty')}
                    style={{ width: '100%', padding: '0.45rem', borderRadius: '4px', border: '1px solid var(--rule-strong)' }}
                  >
                    <option value="all">All Campus</option>
                    <option value="students">Students</option>
                    <option value="faculty">Faculty</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.35rem' }}>
                    Status
                  </label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value as 'draft' | 'published')}
                    style={{ width: '100%', padding: '0.45rem', borderRadius: '4px', border: '1px solid var(--rule-strong)' }}
                  >
                    <option value="published">Publish Now</option>
                    <option value="draft">Save Draft</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  disabled={submitting}
                  className="btn btn-secondary"
                >
                  Cancel
                </button>
                <button type="submit" disabled={submitting} className="btn btn-primary">
                  {submitting ? 'Posting...' : 'Post Announcement'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
