import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Plus, CheckCircle2, AlertTriangle, ArrowRight } from 'lucide-react';
import { useToast } from '../../context/ToastContext';
import { PageHeader } from '../../components/PageHeader';
import { getSubjects, createSubject, deleteSubject, SubjectItem } from '../../services/student.service';

export function SubjectsPage() {
  const { toast, confirmModal } = useToast();
  const [subjects, setSubjects] = useState<SubjectItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modal
  const [showModal, setShowModal] = useState(false);
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [credits, setCredits] = useState(3);
  const [semester, setSemester] = useState(4);
  const [facultyName, setFacultyName] = useState('');
  const [attendancePercentage, setAttendancePercentage] = useState(85);
  const [submitting, setSubmitting] = useState(false);

  async function loadSubjects() {
    setLoading(true);
    setError(null);
    try {
      const data = await getSubjects();
      setSubjects(data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load courses');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadSubjects();
  }, []);

  async function handleDelete(id: string, code: string) {
    const confirmed = await confirmModal({
      title: `Delete Course (${code})`,
      message: `Are you sure you want to delete ${code}? Any associated tasks and notes will remain intact with unlinked course codes.`,
      confirmText: 'Delete Subject',
      isDestructive: true,
    });
    if (!confirmed) return;

    try {
      await deleteSubject(id);
      setSubjects((prev) => prev.filter((s) => s._id !== id));
      toast.success(`${code} removed successfully`);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Delete failed');
    }
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!code.trim() || !name.trim()) return;
    setSubmitting(true);
    try {
      await createSubject({
        code: code.trim().toUpperCase(),
        name: name.trim(),
        credits,
        semester,
        facultyName: facultyName.trim(),
        attendancePercentage,
      });
      setShowModal(false);
      setCode('');
      setName('');
      setFacultyName('');
      toast.success('Course enrolled successfully');
      loadSubjects();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Course creation failed');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="container" style={{ padding: '1rem' }}>
      <PageHeader
        badge="Course Catalog"
        badgeType="gold"
        title="Enrolled Subjects"
        description="Manage curriculum, professors, credit weights, and attendance compliance."
        backTo="/student/dashboard"
        backLabel="Back to Dashboard"
        actions={
          <button onClick={() => setShowModal(true)} className="btn btn-primary" style={{ gap: '0.4rem' }}>
            <Plus size={16} />
            <span>Enroll New Subject</span>
          </button>
        }
      />

      {loading ? (
        <div style={{ textAlign: 'center', padding: '4rem 1rem', color: 'var(--ink-soft)' }}>Loading academic curriculum...</div>
      ) : error ? (
        <div style={{ background: 'var(--red-soft)', color: 'var(--red)', padding: '1rem', borderRadius: '6px' }}>{error}</div>
      ) : subjects.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '4rem 1rem' }}>
          <h3 style={{ fontSize: '1.25rem', marginBottom: '0.5rem' }}>No subjects added yet</h3>
          <p style={{ color: 'var(--ink-soft)', marginBottom: '1.5rem' }}>Add your first enrolled course (e.g. CS301 - Operating Systems).</p>
          <button onClick={() => setShowModal(true)} className="btn btn-secondary">
            + Add Course
          </button>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.5rem' }}>
          {subjects.map((sub) => {
            const isAttendanceSafe = sub.attendancePercentage >= 75;

            return (
              <div key={sub._id} className="card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                    <span className="badge badge-gold">{sub.code}</span>
                    <span style={{ fontSize: '0.85rem', color: 'var(--ink-soft)' }}>Sem {sub.semester} &bull; {sub.credits} Credits</span>
                  </div>

                  <h3 style={{ fontSize: '1.25rem', marginBottom: '0.5rem', color: 'var(--ink)' }}>
                    <Link to={`/student/subjects/${sub._id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                      {sub.name}
                    </Link>
                  </h3>
                  {sub.facultyName && (
                    <p style={{ fontSize: '0.875rem', color: 'var(--ink-soft)', marginBottom: '1rem' }}>
                      Instructor: <strong>{sub.facultyName}</strong>
                    </p>
                  )}

                  <div style={{ background: 'var(--paper)', padding: '0.75rem 1rem', borderRadius: '6px', marginBottom: '1.25rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', alignItems: 'center' }}>
                      <span>Attendance Record</span>
                      <strong style={{ color: isAttendanceSafe ? 'var(--green)' : 'var(--red)', display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}>
                        <span>{sub.attendancePercentage}%</span>
                        {isAttendanceSafe ? <CheckCircle2 size={14} /> : <AlertTriangle size={14} />}
                      </strong>
                    </div>
                  </div>
                </div>

                <div style={{ borderTop: '1px solid var(--rule)', paddingTop: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Link to={`/student/subjects/${sub._id}`} className="btn btn-secondary" style={{ padding: '0.35rem 0.85rem', fontSize: '0.85rem', display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}>
                    <span>View Syllabus &amp; Tasks</span>
                    <ArrowRight size={13} />
                  </Link>
                  <button
                    onClick={() => handleDelete(sub._id, sub.code)}
                    style={{ fontSize: '0.8rem', color: 'var(--red)', cursor: 'pointer' }}
                  >
                    Delete
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: '1rem' }}>
          <div className="card" style={{ maxWidth: '500px', width: '100%', padding: '2rem' }}>
            <h3 style={{ fontSize: '1.5rem', marginBottom: '1.25rem' }}>Enroll New Subject</h3>
            <form onSubmit={handleCreate}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '1rem', marginBottom: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.35rem' }}>Course Code</label>
                  <input
                    type="text"
                    required
                    value={code}
                    onChange={(e) => setCode(e.target.value.toUpperCase())}
                    placeholder="e.g. CS401"
                    style={{ width: '100%', padding: '0.5rem 0.75rem', borderRadius: '4px', border: '1px solid var(--rule-strong)' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.35rem' }}>Subject Name</label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Computer Networks"
                    style={{ width: '100%', padding: '0.5rem 0.75rem', borderRadius: '4px', border: '1px solid var(--rule-strong)' }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.35rem' }}>Credits</label>
                  <input
                    type="number"
                    min={1}
                    max={10}
                    value={credits}
                    onChange={(e) => setCredits(Number(e.target.value))}
                    style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid var(--rule-strong)' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.35rem' }}>Semester</label>
                  <select
                    value={semester}
                    onChange={(e) => setSemester(Number(e.target.value))}
                    style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid var(--rule-strong)' }}
                  >
                    {[1, 2, 3, 4, 5, 6, 7, 8].map((s) => (
                      <option key={s} value={s}>
                        Semester {s}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.35rem' }}>Instructor / Faculty</label>
                  <input
                    type="text"
                    value={facultyName}
                    onChange={(e) => setFacultyName(e.target.value)}
                    placeholder="e.g. Prof. Alan Turing"
                    style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid var(--rule-strong)' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.35rem' }}>Attendance %</label>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    value={attendancePercentage}
                    onChange={(e) => setAttendancePercentage(Number(e.target.value))}
                    style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid var(--rule-strong)' }}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                <button type="button" onClick={() => setShowModal(false)} className="btn btn-secondary">
                  Cancel
                </button>
                <button type="submit" disabled={submitting} className="btn btn-primary">
                  {submitting ? 'Enrolling...' : 'Save Subject'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
