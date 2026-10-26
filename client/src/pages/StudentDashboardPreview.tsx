import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  getTaskSummary,
  getGoalSummary,
  getSubjects,
  getStudyHistory,
  TaskSummary,
  GoalSummary,
  SubjectItem,
  StudyHistoryResponse,
} from '../services/student.service';

export function StudentDashboardPreview() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const [taskSummary, setTaskSummary] = useState<TaskSummary | null>(null);
  const [goalSummary, setGoalSummary] = useState<GoalSummary | null>(null);
  const [subjects, setSubjects] = useState<SubjectItem[]>([]);
  const [studyHistory, setStudyHistory] = useState<StudyHistoryResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadDashboardMetrics() {
      try {
        const [tSum, gSum, subs, sHist] = await Promise.all([
          getTaskSummary(),
          getGoalSummary(),
          getSubjects(),
          getStudyHistory(),
        ]);
        setTaskSummary(tSum);
        setGoalSummary(gSum);
        setSubjects(subs);
        setStudyHistory(sHist);
      } catch (err: unknown) {
        console.error('Error loading dashboard metrics:', err);
      } finally {
        setLoading(false);
      }
    }

    loadDashboardMetrics();
  }, []);

  async function handleLogout() {
    await logout();
    navigate('/', { replace: true });
  }

  // Calculate actual attendance average across enrolled subjects
  const avgAttendance =
    subjects.length > 0
      ? Math.round(subjects.reduce((acc, s) => acc + s.attendancePercentage, 0) / subjects.length)
      : user?.profile?.attendancePercentage || 85;

  return (
    <div className="container" style={{ padding: '2.5rem 1rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <span className="badge badge-green" style={{ marginBottom: '0.5rem' }}>
            Verified Student Session (MongoDB Persisted)
          </span>
          <h1 style={{ fontSize: '2.25rem', color: 'var(--ink)' }}>
            Welcome back, {user?.name}
          </h1>
          <p style={{ color: 'var(--ink-soft)' }}>
            Roll Number: <strong>{user?.profile?.rollNumber || '24ESKCS013'}</strong> &bull; {user?.profile?.department || 'Computer Science'} (Sem {user?.profile?.semester || 1})
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <Link to="/student/study" className="btn btn-primary">
            ⏱ Start Focus Session
          </Link>
          <button onClick={handleLogout} className="btn btn-secondary">
            Sign Out
          </button>
        </div>
      </div>

      {/* Real Live Metrics Tiles */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.25rem', marginBottom: '2.5rem' }}>
        <div className="card">
          <span style={{ color: 'var(--ink-soft)', fontSize: '0.85rem' }}>Enrolled Courses</span>
          <h2 style={{ fontSize: '2rem', marginTop: '0.25rem', color: 'var(--ink)' }}>
            {loading ? '...' : subjects.length}
          </h2>
          <Link to="/student/subjects" style={{ fontSize: '0.8rem', color: 'var(--gold-ink)', fontWeight: 600 }}>
            Manage Subjects →
          </Link>
        </div>

        <div className="card">
          <span style={{ color: 'var(--ink-soft)', fontSize: '0.85rem' }}>Pending Tasks</span>
          <h2 style={{ fontSize: '2rem', marginTop: '0.25rem', color: 'var(--ink)' }}>
            {loading ? '...' : taskSummary?.pending ?? 0}
          </h2>
          <span style={{ fontSize: '0.8rem', color: (taskSummary?.overdue ?? 0) > 0 ? 'var(--red)' : 'var(--green)' }}>
            {taskSummary?.overdue ? `${taskSummary.overdue} overdue tasks` : 'All tasks on schedule'}
          </span>
        </div>

        <div className="card">
          <span style={{ color: 'var(--ink-soft)', fontSize: '0.85rem' }}>Academic Goals</span>
          <h2 style={{ fontSize: '2rem', marginTop: '0.25rem', color: 'var(--ink)' }}>
            {loading ? '...' : `${goalSummary?.completed ?? 0} / ${goalSummary?.total ?? 0}`}
          </h2>
          <span style={{ fontSize: '0.8rem', color: 'var(--green)' }}>
            {goalSummary?.averageProgress ? `${goalSummary.averageProgress}% avg progress` : '0% progress'}
          </span>
        </div>

        <div className="card">
          <span style={{ color: 'var(--ink-soft)', fontSize: '0.85rem' }}>Attendance Rate</span>
          <h2 style={{ fontSize: '2rem', marginTop: '0.25rem', color: avgAttendance >= 75 ? 'var(--green)' : 'var(--red)' }}>
            {loading ? '...' : `${avgAttendance}%`}
          </h2>
          <span style={{ fontSize: '0.8rem', color: avgAttendance >= 75 ? 'var(--green)' : 'var(--red)' }}>
            {avgAttendance >= 75 ? 'Attendance Compliant' : 'Warning: Below 75%'}
          </span>
        </div>

        <div className="card">
          <span style={{ color: 'var(--ink-soft)', fontSize: '0.85rem' }}>Focused Study Time</span>
          <h2 style={{ fontSize: '2rem', marginTop: '0.25rem', color: 'var(--ink)' }}>
            {loading ? '...' : `${studyHistory?.summary.totalHoursFormatted ?? '0.0'}h`}
          </h2>
          <Link to="/student/study" style={{ fontSize: '0.8rem', color: 'var(--gold-ink)', fontWeight: 600 }}>
            Open Focus Timer →
          </Link>
        </div>
      </div>

      {/* Quick Access Grid to All Student Modules */}
      <div style={{ marginBottom: '2.5rem' }}>
        <h3 style={{ fontSize: '1.25rem', marginBottom: '1rem', color: 'var(--ink)' }}>Academic Toolset (Phase 5 Live)</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.25rem' }}>
          <Link to="/student/tasks" className="card" style={{ textDecoration: 'none', transition: 'transform 0.15s ease' }}>
            <span style={{ fontSize: '1.5rem', display: 'block', marginBottom: '0.5rem' }}>📋</span>
            <strong style={{ fontSize: '1.1rem', color: 'var(--ink)', display: 'block', marginBottom: '0.25rem' }}>
              Assignments &amp; Tasks
            </strong>
            <p style={{ fontSize: '0.85rem', color: 'var(--ink-soft)' }}>
              Prioritize homework, filter by due date, and track status workflows.
            </p>
          </Link>

          <Link to="/student/goals" className="card" style={{ textDecoration: 'none' }}>
            <span style={{ fontSize: '1.5rem', display: 'block', marginBottom: '0.5rem' }}>🎯</span>
            <strong style={{ fontSize: '1.1rem', color: 'var(--ink)', display: 'block', marginBottom: '0.25rem' }}>
              Semester Goals
            </strong>
            <p style={{ fontSize: '0.85rem', color: 'var(--ink-soft)' }}>
              Define quantitative milestones with progress bar calculations.
            </p>
          </Link>

          <Link to="/student/subjects" className="card" style={{ textDecoration: 'none' }}>
            <span style={{ fontSize: '1.5rem', display: 'block', marginBottom: '0.5rem' }}>📚</span>
            <strong style={{ fontSize: '1.1rem', color: 'var(--ink)', display: 'block', marginBottom: '0.25rem' }}>
              Enrolled Subjects
            </strong>
            <p style={{ fontSize: '0.85rem', color: 'var(--ink-soft)' }}>
              Curriculum catalog, credit units, faculty details, and attendance tracking.
            </p>
          </Link>

          <Link to="/student/notes" className="card" style={{ textDecoration: 'none' }}>
            <span style={{ fontSize: '1.5rem', display: 'block', marginBottom: '0.5rem' }}>📝</span>
            <strong style={{ fontSize: '1.1rem', color: 'var(--ink)', display: 'block', marginBottom: '0.25rem' }}>
              Lecture Notes
            </strong>
            <p style={{ fontSize: '0.85rem', color: 'var(--ink-soft)' }}>
              Full text search, hashtag indexing, and pinned revision summaries.
            </p>
          </Link>

          <Link to="/student/study" className="card" style={{ textDecoration: 'none' }}>
            <span style={{ fontSize: '1.5rem', display: 'block', marginBottom: '0.5rem' }}>⏱️</span>
            <strong style={{ fontSize: '1.1rem', color: 'var(--ink)', display: 'block', marginBottom: '0.25rem' }}>
              Study Timer
            </strong>
            <p style={{ fontSize: '0.85rem', color: 'var(--ink-soft)' }}>
              Server-authoritative Pomodoro focus sessions resilient to page reloads.
            </p>
          </Link>
        </div>
      </div>
    </div>
  );
}
