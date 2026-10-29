import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getSubject, SubjectItem, TaskItem, NoteItem } from '../../services/student.service';

export function SubjectDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [subject, setSubject] = useState<
    (SubjectItem & { tasks: TaskItem[]; notes: NoteItem[] }) | null
  >(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      if (!id) return;
      setLoading(true);
      try {
        const data = await getSubject(id);
        setSubject(data);
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Failed to load course details');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [id]);

  if (loading) {
    return (
      <div
        className="container"
        style={{ textAlign: 'center', padding: '6rem 1rem', color: 'var(--ink-soft)' }}
      >
        Loading course syllabus and resources...
      </div>
    );
  }

  if (error || !subject) {
    return (
      <div className="container" style={{ padding: '4rem 1rem', textAlign: 'center' }}>
        <h2 style={{ color: 'var(--red)', marginBottom: '1rem' }}>Subject Not Found</h2>
        <p style={{ color: 'var(--ink-soft)', marginBottom: '1.5rem' }}>
          {error || 'Unable to retrieve course data.'}
        </p>
        <Link to="/student/subjects" className="btn btn-primary">
          ← Back to Subjects
        </Link>
      </div>
    );
  }

  return (
    <div className="container" style={{ padding: '2.5rem 1rem' }}>
      <div style={{ marginBottom: '1.5rem' }}>
        <Link to="/student/subjects" style={{ color: 'var(--ink-soft)', fontSize: '0.875rem' }}>
          ← Back to All Subjects
        </Link>
      </div>

      <div className="card" style={{ padding: '2rem', marginBottom: '2.5rem' }}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            flexWrap: 'wrap',
            gap: '1rem',
          }}
        >
          <div>
            <span className="badge badge-gold" style={{ marginBottom: '0.5rem' }}>
              {subject.code}
            </span>
            <h1 style={{ fontSize: '2.25rem', color: 'var(--ink)' }}>{subject.name}</h1>
            <p style={{ color: 'var(--ink-soft)' }}>
              Faculty: <strong>{subject.facultyName || 'Department Faculty'}</strong> &bull;
              Semester {subject.semester} &bull; {subject.credits} Credits
            </p>
          </div>
          <div style={{ textAlign: 'right' }}>
            <span style={{ fontSize: '0.85rem', color: 'var(--ink-soft)' }}>
              Attendance Compliance
            </span>
            <h2
              style={{
                fontSize: '1.75rem',
                color: subject.attendancePercentage >= 75 ? 'var(--green)' : 'var(--red)',
              }}
            >
              {subject.attendancePercentage}%
            </h2>
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
        {/* Linked Tasks */}
        <div className="card">
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '1.25rem',
            }}
          >
            <h3 style={{ fontSize: '1.25rem' }}>Course Tasks &amp; Homework</h3>
            <Link
              to="/student/tasks"
              className="btn btn-secondary"
              style={{ padding: '0.3rem 0.6rem', fontSize: '0.8rem' }}
            >
              + Manage
            </Link>
          </div>

          {subject.tasks.length === 0 ? (
            <p style={{ color: 'var(--ink-soft)', fontSize: '0.9rem' }}>
              No pending assignments for this subject.
            </p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {subject.tasks.map((t) => (
                <div
                  key={t._id}
                  style={{
                    padding: '0.75rem',
                    background: 'var(--paper)',
                    borderRadius: '6px',
                    fontSize: '0.9rem',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ fontWeight: 600 }}>{t.title}</span>
                    <span className="badge badge-gold">{t.status}</span>
                  </div>
                  <span style={{ fontSize: '0.8rem', color: 'var(--ink-faint)' }}>
                    Due: {new Date(t.dueDate).toLocaleDateString()}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Linked Notes */}
        <div className="card">
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '1.25rem',
            }}
          >
            <h3 style={{ fontSize: '1.25rem' }}>Lecture Notes</h3>
            <Link
              to="/student/notes"
              className="btn btn-secondary"
              style={{ padding: '0.3rem 0.6rem', fontSize: '0.8rem' }}
            >
              + Open Notebook
            </Link>
          </div>

          {subject.notes.length === 0 ? (
            <p style={{ color: 'var(--ink-soft)', fontSize: '0.9rem' }}>
              No lecture notes recorded for this subject yet.
            </p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {subject.notes.map((n) => (
                <div
                  key={n._id}
                  style={{
                    padding: '0.75rem',
                    background: 'var(--paper)',
                    borderRadius: '6px',
                    fontSize: '0.9rem',
                  }}
                >
                  <span style={{ fontWeight: 600, display: 'block', marginBottom: '0.25rem' }}>
                    {n.title}
                  </span>
                  <p
                    style={{
                      fontSize: '0.8rem',
                      color: 'var(--ink-soft)',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {n.content || 'Empty note'}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
