import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Users, Megaphone, BookOpen, AlertTriangle } from 'lucide-react';
import { getAdminStats, AdminStats } from '../../services/admin.service';

export function AdminDashboardPage() {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [threshold, setThreshold] = useState(75);

  async function loadMetrics(thresh = threshold) {
    setLoading(true);
    setError(null);
    try {
      const data = await getAdminStats(thresh);
      setStats(data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load system metrics');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadMetrics();
  }, []);

  return (
    <div className="container" style={{ padding: '2.5rem 1rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <span className="badge badge-gold" style={{ marginBottom: '0.5rem' }}>Institutional Control</span>
          <h1 style={{ fontSize: '2.25rem', color: 'var(--ink)' }}>Administrator Console</h1>
          <p style={{ color: 'var(--ink-soft)' }}>
            Real-time academic management, student enrollment audits, and campus notifications.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
          <label style={{ fontSize: '0.85rem', color: 'var(--ink-soft)', fontWeight: 600 }}>
            Attendance Alert Threshold:
          </label>
          <select
            value={threshold}
            onChange={(e) => {
              const val = Number(e.target.value);
              setThreshold(val);
              loadMetrics(val);
            }}
            style={{ padding: '0.4rem 0.6rem', borderRadius: '4px', border: '1px solid var(--rule-strong)' }}
          >
            <option value={80}>80%</option>
            <option value={75}>75% (Standard)</option>
            <option value={70}>70%</option>
            <option value={60}>60% (Critical)</option>
          </select>
          <button onClick={() => loadMetrics()} className="btn btn-secondary" style={{ padding: '0.45rem 0.9rem' }}>
            ↻ Refresh
          </button>
        </div>
      </div>

      {error && (
        <div style={{ background: 'var(--red-light)', color: 'var(--red)', padding: '1rem', borderRadius: '6px', marginBottom: '1.5rem', border: '1px solid var(--red)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <AlertTriangle size={16} />
          <span>{error}</span>
        </div>
      )}

      {/* KPI Cards Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.5rem', marginBottom: '2.5rem' }}>
        <div className="card">
          <span style={{ color: 'var(--ink-soft)', fontSize: '0.85rem' }}>Total Enrolled Students</span>
          <h2 style={{ fontSize: '2.25rem', marginTop: '0.35rem', color: 'var(--ink)' }}>
            {loading ? '...' : stats?.students.total ?? 0}
          </h2>
          <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem', fontSize: '0.8rem' }}>
            <span style={{ color: 'var(--green)', fontWeight: 600 }}>● {stats?.students.active ?? 0} Active</span>
            <span style={{ color: 'var(--red)', fontWeight: 600 }}>● {stats?.students.suspended ?? 0} Suspended</span>
          </div>
        </div>

        <div className="card">
          <span style={{ color: 'var(--ink-soft)', fontSize: '0.85rem' }}>Attendance Defaulters (&lt; {threshold}%)</span>
          <h2 style={{ fontSize: '2.25rem', marginTop: '0.35rem', color: (stats?.attendance.uniqueAffectedStudentsCount ?? 0) > 0 ? 'var(--red)' : 'var(--green)' }}>
            {loading ? '...' : stats?.attendance.uniqueAffectedStudentsCount ?? 0}
          </h2>
          <span style={{ fontSize: '0.8rem', color: 'var(--ink-soft)' }}>
            {stats?.attendance.lowAttendanceSubjectRecordsCount ?? 0} subject-level shortage records
          </span>
        </div>

        <div className="card">
          <span style={{ color: 'var(--ink-soft)', fontSize: '0.85rem' }}>Institutional Resources</span>
          <h2 style={{ fontSize: '2.25rem', marginTop: '0.35rem', color: 'var(--ink)' }}>
            {loading ? '...' : stats?.resources.total ?? 0}
          </h2>
          <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem', fontSize: '0.8rem' }}>
            <span style={{ color: 'var(--green)', fontWeight: 600 }}>● {stats?.resources.published ?? 0} Published</span>
            <span style={{ color: 'var(--ink-soft)' }}>● {stats?.resources.drafts ?? 0} Drafts</span>
          </div>
        </div>

        <div className="card">
          <span style={{ color: 'var(--ink-soft)', fontSize: '0.85rem' }}>Campus Announcements</span>
          <h2 style={{ fontSize: '2.25rem', marginTop: '0.35rem', color: 'var(--ink)' }}>
            {loading ? '...' : stats?.announcements.total ?? 0}
          </h2>
          <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem', fontSize: '0.8rem' }}>
            <span style={{ color: 'var(--green)', fontWeight: 600 }}>● {stats?.announcements.published ?? 0} Live</span>
            <span style={{ color: 'var(--ink-soft)' }}>● {stats?.announcements.drafts ?? 0} Drafts</span>
          </div>
        </div>
      </div>

      {/* Quick Navigation Cards */}
      <h3 style={{ fontSize: '1.25rem', marginBottom: '1.25rem', color: 'var(--ink)' }}>Management Modules</h3>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem' }}>
        <Link to="/admin/students" className="card" style={{ textDecoration: 'none', transition: 'border-color 0.2s ease' }}>
          <div style={{ color: 'var(--brand-gold)', marginBottom: '0.65rem' }}>
            <Users size={28} />
          </div>
          <strong style={{ fontSize: '1.2rem', color: 'var(--ink)', display: 'block', marginBottom: '0.35rem' }}>
            Student Directory &amp; RBAC
          </strong>
          <p style={{ fontSize: '0.875rem', color: 'var(--ink-soft)', margin: 0 }}>
            Inspect student profiles, check course enrollments, filter by department, and manage account activation/suspension.
          </p>
        </Link>

        <Link to="/admin/announcements" className="card" style={{ textDecoration: 'none' }}>
          <div style={{ color: 'var(--brand-gold)', marginBottom: '0.65rem' }}>
            <Megaphone size={28} />
          </div>
          <strong style={{ fontSize: '1.2rem', color: 'var(--ink)', display: 'block', marginBottom: '0.35rem' }}>
            Campus Announcements
          </strong>
          <p style={{ fontSize: '0.875rem', color: 'var(--ink-soft)', margin: 0 }}>
            Publish urgent examination notices, general bulletins, draft internal advisories, and manage publication schedules.
          </p>
        </Link>

        <Link to="/admin/resources" className="card" style={{ textDecoration: 'none' }}>
          <div style={{ color: 'var(--brand-gold)', marginBottom: '0.65rem' }}>
            <BookOpen size={28} />
          </div>
          <strong style={{ fontSize: '1.2rem', color: 'var(--ink)', display: 'block', marginBottom: '0.35rem' }}>
            Resource Library Repository
          </strong>
          <p style={{ fontSize: '0.875rem', color: 'var(--ink-soft)', margin: 0 }}>
            Curate verified academic syllabi, past question papers, and lab manuals with safe HTTP/HTTPS link verification.
          </p>
        </Link>
      </div>
    </div>
  );
}
