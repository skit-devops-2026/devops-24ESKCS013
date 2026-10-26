import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  async function handleLogout() {
    await logout();
    navigate('/', { replace: true });
  }

  return (
    <header className="navbar">
      <div className="container navbar-inner">
        <Link to="/" className="brand">
          <span>Student</span>Hub
        </Link>
        <nav className="nav-links">
          <NavLink to="/" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
            Home
          </NavLink>
          <NavLink to="/health" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
            System Health
          </NavLink>

          {user && user.role === 'student' && (
            <>
              <NavLink to="/student/dashboard" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
                Dashboard
              </NavLink>
              <NavLink to="/student/tasks" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
                Tasks
              </NavLink>
              <NavLink to="/student/goals" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
                Goals
              </NavLink>
              <NavLink to="/student/subjects" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
                Subjects
              </NavLink>
              <NavLink to="/student/notes" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
                Notes
              </NavLink>
              <NavLink to="/student/study" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
                Study Timer
              </NavLink>
            </>
          )}

          {user && user.role === 'admin' && (
            <>
              <NavLink to="/admin/dashboard" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
                Dashboard
              </NavLink>
              <NavLink to="/admin/students" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
                Students
              </NavLink>
              <NavLink to="/admin/announcements" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
                Announcements
              </NavLink>
              <NavLink to="/admin/resources" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
                Resources
              </NavLink>
            </>
          )}

          <a
            href="https://abhimanyu2211.github.io/student-hub/"
            target="_blank"
            rel="noreferrer"
            className="nav-link"
          >
            Static Live Site ↗
          </a>

          {user ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <span className={`badge ${user.role === 'admin' ? 'badge-gold' : 'badge-green'}`}>
                {user.role.toUpperCase()}
              </span>
              <span style={{ fontSize: '0.875rem', fontWeight: 600 }}>{user.name}</span>
              <button
                onClick={handleLogout}
                className="btn btn-secondary"
                style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem' }}
              >
                Sign Out
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <Link to="/login" className="btn btn-secondary" style={{ padding: '0.45rem 0.9rem', fontSize: '0.85rem' }}>
                Sign In
              </Link>
              <Link to="/register" className="btn btn-primary" style={{ padding: '0.45rem 1rem', fontSize: '0.85rem' }}>
                Register
              </Link>
            </div>
          )}
        </nav>
      </div>
    </header>
  );
}
