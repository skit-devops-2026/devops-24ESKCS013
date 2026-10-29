import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { Menu, Search, Sun, Moon, LogOut } from 'lucide-react';

interface TopBarProps {
  onOpenMobileSidebar: () => void;
  onOpenCommandPalette: () => void;
}

export function TopBar({ onOpenMobileSidebar, onOpenCommandPalette }: TopBarProps) {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();

  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  async function handleLogout() {
    await logout();
    navigate('/', { replace: true });
  }

  if (!user) return null;

  return (
    <header className="app-topbar">
      {/* Left side */}
      <div className="topbar-left">
        <button
          onClick={onOpenMobileSidebar}
          className="btn-icon"
          aria-label="Open navigation menu"
          style={{ display: 'none' }}
          id="mobile-menu-trigger"
        >
          <Menu size={18} />
        </button>

        {/* Global Search / Command Trigger */}
        <div
          className="search-trigger-btn"
          onClick={onOpenCommandPalette}
          title="Search subjects, tasks, notes... (⌘K)"
        >
          <Search size={15} />
          <span>Search portal...</span>
          <span className="kbd-shortcut">⌘K</span>
        </div>
      </div>

      {/* Right side */}
      <div className="topbar-right">
        {/* Theme Toggle */}
        <button
          onClick={toggleTheme}
          className="btn-icon"
          title={`Switch to ${theme === 'light' ? 'Dark' : 'Light'} Mode`}
          aria-label={`Switch to ${theme === 'light' ? 'Dark' : 'Light'} Mode`}
        >
          {theme === 'light' ? <Moon size={18} /> : <Sun size={18} />}
        </button>

        {/* User Profile Dropdown Menu */}
        <div style={{ position: 'relative' }} ref={dropdownRef}>
          <button
            onClick={() => setDropdownOpen((prev) => !prev)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.6rem',
              padding: '0.35rem 0.65rem',
              borderRadius: 'var(--radius-full)',
              background: 'var(--bg-muted)',
              border: '1px solid var(--border-subtle)',
              cursor: 'pointer',
            }}
            aria-expanded={dropdownOpen}
            aria-label="User account menu"
          >
            <div
              style={{
                width: '28px',
                height: '28px',
                borderRadius: '50%',
                background: user.role === 'admin' ? 'var(--gold-soft)' : 'var(--blue-soft)',
                color: user.role === 'admin' ? 'var(--gold-ink)' : 'var(--blue)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 700,
                fontSize: '0.8rem',
              }}
            >
              {user.name.charAt(0).toUpperCase()}
            </div>
            <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)' }}>
              {user.name.split(' ')[0]}
            </span>
          </button>

          {dropdownOpen && (
            <div
              style={{
                position: 'absolute',
                top: 'calc(100% + 8px)',
                right: 0,
                width: '240px',
                background: 'var(--bg-surface)',
                border: '1px solid var(--border-strong)',
                borderRadius: 'var(--radius-lg)',
                boxShadow: 'var(--shadow-xl)',
                padding: '0.75rem',
                zIndex: 60,
                display: 'flex',
                flexDirection: 'column',
                gap: '0.5rem',
              }}
            >
              <div
                style={{
                  padding: '0.25rem 0.5rem',
                  borderBottom: '1px solid var(--border-subtle)',
                  paddingBottom: '0.75rem',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    marginBottom: '0.25rem',
                  }}
                >
                  <span
                    style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text-primary)' }}
                  >
                    {user.name}
                  </span>
                  <span className={`badge ${user.role === 'admin' ? 'badge-gold' : 'badge-green'}`}>
                    {user.role}
                  </span>
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{user.email}</div>
                {user.profile?.rollNumber && (
                  <div
                    style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}
                  >
                    Roll:{' '}
                    <strong style={{ color: 'var(--text-secondary)' }}>
                      {user.profile.rollNumber}
                    </strong>
                  </div>
                )}
              </div>

              <div style={{ padding: '0.25rem 0' }}>
                <div
                  style={{
                    fontSize: '0.75rem',
                    color: 'var(--text-muted)',
                    padding: '0 0.5rem 0.25rem',
                  }}
                >
                  {user.role === 'admin'
                    ? 'Administrative Access'
                    : `${user.profile?.department || 'Academics'} • Sem ${user.profile?.semester || 1}`}
                </div>
              </div>

              <button
                onClick={() => {
                  setDropdownOpen(false);
                  handleLogout();
                }}
                className="btn btn-secondary"
                style={{
                  width: '100%',
                  justifyContent: 'flex-start',
                  color: 'var(--red)',
                  borderColor: 'var(--border-subtle)',
                  padding: '0.5rem 0.75rem',
                }}
              >
                <LogOut size={16} />
                <span>Sign Out</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
