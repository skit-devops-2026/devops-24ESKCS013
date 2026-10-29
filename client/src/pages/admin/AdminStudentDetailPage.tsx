import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { AlertTriangle } from 'lucide-react';
import {
  getAdminStudentDetails,
  updateStudentStatus,
  StudentDetailData,
} from '../../services/admin.service';
import { useToast } from '../../context/ToastContext';

export function AdminStudentDetailPage() {
  const { toast, confirmModal } = useToast();
  const { id } = useParams<{ id: string }>();
  const [data, setData] = useState<StudentDetailData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updating, setUpdating] = useState(false);

  async function loadStudent() {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const res = await getAdminStudentDetails(id);
      setData(res);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load student details');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadStudent();
  }, [id]);

  async function handleToggleStatus() {
    if (!data || !id) return;
    const nextStatus = data.student.status === 'active' ? 'suspended' : 'active';
    const ok = await confirmModal({
      title: 'Update Student Status',
      message: `Are you sure you want to mark this account as ${nextStatus.toUpperCase()}?`,
      confirmText: `Set to ${nextStatus}`,
      isDestructive: nextStatus === 'suspended',
    });
    if (!ok) return;

    setUpdating(true);
    try {
      await updateStudentStatus(id, nextStatus);
      toast.success(`Account marked as ${nextStatus}`);
      loadStudent();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Status update failed');
    } finally {
      setUpdating(false);
    }
  }

  if (loading) {
    return (
      <div
        className="container"
        style={{ padding: '3rem 1rem', textAlign: 'center', color: 'var(--ink-soft)' }}
      >
        Loading student record...
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="container" style={{ padding: '3rem 1rem' }}>
        <div
          style={{
            background: 'var(--red-light)',
            color: 'var(--red)',
            padding: '1.5rem',
            borderRadius: '6px',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
          }}
        >
          <AlertTriangle size={18} />
          <span>{error || 'Student record could not be found.'}</span>
        </div>
        <Link to="/admin/students" className="btn btn-secondary" style={{ marginTop: '1rem' }}>
          ← Back to Students Directory
        </Link>
      </div>
    );
  }

  const { student, profile, subjects, taskStats } = data;
  const attendanceRate = profile?.attendancePercentage ?? 0;

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
          <span className="badge badge-gold" style={{ marginBottom: '0.5rem' }}>
            Student Profile Deep Dive
          </span>
          <h1 style={{ fontSize: '2.25rem', color: 'var(--ink)' }}>{student.name}</h1>
          <p style={{ color: 'var(--ink-soft)' }}>
            Roll Number: <strong>{profile?.rollNumber ?? 'Unassigned'}</strong> • {student.email}
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <Link to="/admin/students" className="btn btn-secondary">
            ← Back to Directory
          </Link>
          <button
            onClick={handleToggleStatus}
            disabled={updating}
            className="btn btn-primary"
            style={{
              background: student.status === 'active' ? 'var(--red)' : 'var(--green)',
              borderColor: student.status === 'active' ? 'var(--red)' : 'var(--green)',
            }}
          >
            {updating
              ? 'Updating...'
              : student.status === 'active'
                ? 'Suspend Account'
                : 'Activate Account'}
          </button>
        </div>
      </div>

      {/* Overview Cards */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '1.25rem',
          marginBottom: '2rem',
        }}
      >
        <div className="card">
          <span style={{ color: 'var(--ink-soft)', fontSize: '0.85rem' }}>Account Status</span>
          <h3 style={{ fontSize: '1.5rem', marginTop: '0.35rem' }}>
            <span className={`badge ${student.status === 'active' ? 'badge-green' : 'badge-gold'}`}>
              {student.status.toUpperCase()}
            </span>
          </h3>
          <span style={{ fontSize: '0.8rem', color: 'var(--ink-soft)' }}>
            Enrolled: {new Date(student.createdAt).toLocaleDateString()}
          </span>
        </div>

        <div className="card">
          <span style={{ color: 'var(--ink-soft)', fontSize: '0.85rem' }}>
            Department &amp; Semester
          </span>
          <h3 style={{ fontSize: '1.25rem', marginTop: '0.35rem', color: 'var(--ink)' }}>
            {profile?.department ?? 'N/A'}
          </h3>
          <span style={{ fontSize: '0.8rem', color: 'var(--ink-soft)' }}>
            Semester {profile?.semester ?? '—'}
          </span>
        </div>

        <div className="card">
          <span style={{ color: 'var(--ink-soft)', fontSize: '0.85rem' }}>Attendance Rate</span>
          <h3
            style={{
              fontSize: '1.5rem',
              marginTop: '0.35rem',
              color: attendanceRate >= 75 ? 'var(--green)' : 'var(--red)',
            }}
          >
            {attendanceRate}%
          </h3>
          <span
            style={{
              fontSize: '0.8rem',
              color: attendanceRate >= 75 ? 'var(--green)' : 'var(--red)',
            }}
          >
            {attendanceRate >= 75 ? 'Compliant' : 'Shortage Alert (< 75%)'}
          </span>
        </div>

        <div className="card">
          <span style={{ color: 'var(--ink-soft)', fontSize: '0.85rem' }}>Current GPA</span>
          <h3 style={{ fontSize: '1.5rem', marginTop: '0.35rem', color: 'var(--ink)' }}>
            {profile?.currentGpa ?? '0.00'}
          </h3>
          <span style={{ fontSize: '0.8rem', color: 'var(--ink-soft)' }}>Out of 10.0 scale</span>
        </div>
      </div>

      {/* Task & Work Breakdown */}
      <div className="card" style={{ marginBottom: '2rem', padding: '1.5rem' }}>
        <h3 style={{ fontSize: '1.25rem', marginBottom: '1rem' }}>
          Assignment &amp; Task Progression
        </h3>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
            gap: '1rem',
            textAlign: 'center',
          }}
        >
          <div style={{ padding: '1rem', background: 'var(--bg-muted)', borderRadius: '4px' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--ink-soft)' }}>Total Assigned</span>
            <h4 style={{ fontSize: '1.5rem', marginTop: '0.25rem' }}>{taskStats.total}</h4>
          </div>
          <div style={{ padding: '1rem', background: 'var(--bg-muted)', borderRadius: '4px' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--ink-soft)' }}>Pending</span>
            <h4 style={{ fontSize: '1.5rem', marginTop: '0.25rem', color: 'var(--gold-ink)' }}>
              {taskStats.pending}
            </h4>
          </div>
          <div style={{ padding: '1rem', background: 'var(--bg-muted)', borderRadius: '4px' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--ink-soft)' }}>In Progress</span>
            <h4 style={{ fontSize: '1.5rem', marginTop: '0.25rem', color: 'var(--blue)' }}>
              {taskStats.in_progress}
            </h4>
          </div>
          <div style={{ padding: '1rem', background: 'var(--bg-muted)', borderRadius: '4px' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--ink-soft)' }}>Completed</span>
            <h4 style={{ fontSize: '1.5rem', marginTop: '0.25rem', color: 'var(--green)' }}>
              {taskStats.completed}
            </h4>
          </div>
        </div>
      </div>

      {/* Enrolled Courses */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ padding: '1.25rem', borderBottom: '1px solid var(--border-strong)' }}>
          <h3 style={{ fontSize: '1.25rem', margin: 0 }}>
            Enrolled Academic Courses ({subjects.length})
          </h3>
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table
            style={{
              width: '100%',
              borderCollapse: 'collapse',
              textAlign: 'left',
              fontSize: '0.875rem',
            }}
          >
            <thead
              style={{
                background: 'var(--bg-muted)',
                borderBottom: '1px solid var(--border-strong)',
              }}
            >
              <tr>
                <th style={{ padding: '0.875rem 1rem' }}>Code</th>
                <th style={{ padding: '0.875rem 1rem' }}>Course Title</th>
                <th style={{ padding: '0.875rem 1rem' }}>Faculty</th>
                <th style={{ padding: '0.875rem 1rem' }}>Credits</th>
                <th style={{ padding: '0.875rem 1rem' }}>Attendance</th>
                <th style={{ padding: '0.875rem 1rem' }}>Syllabus</th>
              </tr>
            </thead>
            <tbody>
              {subjects.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    style={{ padding: '2rem', textAlign: 'center', color: 'var(--ink-soft)' }}
                  >
                    No enrolled subjects registered for this student yet.
                  </td>
                </tr>
              ) : (
                subjects.map((sub) => (
                  <tr key={sub.id} style={{ borderBottom: '1px solid var(--rule)' }}>
                    <td style={{ padding: '0.875rem 1rem', fontWeight: 600 }}>{sub.code}</td>
                    <td style={{ padding: '0.875rem 1rem' }}>{sub.name}</td>
                    <td style={{ padding: '0.875rem 1rem', color: 'var(--ink-soft)' }}>
                      {sub.facultyName}
                    </td>
                    <td style={{ padding: '0.875rem 1rem' }}>{sub.credits}</td>
                    <td style={{ padding: '0.875rem 1rem' }}>
                      <span
                        style={{
                          color: sub.attendancePercentage >= 75 ? 'var(--green)' : 'var(--red)',
                          fontWeight: 600,
                        }}
                      >
                        {sub.attendancePercentage}%
                      </span>
                    </td>
                    <td style={{ padding: '0.875rem 1rem' }}>{sub.syllabusProgress}%</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
