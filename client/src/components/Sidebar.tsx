import { NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
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
  ChevronLeft,
  ChevronRight,
  GraduationCap,
  Shield,
  X,
} from 'lucide-react';

interface SidebarProps {
  collapsed: boolean;
  onToggleCollapse: () => void;
  mobileOpen: boolean;
  onCloseMobile: () => void;
}

export function Sidebar({ collapsed, onToggleCollapse, mobileOpen, onCloseMobile }: SidebarProps) {
  const { user } = useAuth();

  if (!user) return null;

  return (
    <>
      {/* Mobile backdrop */}
      {mobileOpen && <div className="drawer-backdrop" onClick={onCloseMobile} />}

      <aside className={`app-sidebar ${collapsed ? 'collapsed' : ''} ${mobileOpen ? 'mobile-open' : ''}`}>
        {/* Header / Brand */}
        <div className="sidebar-header">
          <div className="sidebar-brand">
            <div className="sidebar-brand-icon">
              {user.role === 'admin' ? <Shield size={18} /> : <GraduationCap size={18} />}
            </div>
            {!collapsed && (
              <span style={{ letterSpacing: '-0.02em' }}>
                <span style={{ color: 'var(--gold)' }}>Student</span>Hub
              </span>
            )}
          </div>

          {/* Mobile close button */}
          <button
            onClick={onCloseMobile}
            className="btn-icon"
            style={{ display: mobileOpen ? 'inline-flex' : 'none' }}
            aria-label="Close menu"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content Navigation */}
        <div className="sidebar-content">
          {user.role === 'student' && (
            <>
              {/* Overview Section */}
              <div className="sidebar-group">
                {!collapsed && <span className="sidebar-group-label">Overview</span>}
                <NavLink
                  to="/student/dashboard"
                  onClick={onCloseMobile}
                  className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
                  title="Dashboard"
                >
                  <LayoutDashboard size={18} />
                  {!collapsed && <span>Dashboard</span>}
                </NavLink>
                <NavLink
                  to="/student/attendance"
                  onClick={onCloseMobile}
                  className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
                  title="Attendance Intelligence"
                >
                  <CalendarCheck size={18} />
                  {!collapsed && <span>Attendance</span>}
                </NavLink>
              </div>

              {/* Academics Section */}
              <div className="sidebar-group">
                {!collapsed && <span className="sidebar-group-label">Academics</span>}
                <NavLink
                  to="/student/subjects"
                  onClick={onCloseMobile}
                  className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
                  title="Enrolled Subjects"
                >
                  <BookOpen size={18} />
                  {!collapsed && <span>Subjects</span>}
                </NavLink>
                <NavLink
                  to="/student/tasks"
                  onClick={onCloseMobile}
                  className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
                  title="Assignments & Tasks"
                >
                  <CheckSquare size={18} />
                  {!collapsed && <span>Tasks</span>}
                </NavLink>
                <NavLink
                  to="/student/goals"
                  onClick={onCloseMobile}
                  className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
                  title="Semester Goals"
                >
                  <Target size={18} />
                  {!collapsed && <span>Goals</span>}
                </NavLink>
                <NavLink
                  to="/student/notes"
                  onClick={onCloseMobile}
                  className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
                  title="Lecture Notes"
                >
                  <FileText size={18} />
                  {!collapsed && <span>Notes</span>}
                </NavLink>
              </div>

              {/* Productivity Section */}
              <div className="sidebar-group">
                {!collapsed && <span className="sidebar-group-label">Productivity</span>}
                <NavLink
                  to="/student/study"
                  onClick={onCloseMobile}
                  className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
                  title="Focus Study Timer"
                >
                  <Timer size={18} />
                  {!collapsed && <span>Focus Timer</span>}
                </NavLink>
              </div>

              {/* Campus Section */}
              <div className="sidebar-group">
                {!collapsed && <span className="sidebar-group-label">Campus</span>}
                <NavLink
                  to="/student/announcements"
                  onClick={onCloseMobile}
                  className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
                  title="Notice Board"
                >
                  <Bell size={18} />
                  {!collapsed && <span>Notices</span>}
                </NavLink>
                <NavLink
                  to="/student/resources"
                  onClick={onCloseMobile}
                  className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
                  title="Resource Library"
                >
                  <Library size={18} />
                  {!collapsed && <span>Resources</span>}
                </NavLink>
              </div>
            </>
          )}

          {user.role === 'admin' && (
            <div className="sidebar-group">
              {!collapsed && <span className="sidebar-group-label">Administration</span>}
              <NavLink
                to="/admin/dashboard"
                onClick={onCloseMobile}
                className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
                title="Admin Dashboard"
              >
                <LayoutDashboard size={18} />
                {!collapsed && <span>Dashboard</span>}
              </NavLink>
              <NavLink
                to="/admin/students"
                onClick={onCloseMobile}
                className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
                title="Student Directory"
              >
                <Users size={18} />
                {!collapsed && <span>Students</span>}
              </NavLink>
              <NavLink
                to="/admin/announcements"
                onClick={onCloseMobile}
                className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
                title="Campus Bulletins"
              >
                <Megaphone size={18} />
                {!collapsed && <span>Bulletins</span>}
              </NavLink>
              <NavLink
                to="/admin/resources"
                onClick={onCloseMobile}
                className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
                title="Institutional Resources"
              >
                <Library size={18} />
                {!collapsed && <span>Resources</span>}
              </NavLink>
              <NavLink
                to="/admin/health"
                onClick={onCloseMobile}
                className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
                title="System Diagnostics"
              >
                <Activity size={18} />
                {!collapsed && <span>Diagnostics</span>}
              </NavLink>
            </div>
          )}
        </div>

        {/* Footer / Collapse Toggle */}
        <div className="sidebar-footer">
          {!collapsed && (
            <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
              <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {user.name}
              </span>
              <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                {user.role === 'admin' ? 'Administrator' : user.profile?.department || 'Student'}
              </span>
            </div>
          )}
          <button
            onClick={onToggleCollapse}
            className="btn-icon"
            title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            style={{ marginLeft: collapsed ? 'auto' : undefined }}
          >
            {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
          </button>
        </div>
      </aside>
    </>
  );
}
