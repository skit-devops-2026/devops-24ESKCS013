import { Link, NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { GraduationCap, Sun, Moon, ArrowRight } from 'lucide-react';

export function Navbar() {
  const { user } = useAuth();
  const { theme, toggleTheme } = useTheme();

  return (
    <header className="navbar">
      <div className="container navbar-inner">
        <Link to="/" className="brand">
          <div
            style={{
              width: '32px',
              height: '32px',
              borderRadius: 'var(--radius-md)',
              background: 'linear-gradient(135deg, var(--gold) 0%, #B45309 100%)',
              color: '#fff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <GraduationCap size={18} />
          </div>
          <span style={{ fontWeight: 700, letterSpacing: '-0.02em' }}>
            <span style={{ color: 'var(--gold)' }}>Student</span>Hub
          </span>
        </Link>

        <nav className="nav-links">
          <NavLink to="/" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
            Home
          </NavLink>
          <a href="/#features" className="nav-link">
            Features
          </a>

          <button
            onClick={toggleTheme}
            className="btn-icon"
            title={`Switch to ${theme === 'light' ? 'Dark' : 'Light'} Mode`}
            aria-label={`Switch to ${theme === 'light' ? 'Dark' : 'Light'} Mode`}
            style={{ marginLeft: '0.5rem' }}
          >
            {theme === 'light' ? <Moon size={16} /> : <Sun size={16} />}
          </button>

          {user ? (
            <Link
              to={user.role === 'admin' ? '/admin/dashboard' : '/student/dashboard'}
              className="btn btn-primary"
              style={{ gap: '0.4rem' }}
            >
              <span>Dashboard</span>
              <ArrowRight size={14} />
            </Link>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginLeft: '0.5rem' }}>
              <Link to="/login" className="btn btn-secondary" style={{ padding: '0.4rem 0.85rem' }}>
                Sign In
              </Link>
              <Link to="/register" className="btn btn-primary" style={{ padding: '0.4rem 0.95rem' }}>
                Register
              </Link>
            </div>
          )}
        </nav>
      </div>
    </header>
  );
}
