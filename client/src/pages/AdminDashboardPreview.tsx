import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

export function AdminDashboardPreview() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  async function handleLogout() {
    await logout();
    navigate('/', { replace: true });
  }

  return (
    <div className="container" style={{ padding: '3rem 1rem' }}>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '2.5rem',
          flexWrap: 'wrap',
          gap: '1rem',
        }}
      >
        <div>
          <span className="badge badge-gold" style={{ marginBottom: '0.5rem' }}>
            Administrator Session (RBAC Authorized)
          </span>
          <h1 style={{ fontSize: '2.25rem', color: 'var(--ink)' }}>
            Administration Command Center
          </h1>
          <p style={{ color: 'var(--ink-soft)' }}>
            Logged in as: <strong>{user?.name}</strong> ({user?.email}) &bull; Privilege:{' '}
            <strong>SUPERADMIN</strong>
          </p>
        </div>
        <div>
          <button onClick={handleLogout} className="btn btn-secondary">
            Sign Out
          </button>
        </div>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
          gap: '1.5rem',
          marginBottom: '3rem',
        }}
      >
        <div className="card">
          <span style={{ color: 'var(--ink-soft)', fontSize: '0.85rem' }}>
            Total Enrolled Students
          </span>
          <h2 style={{ fontSize: '2rem', marginTop: '0.5rem', color: 'var(--ink)' }}>1,248</h2>
          <span style={{ fontSize: '0.8rem', color: 'var(--green)' }}>Active in MongoDB</span>
        </div>

        <div className="card">
          <span style={{ color: 'var(--ink-soft)', fontSize: '0.85rem' }}>
            Attendance Flagged (&lt;75%)
          </span>
          <h2 style={{ fontSize: '2rem', marginTop: '0.5rem', color: 'var(--red)' }}>34</h2>
          <span style={{ fontSize: '0.8rem', color: 'var(--red)' }}>Action Required</span>
        </div>

        <div className="card">
          <span style={{ color: 'var(--ink-soft)', fontSize: '0.85rem' }}>
            Academic Curriculums
          </span>
          <h2 style={{ fontSize: '2rem', marginTop: '0.5rem', color: 'var(--ink)' }}>18</h2>
          <span style={{ fontSize: '0.8rem', color: 'var(--ink-soft)' }}>
            Computer Science & IT
          </span>
        </div>

        <div className="card">
          <span style={{ color: 'var(--ink-soft)', fontSize: '0.85rem' }}>System Health</span>
          <h2 style={{ fontSize: '2rem', marginTop: '0.5rem', color: 'var(--green)' }}>Healthy</h2>
          <span style={{ fontSize: '0.8rem', color: 'var(--green)' }}>
            API & Database Synchronized
          </span>
        </div>
      </div>

      <div className="card" style={{ background: '#FFFFFF', padding: '2rem' }}>
        <h3 style={{ fontSize: '1.25rem', marginBottom: '1rem' }}>
          Administrator Management Workflows
        </h3>
        <p style={{ color: 'var(--ink-soft)', marginBottom: '1.5rem', lineHeight: 1.6 }}>
          Administrative access is protected by server-side Role-Based Access Control
          (`requireRole('admin')`). In <strong>Phase 6</strong>, all 9 administrator sub-modules
          will be integrated with persistent MongoDB APIs.
        </p>

        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
          <a
            href="/admin/students.html"
            className="btn btn-secondary"
            style={{ fontSize: '0.85rem' }}
          >
            Preview Student Registry ↗
          </a>
          <a
            href="/admin/announcements.html"
            className="btn btn-secondary"
            style={{ fontSize: '0.85rem' }}
          >
            Preview Announcements Broadcaster ↗
          </a>
          <a
            href="/admin/resources.html"
            className="btn btn-secondary"
            style={{ fontSize: '0.85rem' }}
          >
            Preview Curated Resources ↗
          </a>
        </div>
      </div>
    </div>
  );
}
