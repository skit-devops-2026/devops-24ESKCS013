import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
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
import {
  getAttendance,
  AttendanceSummary,
  AttendanceRecordItem,
} from '../services/attendance.service';

export function StudentDashboardPreview() {
  const { user } = useAuth();

  const [taskSummary, setTaskSummary] = useState<TaskSummary | null>(null);
  const [goalSummary, setGoalSummary] = useState<GoalSummary | null>(null);
  const [subjects, setSubjects] = useState<SubjectItem[]>([]);
  const [studyHistory, setStudyHistory] = useState<StudyHistoryResponse | null>(null);
  const [attendanceSummary, setAttendanceSummary] = useState<AttendanceSummary | null>(null);
  const [attendanceShortages, setAttendanceShortages] = useState<AttendanceRecordItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadDashboardMetrics() {
      try {
        const [tSum, gSum, subs, sHist, attRes] = await Promise.all([
          getTaskSummary(),
          getGoalSummary(),
          getSubjects(),
          getStudyHistory(),
          getAttendance().catch(() => null),
        ]);
        setTaskSummary(tSum);
        setGoalSummary(gSum);
        setSubjects(subs);
        setStudyHistory(sHist);
        if (attRes) {
          setAttendanceSummary(attRes.summary);
          setAttendanceShortages(attRes.shortages);
        }
      } catch (err: unknown) {
        console.error('Error loading dashboard metrics:', err);
      } finally {
        setLoading(false);
      }
    }

    loadDashboardMetrics();
  }, []);

  // Calculate actual attendance average across enrolled subjects
  const avgAttendance =
    subjects.length > 0
      ? Math.round(subjects.reduce((acc, s) => acc + s.attendancePercentage, 0) / subjects.length)
      : user?.profile?.attendancePercentage ?? 0;

  return (
    <div className="container" style={{ padding: '2.5rem 1rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <span className="badge badge-green" style={{ marginBottom: '0.5rem' }}>
            Student Portal
          </span>
          <h1 style={{ fontSize: '2.25rem', color: 'var(--ink)' }}>
            Welcome back, {user?.name}
          </h1>
          <p style={{ color: 'var(--ink-soft)' }}>
            {user?.profile?.rollNumber && (
              <>Roll Number: <strong>{user.profile.rollNumber}</strong> &bull; </>
            )}
            {user?.profile?.department || 'Academics'} (Sem {user?.profile?.semester || 1})
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <Link to="/student/study" className="btn btn-primary">
            ⏱ Start Focus Session
          </Link>
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

        <Link to="/student/attendance" className="card" style={{ textDecoration: 'none' }}>
          <span style={{ color: 'var(--ink-soft)', fontSize: '0.85rem' }}>Attendance Rate</span>
          <h2 style={{ fontSize: '2rem', marginTop: '0.25rem', color: (attendanceSummary?.overallPercentage ?? avgAttendance) >= 75 ? 'var(--green)' : 'var(--red)' }}>
            {loading ? '...' : `${attendanceSummary?.overallPercentage ?? avgAttendance}%`}
          </h2>
          <span style={{ fontSize: '0.8rem', color: (attendanceSummary?.overallPercentage ?? avgAttendance) >= 75 ? 'var(--green)' : 'var(--red)' }}>
            {(attendanceSummary?.overallPercentage ?? avgAttendance) >= 75 ? 'Attendance Compliant' : 'Warning: Below 75%'}
          </span>
          <div style={{ marginTop: '0.25rem', fontSize: '0.75rem', color: 'var(--gold-ink)', fontWeight: 600 }}>
            Open Attendance Intelligence →
          </div>
        </Link>

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

      {/* Attendance Shortage Alert if any subject is below threshold */}
      {attendanceShortages.length > 0 && (
        <div style={{
          backgroundColor: '#fef2f2',
          border: '1px solid #fecaca',
          borderRadius: 'var(--radius)',
          padding: '1.25rem 1.5rem',
          marginBottom: '2.5rem',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '1rem',
        }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
              <span style={{ fontSize: '1.2rem' }}>⚠️</span>
              <strong style={{ color: '#991b1b', fontSize: '1rem' }}>
                Attendance Shortage Detected ({attendanceShortages.length} Subject{attendanceShortages.length > 1 ? 's' : ''})
              </strong>
            </div>
            <p style={{ margin: 0, color: '#b91c1c', fontSize: '0.9rem' }}>
              <strong>{attendanceShortages[0].subjectCode} ({attendanceShortages[0].subjectName})</strong> is at{' '}
              <strong>{attendanceShortages[0].calculatedPercentage}%</strong> (ERP: {attendanceShortages[0].erpPercentage}%).{' '}
              {attendanceShortages[0].classesNeeded > 0
                ? `Requires attending ${attendanceShortages[0].classesNeeded} consecutive classes to reach ${attendanceShortages[0].threshold}% requirement.`
                : 'Action required to maintain eligibility.'}
            </p>
          </div>
          <Link to="/student/attendance" className="btn btn-primary" style={{ backgroundColor: '#dc2626', borderColor: '#b91c1c' }}>
            Open Attendance Intelligence →
          </Link>
        </div>
      )}

      {/* Quick Access Grid to All Student Modules */}
      <div style={{ marginBottom: '2.5rem' }}>
        <h3 style={{ fontSize: '1.25rem', marginBottom: '1rem', color: 'var(--ink)' }}>Academic Toolset (Attendance Intelligence Live)</h3>
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

          <Link to="/student/attendance" className="card" style={{ textDecoration: 'none', borderLeft: '3px solid var(--accent, #d97706)' }}>
            <span style={{ fontSize: '1.5rem', display: 'block', marginBottom: '0.5rem' }}>📊</span>
            <strong style={{ fontSize: '1.1rem', color: 'var(--ink)', display: 'block', marginBottom: '0.25rem' }}>
              Attendance Intelligence
            </strong>
            <p style={{ fontSize: '0.85rem', color: 'var(--ink-soft)' }}>
              ERP paste/CSV ingestion, shortage recovery math &amp; scenario simulations.
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

          <Link to="/student/announcements" className="card" style={{ textDecoration: 'none' }}>
            <span style={{ fontSize: '1.5rem', display: 'block', marginBottom: '0.5rem' }}>📢</span>
            <strong style={{ fontSize: '1.1rem', color: 'var(--ink)', display: 'block', marginBottom: '0.25rem' }}>
              Notice Board
            </strong>
            <p style={{ fontSize: '0.85rem', color: 'var(--ink-soft)' }}>
              Campus notices, urgent examination circulars, and departmental updates.
            </p>
          </Link>

          <Link to="/student/resources" className="card" style={{ textDecoration: 'none' }}>
            <span style={{ fontSize: '1.5rem', display: 'block', marginBottom: '0.5rem' }}>📂</span>
            <strong style={{ fontSize: '1.1rem', color: 'var(--ink)', display: 'block', marginBottom: '0.25rem' }}>
              Resource Library
            </strong>
            <p style={{ fontSize: '0.85rem', color: 'var(--ink-soft)' }}>
              Official curriculum syllabi, lab manuals, and previous year exam papers.
            </p>
          </Link>
        </div>
      </div>
    </div>
  );
}
