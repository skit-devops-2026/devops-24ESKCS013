import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  Search,
  LayoutDashboard,
  CalendarCheck,
  BookOpen,
  CheckSquare,
  Target,
  FileText,
  Timer,
  Bell,
  Library,
  Users,
  Megaphone,
  Activity,
  ArrowRight,
  X,
} from 'lucide-react';

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
}

interface PaletteItem {
  id: string;
  label: string;
  category: string;
  path: string;
  icon: React.ReactNode;
  keywords?: string[];
}

export function CommandPalette({ isOpen, onClose }: CommandPaletteProps) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  // Focus input on open
  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  // Global keyboard shortcut Cmd+K / Ctrl+K and Escape
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        if (isOpen) {
          onClose();
        } else {
          // Trigger handled in parent/TopBar or globally
        }
      } else if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Build items based on user role
  const items: PaletteItem[] = [];

  if (user?.role === 'student') {
    items.push(
      {
        id: 'dashboard',
        label: 'Student Dashboard',
        category: 'Overview',
        path: '/student/dashboard',
        icon: <LayoutDashboard size={18} />,
        keywords: ['home', 'overview', 'stats', 'metrics'],
      },
      {
        id: 'attendance',
        label: 'Attendance Intelligence',
        category: 'Overview',
        path: '/student/attendance',
        icon: <CalendarCheck size={18} />,
        keywords: ['bunk', 'calculator', 'percentage', 'classes', 'erp', 'od'],
      },
      {
        id: 'subjects',
        label: 'Enrolled Subjects',
        category: 'Academics',
        path: '/student/subjects',
        icon: <BookOpen size={18} />,
        keywords: ['courses', 'classes', 'credits', 'faculty'],
      },
      {
        id: 'tasks',
        label: 'Assignments & Tasks',
        category: 'Academics',
        path: '/student/tasks',
        icon: <CheckSquare size={18} />,
        keywords: ['todo', 'homework', 'deadlines', 'kanban'],
      },
      {
        id: 'goals',
        label: 'Semester Goals',
        category: 'Academics',
        path: '/student/goals',
        icon: <Target size={18} />,
        keywords: ['milestones', 'targets', 'progress'],
      },
      {
        id: 'notes',
        label: 'Lecture Notes',
        category: 'Academics',
        path: '/student/notes',
        icon: <FileText size={18} />,
        keywords: ['study', 'markdown', 'revision', 'tags'],
      },
      {
        id: 'study',
        label: 'Focus Study Timer',
        category: 'Productivity',
        path: '/student/study',
        icon: <Timer size={18} />,
        keywords: ['pomodoro', 'stopwatch', 'sessions', 'streak'],
      },
      {
        id: 'announcements',
        label: 'Notice Board',
        category: 'Campus',
        path: '/student/announcements',
        icon: <Bell size={18} />,
        keywords: ['bulletins', 'alerts', 'circulars'],
      },
      {
        id: 'resources',
        label: 'Academic Resources',
        category: 'Campus',
        path: '/student/resources',
        icon: <Library size={18} />,
        keywords: ['syllabus', 'pyq', 'lab manuals', 'papers'],
      }
    );
  } else if (user?.role === 'admin') {
    items.push(
      {
        id: 'admin-dash',
        label: 'Admin Console',
        category: 'Administration',
        path: '/admin/dashboard',
        icon: <LayoutDashboard size={18} />,
        keywords: ['overview', 'metrics', 'kpi'],
      },
      {
        id: 'admin-students',
        label: 'Student Directory',
        category: 'Administration',
        path: '/admin/students',
        icon: <Users size={18} />,
        keywords: ['users', 'profiles', 'roll numbers'],
      },
      {
        id: 'admin-notices',
        label: 'Campus Bulletins',
        category: 'Administration',
        path: '/admin/announcements',
        icon: <Megaphone size={18} />,
        keywords: ['broadcast', 'publish', 'alerts'],
      },
      {
        id: 'admin-res',
        label: 'Institutional Resources',
        category: 'Administration',
        path: '/admin/resources',
        icon: <Library size={18} />,
        keywords: ['files', 'links', 'syllabi'],
      },
      {
        id: 'admin-health',
        label: 'System Diagnostics & Health',
        category: 'Administration',
        path: '/admin/health',
        icon: <Activity size={18} />,
        keywords: ['database', 'server', 'uptime', 'mongodb'],
      }
    );
  }

  // Filter items
  const filtered = items.filter((item) => {
    const q = query.toLowerCase().trim();
    if (!q) return true;
    return (
      item.label.toLowerCase().includes(q) ||
      item.category.toLowerCase().includes(q) ||
      item.keywords?.some((k) => k.toLowerCase().includes(q))
    );
  });

  function handleSelect(item: PaletteItem) {
    onClose();
    navigate(item.path);
  }

  function handleInputKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % Math.max(1, filtered.length));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 + filtered.length) % Math.max(1, filtered.length));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filtered[selectedIndex]) {
        handleSelect(filtered[selectedIndex]);
      }
    }
  }

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.6)',
        backdropFilter: 'blur(4px)',
        zIndex: 100,
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'center',
        padding: '10vh 1rem 1rem',
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '560px',
          backgroundColor: 'var(--bg-surface)',
          border: '1px solid var(--border-strong)',
          borderRadius: 'var(--radius-xl)',
          boxShadow: 'var(--shadow-xl)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
            padding: '0.85rem 1.25rem',
            borderBottom: '1px solid var(--border-subtle)',
          }}
        >
          <Search size={20} color="var(--text-muted)" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            onKeyDown={handleInputKeyDown}
            placeholder="Type a page name or keyword to jump..."
            style={{
              flex: 1,
              border: 'none',
              background: 'transparent',
              padding: 0,
              fontSize: '1rem',
              color: 'var(--text-primary)',
              boxShadow: 'none',
            }}
          />
          <button
            onClick={onClose}
            className="btn-icon"
            style={{ width: '28px', height: '28px', border: 'none', background: 'transparent' }}
          >
            <X size={16} />
          </button>
        </div>

        {/* Results list */}
        <div style={{ maxHeight: '360px', overflowY: 'auto', padding: '0.5rem' }}>
          {filtered.length === 0 ? (
            <div
              style={{
                padding: '2rem 1rem',
                textAlign: 'center',
                color: 'var(--text-muted)',
                fontSize: '0.9rem',
              }}
            >
              No matching pages found for "{query}".
            </div>
          ) : (
            filtered.map((item, index) => {
              const isSelected = index === selectedIndex;
              return (
                <div
                  key={item.id}
                  onClick={() => handleSelect(item)}
                  onMouseEnter={() => setSelectedIndex(index)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '0.65rem 0.85rem',
                    borderRadius: 'var(--radius-md)',
                    cursor: 'pointer',
                    backgroundColor: isSelected ? 'var(--accent-primary-soft)' : 'transparent',
                    color: isSelected ? 'var(--accent-primary)' : 'var(--text-primary)',
                    transition: 'all 120ms ease',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <div
                      style={{
                        color: isSelected ? 'var(--accent-primary)' : 'var(--text-secondary)',
                      }}
                    >
                      {item.icon}
                    </div>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{item.label}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        {item.category}
                      </div>
                    </div>
                  </div>
                  {isSelected && <ArrowRight size={16} color="var(--accent-primary)" />}
                </div>
              );
            })
          )}
        </div>

        {/* Footer shortcuts */}
        <div
          style={{
            padding: '0.5rem 1rem',
            borderTop: '1px solid var(--border-subtle)',
            backgroundColor: 'var(--bg-muted)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            fontSize: '0.75rem',
            color: 'var(--text-muted)',
          }}
        >
          <span>Use ↑↓ arrows to navigate</span>
          <span>↵ Enter to select &bull; Esc to close</span>
        </div>
      </div>
    </div>
  );
}
