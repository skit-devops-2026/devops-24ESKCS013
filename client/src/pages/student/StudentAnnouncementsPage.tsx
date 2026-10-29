import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, Megaphone, Bell } from 'lucide-react';
import { getStudentAnnouncements, StudentAnnouncement } from '../../services/student.service';

export function StudentAnnouncementsPage() {
  const [announcements, setAnnouncements] = useState<StudentAnnouncement[]>([]);
  const [unreadIds, setUnreadIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      setError(null);
      try {
        const data = await getStudentAnnouncements();
        setAnnouncements(data);

        // Track unread notices
        const raw = localStorage.getItem('read_notice_ids');
        const previouslyRead: string[] = raw ? JSON.parse(raw) : [];
        const unread = new Set(
          data.filter((item) => !previouslyRead.includes(item._id)).map((i) => i._id)
        );
        setUnreadIds(unread);

        // Mark all loaded announcements as read
        const allRead = Array.from(new Set([...previouslyRead, ...data.map((d) => d._id)]));
        localStorage.setItem('read_notice_ids', JSON.stringify(allRead));
        window.dispatchEvent(new CustomEvent('notices_read'));
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Failed to load announcements');
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  return (
    <div className="container" style={{ padding: '2.5rem 1rem' }}>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '2rem',
          flexWrap: 'wrap',
          gap: '1rem',
        }}
      >
        <div>
          <span
            className="badge badge-gold"
            style={{
              marginBottom: '0.5rem',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.35rem',
            }}
          >
            <Bell size={13} /> Campus Communications
          </span>
          <h1 style={{ fontSize: '2.25rem', color: 'var(--ink)' }}>Notice Board</h1>
          <p style={{ color: 'var(--ink-soft)' }}>
            Official university bulletins, examination notifications, and departmental
            announcements.
          </p>
        </div>
        <Link to="/student/dashboard" className="btn btn-secondary">
          ← Back to Dashboard
        </Link>
      </div>

      {error && (
        <div
          style={{
            background: 'var(--red-light)',
            color: 'var(--red)',
            padding: '1rem',
            borderRadius: '6px',
            marginBottom: '1.5rem',
            border: '1px solid var(--red)',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
          }}
        >
          <AlertTriangle size={16} />
          <span>{error}</span>
        </div>
      )}

      {loading ? (
        <div
          className="card"
          style={{ padding: '3rem', textAlign: 'center', color: 'var(--ink-soft)' }}
        >
          Loading campus announcements...
        </div>
      ) : announcements.length === 0 ? (
        <div className="card" style={{ padding: '3.5rem 2rem', textAlign: 'center' }}>
          <div
            style={{
              width: '56px',
              height: '56px',
              borderRadius: '50%',
              background: 'var(--gold-soft)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 1.25rem',
              color: 'var(--brand-gold)',
            }}
          >
            <Megaphone size={26} />
          </div>
          <h3 style={{ fontSize: '1.25rem', marginBottom: '0.5rem', color: 'var(--ink)' }}>
            No active notices
          </h3>
          <p style={{ color: 'var(--ink-soft)', maxWidth: '420px', margin: '0 auto' }}>
            There are currently no active announcements published for your department. Check back
            later for campus updates.
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {announcements.map((item) => (
            <div
              key={item._id}
              className="card"
              style={{
                borderLeft:
                  item.priority === 'urgent' ? '4px solid var(--red)' : '4px solid var(--blue)',
                padding: '1.5rem',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  marginBottom: '0.75rem',
                  flexWrap: 'wrap',
                }}
              >
                <span
                  className={`badge ${item.priority === 'urgent' ? 'badge-gold' : 'badge-green'}`}
                  style={{ textTransform: 'uppercase' }}
                >
                  {item.priority}
                </span>
                <span
                  className="badge"
                  style={{ background: 'var(--bg-muted)', color: 'var(--text-muted)' }}
                >
                  Audience: {item.targetAudience.toUpperCase()}
                </span>
                {unreadIds.has(item._id) && (
                  <span
                    className="badge badge-gold"
                    style={{ fontSize: '0.7rem', fontWeight: 700 }}
                  >
                    NEW
                  </span>
                )}
              </div>

              <h3 style={{ fontSize: '1.25rem', marginBottom: '0.5rem', color: 'var(--ink)' }}>
                {item.title}
              </h3>
              <p
                style={{
                  color: 'var(--ink-soft)',
                  lineHeight: 1.6,
                  whiteSpace: 'pre-wrap',
                  marginBottom: '1rem',
                }}
              >
                {item.content}
              </p>

              <div
                style={{
                  fontSize: '0.8rem',
                  color: 'var(--ink-soft)',
                  borderTop: '1px solid var(--rule)',
                  paddingTop: '0.75rem',
                }}
              >
                Issued by <strong>{item.authorId?.name || 'College Administration'}</strong> on{' '}
                {new Date(item.createdAt).toLocaleDateString()}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
