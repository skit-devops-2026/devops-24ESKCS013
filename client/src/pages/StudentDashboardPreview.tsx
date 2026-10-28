import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import {
  Timer,
  BookOpen,
  CheckSquare,
  Target,
  CalendarCheck,
  FileText,
  Bell,
  Library,
  AlertTriangle,
  ArrowRight,
  Clock,
  UploadCloud,
  CheckCircle2,
  Calendar,
  AlertCircle,
  RefreshCw,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  CartesianGrid,
} from 'recharts';
import {
  getTasks,
  getTaskSummary,
  getGoalSummary,
  getSubjects,
  getStudyHistory,
  TaskItem,
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
import { calculateClassesNeeded, calculateSkippableClasses } from '../utils/attendance-math';
import { Skeleton, SkeletonCard } from '../components/Skeleton';

interface DayStudyData {
  day: string;
  date: string;
  fullDate: string;
  hours: number;
  minutes: number;
}

export function StudentDashboardPreview() {
  const { user } = useAuth();
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const [taskSummary, setTaskSummary] = useState<TaskSummary | null>(null);
  const [goalSummary, setGoalSummary] = useState<GoalSummary | null>(null);
  const [subjects, setSubjects] = useState<SubjectItem[]>([]);
  const [studyHistory, setStudyHistory] = useState<StudyHistoryResponse | null>(null);
  const [attendanceSummary, setAttendanceSummary] = useState<AttendanceSummary | null>(null);
  const [attendanceShortages, setAttendanceShortages] = useState<AttendanceRecordItem[]>([]);
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecordItem[]>([]);
  const [upcomingTasks, setUpcomingTasks] = useState<TaskItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [apiErrors, setApiErrors] = useState<string[]>([]);

  const loadDashboardMetrics = useCallback(async () => {
    setLoading(true);
    const errors: string[] = [];

    try {
      const [tSum, gSum, subs, sHist, attRes, tasksRes] = await Promise.all([
        getTaskSummary().catch(() => {
          errors.push('Tasks Service');
          return null;
        }),
        getGoalSummary().catch(() => {
          errors.push('Goals Service');
          return null;
        }),
        getSubjects().catch(() => {
          errors.push('Subjects Registry');
          return [];
        }),
        getStudyHistory().catch(() => {
          errors.push('Study Session Ledger');
          return null;
        }),
        getAttendance().catch(() => {
          errors.push('Attendance Intelligence');
          return null;
        }),
        getTasks({ status: 'pending' }).catch(() => []),
      ]);

      if (tSum) setTaskSummary(tSum);
      if (gSum) setGoalSummary(gSum);
      if (subs) setSubjects(subs);
      if (sHist) setStudyHistory(sHist);
      if (tasksRes) {
        const sorted = [...tasksRes].sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());
        setUpcomingTasks(sorted.slice(0, 4));
      }
      if (attRes) {
        setAttendanceSummary(attRes.summary);
        setAttendanceShortages(attRes.shortages);
        setAttendanceRecords(attRes.records || []);
      }
      setApiErrors(errors);
    } catch (err: unknown) {
      console.error('Fatal dashboard loading error:', err);
      setApiErrors(['Critical Gateway Connection']);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDashboardMetrics();
  }, [loadDashboardMetrics]);

  // Compute 7-day study time distribution
  const weeklyStudyData: DayStudyData[] = (() => {
    const days: DayStudyData[] = [];
    const today = new Date();
    for (let i = 6; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      const dayName = d.toLocaleDateString('en-US', { weekday: 'short' });
      days.push({
        day: dayName,
        date: dateStr,
        fullDate: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        hours: 0,
        minutes: 0,
      });
    }

    if (studyHistory?.data) {
      for (const session of studyHistory.data) {
        const timestamp = session.endTime || (session as unknown as { startTime?: string }).startTime;
        if (!timestamp) continue;
        const sessionDate = timestamp.split('T')[0];
        const match = days.find((d) => d.date === sessionDate);
        if (match) {
          const mins = Math.round((session.durationSeconds || 0) / 60);
          match.minutes += mins;
          match.hours = Number((match.hours + mins / 60).toFixed(1));
        }
      }
    }

    return days;
  })();

  // Course average attendance calculation (strictly lectures/labs)
  const courseAveragePct = attendanceSummary?.overallPercentage ?? (
    subjects.length > 0
      ? Math.round(subjects.reduce((acc, s) => acc + s.attendancePercentage, 0) / subjects.length)
      : user?.profile?.attendancePercentage ?? 0
  );

  const isAttendanceCompliant = courseAveragePct >= 75;

  // Joined Course Attendance Health (joins Subjects to AttendanceRecords by subjectCode)
  const joinedCourseHealth = (() => {
    if (subjects.length > 0) {
      return subjects.map((sub) => {
        const match = attendanceRecords.find(
          (ar) => ar.subjectCode.trim().toUpperCase() === sub.code.trim().toUpperCase()
        );
        const percentage = match ? match.calculatedPercentage : sub.attendancePercentage;
        const threshold = match?.threshold ?? 75;
        const isShortage = percentage < threshold;
        return {
          id: sub._id,
          code: sub.code,
          name: sub.name,
          percentage,
          totalAttended: match?.totalAttended,
          totalConducted: match?.totalConducted,
          classesNeeded: match
            ? match.classesNeeded
            : (isShortage ? calculateClassesNeeded(percentage, 100, threshold) : 0),
          classesSkippable: match
            ? match.classesSkippable
            : (!isShortage ? calculateSkippableClasses(percentage, 100, threshold) : 0),
          isShortage,
        };
      });
    }

    // Fallback before backfill runs
    return attendanceRecords.map((ar) => ({
      id: ar._id,
      code: ar.subjectCode,
      name: ar.subjectName,
      percentage: ar.calculatedPercentage,
      totalAttended: ar.totalAttended,
      totalConducted: ar.totalConducted,
      classesNeeded: ar.classesNeeded,
      classesSkippable: ar.classesSkippable,
      isShortage: ar.isShortage,
    }));
  })();

  // Detect new account with zero data for onboarding checklist
  const isNewAccount =
    !loading &&
    subjects.length === 0 &&
    attendanceRecords.length === 0 &&
    (!taskSummary || taskSummary.total === 0) &&
    (!goalSummary || goalSummary.total === 0) &&
    (!studyHistory || studyHistory.summary.totalSessions === 0);

  // Pie chart data for attendance composition
  const totalAttended = attendanceSummary?.totalAttended ?? 0;
  const totalConducted = attendanceSummary?.totalConducted ?? 0;
  const totalAbsent = Math.max(0, totalConducted - totalAttended);

  // Theme-aware palette for Recharts
  const chartTokens = {
    grid: isDark ? 'rgba(255, 255, 255, 0.08)' : '#e5e7eb',
    axisText: isDark ? '#a3a3a3' : '#6b7280',
    barFill: '#d97706',
    attendedFill: '#10b981',
    absentFill: '#ef4444',
    tooltipBg: isDark ? '#1a1a1a' : '#ffffff',
    tooltipBorder: isDark ? '#333333' : '#e5e7eb',
    tooltipText: isDark ? '#f5f5f5' : '#111827',
    tooltipSubtext: isDark ? '#9ca3af' : '#6b7280',
  };

  const attendanceDonutData = [
    { name: 'Attended (Present + OD)', value: totalAttended > 0 ? totalAttended : (isAttendanceCompliant ? 75 : courseAveragePct), color: chartTokens.attendedFill },
    { name: 'Absent / Missed', value: totalAbsent > 0 ? totalAbsent : (100 - courseAveragePct), color: chartTokens.absentFill },
  ];

  return (
    <div className="container" style={{ padding: '2rem 1.5rem', maxWidth: '1280px', margin: '0 auto' }}>
      {/* Top Banner / Welcome Chrome */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '1.5rem',
          flexWrap: 'wrap',
          gap: '1.25rem',
          borderBottom: '1px solid var(--border)',
          paddingBottom: '1.5rem',
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.4rem' }}>
            <span className="badge badge-gold" style={{ fontSize: '0.72rem', letterSpacing: '0.04em' }}>
              ACADEMIC COCKPIT
            </span>
            <span style={{ fontSize: '0.8rem', color: 'var(--ink-soft)' }}>
              {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric', year: 'numeric' })}
            </span>
          </div>

          <h1 style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--ink)', margin: 0, letterSpacing: '-0.02em' }}>
            Welcome back, {user?.name || 'Student'}
          </h1>

          <p style={{ color: 'var(--ink-soft)', fontSize: '0.875rem', marginTop: '0.35rem', marginBottom: 0 }}>
            {user?.profile?.rollNumber ? (
              <>
                Roll No: <strong style={{ color: 'var(--ink)' }}>{user.profile.rollNumber}</strong> &bull;{' '}
              </>
            ) : null}
            {user?.profile?.department || 'Computer Science & Engineering'} &bull; Semester {user?.profile?.semester || 5}
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          <Link to="/student/attendance" className="btn btn-secondary" style={{ gap: '0.4rem', fontSize: '0.85rem' }}>
            <UploadCloud size={16} />
            <span>Import ERP</span>
          </Link>
          <Link to="/student/study" className="btn btn-primary" style={{ gap: '0.4rem', fontSize: '0.85rem' }}>
            <Timer size={16} />
            <span>Start Focus Session</span>
          </Link>
        </div>
      </div>

      {/* Partial API Error State Notice */}
      {apiErrors.length > 0 && (
        <div
          style={{
            backgroundColor: 'rgba(217, 119, 6, 0.08)',
            border: '1px solid var(--brand-gold)',
            borderRadius: 'var(--radius-md)',
            padding: '0.85rem 1.25rem',
            marginBottom: '1.5rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '1rem',
            flexWrap: 'wrap',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <AlertTriangle size={18} color="var(--brand-gold)" />
            <span style={{ fontSize: '0.85rem', color: 'var(--ink)' }}>
              Some academic services could not be reached ({apiErrors.join(', ')}). Other metrics are displayed from live data.
            </span>
          </div>
          <button
            onClick={() => loadDashboardMetrics()}
            className="btn btn-secondary"
            style={{ fontSize: '0.75rem', padding: '0.35rem 0.75rem', gap: '0.3rem' }}
          >
            <RefreshCw size={12} />
            <span>Retry</span>
          </button>
        </div>
      )}

      {/* New Account Onboarding / Getting Started Checklist */}
      {isNewAccount && (
        <div
          className="card"
          style={{
            padding: '1.75rem',
            marginBottom: '2rem',
            border: '1px solid var(--brand-gold)',
            background: isDark
              ? 'linear-gradient(135deg, rgba(217, 119, 6, 0.08) 0%, rgba(23, 23, 23, 0.95) 100%)'
              : 'linear-gradient(135deg, rgba(217, 119, 6, 0.05) 0%, rgba(255, 255, 255, 0.95) 100%)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.4rem' }}>
            <span className="badge badge-gold">Quick Setup</span>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--ink)', margin: 0 }}>
              Getting Started Checklist
            </h2>
          </div>
          <p style={{ color: 'var(--ink-soft)', fontSize: '0.88rem', margin: '0 0 1.25rem' }}>
            Welcome to Student Hub! Complete these steps to configure your academic registry, activate attendance shortage detection, and track study time.
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
            <div style={{ padding: '1rem', borderRadius: 'var(--radius-md)', backgroundColor: 'var(--surface)', border: '1px solid var(--border)' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                <span style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--brand-gold)' }}>STEP 1</span>
                <span style={{ fontSize: '0.72rem', color: subjects.length > 0 ? 'var(--emerald)' : 'var(--ink-soft)' }}>
                  {subjects.length > 0 ? (
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.2rem' }}>
                      <CheckCircle2 size={12} /> Completed
                    </span>
                  ) : (
                    'Pending'
                  )}
                </span>
              </div>
              <div style={{ fontWeight: 600, color: 'var(--ink)', fontSize: '0.9rem', marginBottom: '0.25rem' }}>
                Import ERP Attendance
              </div>
              <p style={{ fontSize: '0.78rem', color: 'var(--ink-soft)', margin: '0 0 0.75rem' }}>
                Paste university attendance text to register courses and recovery math.
              </p>
              <Link to="/student/attendance" className="btn btn-secondary" style={{ fontSize: '0.78rem', width: '100%', justifyContent: 'center' }}>
                Import ERP Report
              </Link>
            </div>

            <div style={{ padding: '1rem', borderRadius: 'var(--radius-md)', backgroundColor: 'var(--surface)', border: '1px solid var(--border)' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                <span style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--brand-gold)' }}>STEP 2</span>
                <span style={{ fontSize: '0.72rem', color: (taskSummary?.total ?? 0) > 0 ? 'var(--emerald)' : 'var(--ink-soft)' }}>
                  {(taskSummary?.total ?? 0) > 0 ? (
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.2rem' }}>
                      <CheckCircle2 size={12} /> Completed
                    </span>
                  ) : (
                    'Pending'
                  )}
                </span>
              </div>
              <div style={{ fontWeight: 600, color: 'var(--ink)', fontSize: '0.9rem', marginBottom: '0.25rem' }}>
                Create First Task
              </div>
              <p style={{ fontSize: '0.78rem', color: 'var(--ink-soft)', margin: '0 0 0.75rem' }}>
                Organize assignments, lab work, and exams with priority flags.
              </p>
              <Link to="/student/tasks" className="btn btn-secondary" style={{ fontSize: '0.78rem', width: '100%', justifyContent: 'center' }}>
                Add Assignment
              </Link>
            </div>

            <div style={{ padding: '1rem', borderRadius: 'var(--radius-md)', backgroundColor: 'var(--surface)', border: '1px solid var(--border)' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                <span style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--brand-gold)' }}>STEP 3</span>
                <span style={{ fontSize: '0.72rem', color: (goalSummary?.total ?? 0) > 0 ? 'var(--emerald)' : 'var(--ink-soft)' }}>
                  {(goalSummary?.total ?? 0) > 0 ? (
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.2rem' }}>
                      <CheckCircle2 size={12} /> Completed
                    </span>
                  ) : (
                    'Pending'
                  )}
                </span>
              </div>
              <div style={{ fontWeight: 600, color: 'var(--ink)', fontSize: '0.9rem', marginBottom: '0.25rem' }}>
                Set Semester Goal
              </div>
              <p style={{ fontSize: '0.78rem', color: 'var(--ink-soft)', margin: '0 0 0.75rem' }}>
                Define quantitative targets (SGPA, chapters, DSA problems).
              </p>
              <Link to="/student/goals" className="btn btn-secondary" style={{ fontSize: '0.78rem', width: '100%', justifyContent: 'center' }}>
                Define Goal
              </Link>
            </div>

            <div style={{ padding: '1rem', borderRadius: 'var(--radius-md)', backgroundColor: 'var(--surface)', border: '1px solid var(--border)' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                <span style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--brand-gold)' }}>STEP 4</span>
                <span style={{ fontSize: '0.72rem', color: (studyHistory?.summary.totalSessions ?? 0) > 0 ? 'var(--emerald)' : 'var(--ink-soft)' }}>
                  {(studyHistory?.summary.totalSessions ?? 0) > 0 ? (
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.2rem' }}>
                      <CheckCircle2 size={12} /> Completed
                    </span>
                  ) : (
                    'Pending'
                  )}
                </span>
              </div>
              <div style={{ fontWeight: 600, color: 'var(--ink)', fontSize: '0.9rem', marginBottom: '0.25rem' }}>
                Launch Focus Timer
              </div>
              <p style={{ fontSize: '0.78rem', color: 'var(--ink-soft)', margin: '0 0 0.75rem' }}>
                Start an authoritative Pomodoro focus block to log your study hours.
              </p>
              <Link to="/student/study" className="btn btn-primary" style={{ fontSize: '0.78rem', width: '100%', justifyContent: 'center' }}>
                Start Timer
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* Top 5 Metrics Strip */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))',
          gap: '1rem',
          marginBottom: '2rem',
        }}
      >
        {/* Metric 1: Enrolled Courses */}
        {loading ? (
          <SkeletonCard />
        ) : (
          <div className="card" style={{ padding: '1.25rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
              <span style={{ color: 'var(--ink-soft)', fontSize: '0.8rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Enrolled Courses
              </span>
              <div style={{ padding: '0.4rem', borderRadius: 'var(--radius-md)', backgroundColor: 'var(--surface-muted)', color: 'var(--brand-gold)' }}>
                <BookOpen size={18} />
              </div>
            </div>
            <div style={{ fontSize: '2.1rem', fontWeight: 700, color: 'var(--ink)', lineHeight: 1.1 }}>
              {subjects.length}
            </div>
            <div style={{ marginTop: '0.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.78rem', color: 'var(--ink-soft)' }}>
                {attendanceSummary?.totalSubjects ? `${attendanceSummary.totalSubjects} in ERP` : 'Active curriculum'}
              </span>
              <Link to="/student/subjects" style={{ fontSize: '0.78rem', color: 'var(--brand-gold)', fontWeight: 600, textDecoration: 'none' }}>
                View →
              </Link>
            </div>
          </div>
        )}

        {/* Metric 2: Attendance Rate (Explicitly Labeled) */}
        {loading ? (
          <SkeletonCard />
        ) : (
          <div className="card" style={{ padding: '1.25rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.35rem' }}>
              <span style={{ color: 'var(--ink-soft)', fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Course Average (Lectures/Labs)
              </span>
              <div
                style={{
                  padding: '0.4rem',
                  borderRadius: 'var(--radius-md)',
                  backgroundColor: isAttendanceCompliant ? 'var(--emerald-soft, rgba(16,185,129,0.1))' : 'var(--crimson-soft, rgba(239,68,68,0.1))',
                  color: isAttendanceCompliant ? 'var(--emerald, #10b981)' : 'var(--crimson, #ef4444)',
                }}
              >
                <CalendarCheck size={18} />
              </div>
            </div>
            <div
              style={{
                fontSize: '2.1rem',
                fontWeight: 700,
                color: isAttendanceCompliant ? 'var(--emerald, #10b981)' : 'var(--crimson, #ef4444)',
                lineHeight: 1.1,
              }}
            >
              {courseAveragePct}%
            </div>
            {attendanceSummary?.erpAggregatePercentage !== undefined && (
              <div style={{ fontSize: '0.73rem', color: 'var(--ink-soft)', marginTop: '0.2rem' }}>
                ERP aggregate (incl. event hours): <strong style={{ color: 'var(--ink)' }}>{attendanceSummary.erpAggregatePercentage}%</strong>
              </div>
            )}
            <div style={{ marginTop: '0.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span
                style={{
                  fontSize: '0.76rem',
                  fontWeight: 600,
                  color: isAttendanceCompliant ? 'var(--emerald, #10b981)' : 'var(--crimson, #ef4444)',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.3rem',
                }}
              >
                {isAttendanceCompliant ? (
                  <>
                    <CheckCircle2 size={13} />
                    <span>Above 75% cutoff</span>
                  </>
                ) : (
                  <>
                    <AlertTriangle size={13} />
                    <span>Below 75% cutoff</span>
                  </>
                )}
              </span>
              <Link to="/student/attendance" style={{ fontSize: '0.78rem', color: 'var(--brand-gold)', fontWeight: 600, textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '0.2rem' }}>
                <span>Details</span>
                <ArrowRight size={13} />
              </Link>
            </div>
          </div>
        )}

        {/* Metric 3: Pending Tasks */}
        {loading ? (
          <SkeletonCard />
        ) : (
          <div className="card" style={{ padding: '1.25rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
              <span style={{ color: 'var(--ink-soft)', fontSize: '0.8rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Pending Tasks
              </span>
              <div style={{ padding: '0.4rem', borderRadius: 'var(--radius-md)', backgroundColor: 'var(--surface-muted)', color: 'var(--brand-gold)' }}>
                <CheckSquare size={18} />
              </div>
            </div>
            <div style={{ fontSize: '2.1rem', fontWeight: 700, color: 'var(--ink)', lineHeight: 1.1 }}>
              {taskSummary?.pending ?? 0}
            </div>
            <div style={{ marginTop: '0.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span
                style={{
                  fontSize: '0.78rem',
                  fontWeight: 600,
                  color: (taskSummary?.overdue ?? 0) > 0 ? 'var(--crimson, #ef4444)' : 'var(--emerald, #10b981)',
                }}
              >
                {(taskSummary?.overdue ?? 0) > 0 ? `${taskSummary?.overdue} overdue` : 'All deadlines on track'}
              </span>
              <Link to="/student/tasks" style={{ fontSize: '0.78rem', color: 'var(--brand-gold)', fontWeight: 600, textDecoration: 'none' }}>
                Tasks →
              </Link>
            </div>
          </div>
        )}

        {/* Metric 4: Academic Goals */}
        {loading ? (
          <SkeletonCard />
        ) : (
          <div className="card" style={{ padding: '1.25rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
              <span style={{ color: 'var(--ink-soft)', fontSize: '0.8rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Semester Goals
              </span>
              <div style={{ padding: '0.4rem', borderRadius: 'var(--radius-md)', backgroundColor: 'var(--surface-muted)', color: 'var(--brand-gold)' }}>
                <Target size={18} />
              </div>
            </div>
            <div style={{ fontSize: '2.1rem', fontWeight: 700, color: 'var(--ink)', lineHeight: 1.1 }}>
              {goalSummary?.completed ?? 0}
              <span style={{ fontSize: '1.1rem', fontWeight: 500, color: 'var(--ink-soft)' }}> / {goalSummary?.total ?? 0}</span>
            </div>
            <div style={{ marginTop: '0.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.78rem', color: 'var(--emerald, #10b981)', fontWeight: 600 }}>
                {goalSummary?.averageProgress ? `${goalSummary.averageProgress}% completed` : 'No active milestones'}
              </span>
              <Link to="/student/goals" style={{ fontSize: '0.78rem', color: 'var(--brand-gold)', fontWeight: 600, textDecoration: 'none' }}>
                Goals →
              </Link>
            </div>
          </div>
        )}

        {/* Metric 5: Focus Time */}
        {loading ? (
          <SkeletonCard />
        ) : (
          <div className="card" style={{ padding: '1.25rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
              <span style={{ color: 'var(--ink-soft)', fontSize: '0.8rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Study Focus
              </span>
              <div style={{ padding: '0.4rem', borderRadius: 'var(--radius-md)', backgroundColor: 'var(--surface-muted)', color: 'var(--brand-gold)' }}>
                <Clock size={18} />
              </div>
            </div>
            <div style={{ fontSize: '2.1rem', fontWeight: 700, color: 'var(--ink)', lineHeight: 1.1 }}>
              {studyHistory?.summary.totalHoursFormatted ?? '0.0'}
              <span style={{ fontSize: '1.1rem', fontWeight: 500, color: 'var(--ink-soft)' }}>h</span>
            </div>
            <div style={{ marginTop: '0.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.78rem', color: 'var(--ink-soft)' }}>
                {studyHistory?.summary.totalSessions ?? 0} sessions recorded
              </span>
              <Link to="/student/study" style={{ fontSize: '0.78rem', color: 'var(--brand-gold)', fontWeight: 600, textDecoration: 'none' }}>
                Timer →
              </Link>
            </div>
          </div>
        )}
      </div>

      {/* Attendance Shortage Warning Banner */}
      {!loading && attendanceShortages.length > 0 && (
        <div
          style={{
            backgroundColor: 'var(--crimson-soft, rgba(239, 68, 68, 0.08))',
            border: '1px solid var(--crimson, rgba(239, 68, 68, 0.3))',
            borderRadius: 'var(--radius-lg)',
            padding: '1.25rem 1.5rem',
            marginBottom: '2rem',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '1rem',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.875rem', maxWidth: '850px' }}>
            <div
              style={{
                backgroundColor: 'var(--crimson, #ef4444)',
                color: '#fff',
                padding: '0.4rem',
                borderRadius: 'var(--radius-md)',
                marginTop: '0.15rem',
              }}
            >
              <AlertTriangle size={20} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                <strong style={{ color: 'var(--crimson, #ef4444)', fontSize: '1.05rem', fontWeight: 700 }}>
                  Attendance Shortage Alert ({attendanceShortages.length} Subject{attendanceShortages.length > 1 ? 's' : ''} Below 75%)
                </strong>
                <span
                  style={{
                    backgroundColor: 'rgba(239,68,68,0.15)',
                    color: 'var(--crimson, #ef4444)',
                    padding: '0.15rem 0.5rem',
                    borderRadius: '999px',
                    fontSize: '0.72rem',
                    fontWeight: 700,
                  }}
                >
                  ACTION REQUIRED
                </span>
              </div>
              <p style={{ margin: 0, color: 'var(--ink)', fontSize: '0.9rem', lineHeight: 1.5 }}>
                Course <strong style={{ color: 'var(--crimson, #ef4444)' }}>{attendanceShortages[0].subjectCode} ({attendanceShortages[0].subjectName})</strong> is currently at{' '}
                <strong>{attendanceShortages[0].calculatedPercentage}%</strong>.{' '}
                {attendanceShortages[0].classesNeeded > 0 ? (
                  <>
                    Recovery Math requires attending <strong>{attendanceShortages[0].classesNeeded} consecutive classes</strong> without absence to restore minimum 75% exam eligibility.
                  </>
                ) : (
                  'Immediate attendance compliance required.'
                )}
              </p>
            </div>
          </div>

          <Link
            to="/student/attendance"
            className="btn btn-primary"
            style={{
              backgroundColor: 'var(--crimson, #ef4444)',
              borderColor: 'var(--crimson, #ef4444)',
              color: '#fff',
              fontSize: '0.85rem',
              padding: '0.6rem 1.25rem',
              gap: '0.4rem',
            }}
          >
            <span>Simulate Recovery Plan</span>
            <ArrowRight size={15} />
          </Link>
        </div>
      )}

      {/* Visual Analytics Grid: 2 Charts */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(420px, 1fr))',
          gap: '1.5rem',
          marginBottom: '2rem',
        }}
      >
        {/* Chart 1: Course Attendance Intelligence Composition */}
        <div className="card" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
            <div>
              <h2 style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--ink)', margin: 0 }}>
                Course Attendance Composition (Lectures &amp; Labs)
              </h2>
              <p style={{ fontSize: '0.8rem', color: 'var(--ink-soft)', margin: '0.2rem 0 0' }}>
                Course average (lectures/labs) vs 75% institutional requirement
              </p>
            </div>
            <Link to="/student/attendance" style={{ fontSize: '0.8rem', color: 'var(--brand-gold)', fontWeight: 600, textDecoration: 'none' }}>
              Simulator →
            </Link>
          </div>

          {loading ? (
            <div style={{ height: 220, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Skeleton width="180px" height="180px" borderRadius="50%" />
            </div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-around', flexWrap: 'wrap', gap: '1rem', flex: 1 }}>
              <div style={{ position: 'relative', width: 190, height: 190 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={attendanceDonutData}
                      cx="50%"
                      cy="50%"
                      innerRadius={58}
                      outerRadius={82}
                      paddingAngle={3}
                      dataKey="value"
                      stroke={chartTokens.tooltipBg}
                      strokeWidth={2}
                    >
                      {attendanceDonutData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(val: unknown) => [`${val ?? 0} classes / units`, '']}
                      contentStyle={{
                        backgroundColor: chartTokens.tooltipBg,
                        borderColor: chartTokens.tooltipBorder,
                        borderRadius: 'var(--radius-md)',
                        color: chartTokens.tooltipText,
                        fontSize: '0.8rem',
                        boxShadow: 'var(--shadow-md)',
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
                {/* Center Percentage Display */}
                <div
                  style={{
                    position: 'absolute',
                    top: '50%',
                    left: '50%',
                    transform: 'translate(-50%, -50%)',
                    textAlign: 'center',
                    pointerEvents: 'none',
                  }}
                >
                  <div
                    style={{
                      fontSize: '1.5rem',
                      fontWeight: 800,
                      color: isAttendanceCompliant ? 'var(--emerald, #10b981)' : 'var(--crimson, #ef4444)',
                      lineHeight: 1,
                    }}
                  >
                    {courseAveragePct}%
                  </div>
                  <div style={{ fontSize: '0.65rem', color: 'var(--ink-soft)', textTransform: 'uppercase', fontWeight: 600, marginTop: '0.2rem' }}>
                    Course Average
                  </div>
                </div>
              </div>

              {/* Attendance Breakdown Column */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem', minWidth: '180px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                  <div style={{ width: 12, height: 12, borderRadius: 3, backgroundColor: chartTokens.attendedFill }} />
                  <div>
                    <div style={{ fontSize: '0.78rem', color: 'var(--ink-soft)' }}>Attended (Present + OD)</div>
                    <div style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--ink)' }}>
                      {totalAttended} <span style={{ fontSize: '0.75rem', fontWeight: 400, color: 'var(--ink-soft)' }}>classes</span>
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                  <div style={{ width: 12, height: 12, borderRadius: 3, backgroundColor: chartTokens.absentFill }} />
                  <div>
                    <div style={{ fontSize: '0.78rem', color: 'var(--ink-soft)' }}>Absent / Missed</div>
                    <div style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--ink)' }}>
                      {totalAbsent} <span style={{ fontSize: '0.75rem', fontWeight: 400, color: 'var(--ink-soft)' }}>classes</span>
                    </div>
                  </div>
                </div>

                <div style={{ borderTop: '1px solid var(--border)', paddingTop: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                  <div style={{ width: 12, height: 12, borderRadius: 3, backgroundColor: chartTokens.barFill }} />
                  <div>
                    <div style={{ fontSize: '0.78rem', color: 'var(--ink-soft)' }}>Total Conducted</div>
                    <div style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--ink)' }}>
                      {totalConducted || (totalAttended + totalAbsent)} <span style={{ fontSize: '0.75rem', fontWeight: 400, color: 'var(--ink-soft)' }}>classes</span>
                    </div>
                  </div>
                </div>

                {attendanceSummary?.erpAggregatePercentage !== undefined && (
                  <div style={{ borderTop: '1px dashed var(--border)', paddingTop: '0.5rem', marginTop: '0.2rem' }}>
                    <div style={{ fontSize: '0.72rem', color: 'var(--ink-soft)' }}>
                      ERP aggregate (incl. event hours):
                    </div>
                    <div style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--ink)' }}>
                      {attendanceSummary.erpAggregatePercentage}%
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Chart 2: Weekly Study Focus Bar Chart */}
        <div className="card" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
            <div>
              <h2 style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--ink)', margin: 0 }}>
                Weekly Study Focus
              </h2>
              <p style={{ fontSize: '0.8rem', color: 'var(--ink-soft)', margin: '0.2rem 0 0' }}>
                Daily focus hours over the past 7 days
              </p>
            </div>
            <Link to="/student/study" style={{ fontSize: '0.8rem', color: 'var(--brand-gold)', fontWeight: 600, textDecoration: 'none' }}>
              Open Timer →
            </Link>
          </div>

          {loading ? (
            <div style={{ height: 220, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Skeleton width="100%" height="180px" />
            </div>
          ) : (
            <div style={{ width: '100%', height: 210 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={weeklyStudyData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={chartTokens.grid} opacity={0.8} />
                  <XAxis
                    dataKey="day"
                    stroke={chartTokens.axisText}
                    fontSize={11}
                    tickLine={false}
                    axisLine={{ stroke: chartTokens.grid }}
                  />
                  <YAxis
                    stroke={chartTokens.axisText}
                    fontSize={11}
                    tickLine={false}
                    axisLine={false}
                    unit="h"
                    domain={[0, 'auto']}
                  />
                  <Tooltip
                    cursor={{ fill: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)' }}
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const data = payload[0].payload as DayStudyData;
                        return (
                          <div
                            style={{
                              backgroundColor: chartTokens.tooltipBg,
                              border: `1px solid ${chartTokens.tooltipBorder}`,
                              borderRadius: 'var(--radius-md)',
                              padding: '0.5rem 0.75rem',
                              boxShadow: 'var(--shadow-md)',
                              color: chartTokens.tooltipText,
                              fontSize: '0.78rem',
                            }}
                          >
                            <div style={{ fontWeight: 600, color: chartTokens.tooltipSubtext, marginBottom: '0.2rem' }}>
                              {data.fullDate} ({data.day})
                            </div>
                            <div style={{ fontWeight: 700, color: chartTokens.barFill }}>
                              {data.hours} hours ({data.minutes} mins)
                            </div>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Bar
                    dataKey="hours"
                    fill={chartTokens.barFill}
                    radius={[4, 4, 0, 0]}
                    maxBarSize={36}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </div>

      {/* Two Column Section: Upcoming Deadlines & Joined Subject Attendance Health */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(420px, 1fr))',
          gap: '1.5rem',
          marginBottom: '2rem',
        }}
      >
        {/* Left Column: Upcoming Tasks & Deadlines */}
        <div className="card" style={{ padding: '1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <div style={{ padding: '0.35rem', borderRadius: 'var(--radius-md)', backgroundColor: 'var(--surface-muted)', color: 'var(--brand-gold)' }}>
                <CheckSquare size={16} />
              </div>
              <h2 style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--ink)', margin: 0 }}>
                Upcoming Academic Deadlines
              </h2>
            </div>
            <Link to="/student/tasks" style={{ fontSize: '0.8rem', color: 'var(--brand-gold)', fontWeight: 600, textDecoration: 'none' }}>
              View All ({taskSummary?.pending ?? 0}) →
            </Link>
          </div>

          {loading ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <Skeleton height="2.5rem" />
              <Skeleton height="2.5rem" />
              <Skeleton height="2.5rem" />
            </div>
          ) : upcomingTasks.length === 0 ? (
            <div
              style={{
                textAlign: 'center',
                padding: '2.5rem 1rem',
                backgroundColor: 'var(--surface-muted)',
                borderRadius: 'var(--radius-md)',
                color: 'var(--ink-soft)',
              }}
            >
              <CheckCircle2 size={32} color="var(--emerald, #10b981)" style={{ margin: '0 auto 0.75rem' }} />
              <div style={{ fontWeight: 600, color: 'var(--ink)', fontSize: '0.95rem' }}>All Caught Up!</div>
              <p style={{ fontSize: '0.82rem', margin: '0.25rem 0 1rem' }}>You have no pending assignments or deadlines right now.</p>
              <Link to="/student/tasks" className="btn btn-secondary" style={{ fontSize: '0.8rem' }}>
                Create New Task
              </Link>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
              {upcomingTasks.map((t) => {
                const isOverdue = new Date(t.dueDate).getTime() < Date.now();
                const dueDateFormatted = new Date(t.dueDate).toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                });

                return (
                  <div
                    key={t._id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '0.75rem 0.9rem',
                      borderRadius: 'var(--radius-md)',
                      backgroundColor: 'var(--surface-muted)',
                      border: '1px solid var(--border)',
                      gap: '0.75rem',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', overflow: 'hidden' }}>
                      <div
                        style={{
                          width: 8,
                          height: 8,
                          borderRadius: '50%',
                          backgroundColor:
                            t.priority === 'high'
                              ? 'var(--crimson, #ef4444)'
                              : t.priority === 'medium'
                              ? 'var(--brand-gold)'
                              : 'var(--ink-soft)',
                          flexShrink: 0,
                        }}
                      />
                      <div style={{ overflow: 'hidden' }}>
                        <div
                          style={{
                            fontWeight: 600,
                            color: 'var(--ink)',
                            fontSize: '0.88rem',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                          }}
                        >
                          {t.title}
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.75rem', color: 'var(--ink-soft)' }}>
                          {t.subjectCode && (
                            <span style={{ fontWeight: 600, color: 'var(--brand-gold)' }}>{t.subjectCode}</span>
                          )}
                          <span>&bull;</span>
                          <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', color: isOverdue ? 'var(--crimson, #ef4444)' : 'var(--ink-soft)' }}>
                            <Calendar size={12} />
                            {isOverdue ? `Overdue (${dueDateFormatted})` : `Due ${dueDateFormatted}`}
                          </span>
                        </div>
                      </div>
                    </div>

                    <span
                      style={{
                        padding: '0.2rem 0.5rem',
                        borderRadius: 'var(--radius-sm)',
                        fontSize: '0.7rem',
                        fontWeight: 700,
                        textTransform: 'uppercase',
                        backgroundColor:
                          t.priority === 'high'
                            ? 'rgba(239, 68, 68, 0.12)'
                            : t.priority === 'medium'
                            ? 'rgba(217, 119, 6, 0.12)'
                            : 'var(--surface)',
                        color:
                          t.priority === 'high'
                            ? 'var(--crimson, #ef4444)'
                            : t.priority === 'medium'
                            ? 'var(--brand-gold)'
                            : 'var(--ink-soft)',
                        flexShrink: 0,
                      }}
                    >
                      {t.priority}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right Column: Joined Course Attendance Health */}
        <div className="card" style={{ padding: '1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <div style={{ padding: '0.35rem', borderRadius: 'var(--radius-md)', backgroundColor: 'var(--surface-muted)', color: 'var(--brand-gold)' }}>
                <CalendarCheck size={16} />
              </div>
              <h2 style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--ink)', margin: 0 }}>
                Course Attendance Health
              </h2>
            </div>
            <Link to="/student/attendance" style={{ fontSize: '0.8rem', color: 'var(--brand-gold)', fontWeight: 600, textDecoration: 'none' }}>
              Intelligence →
            </Link>
          </div>

          {loading ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <Skeleton height="2.5rem" />
              <Skeleton height="2.5rem" />
              <Skeleton height="2.5rem" />
            </div>
          ) : joinedCourseHealth.length === 0 ? (
            <div
              style={{
                textAlign: 'center',
                padding: '2.5rem 1rem',
                backgroundColor: 'var(--surface-muted)',
                borderRadius: 'var(--radius-md)',
                color: 'var(--ink-soft)',
              }}
            >
              <AlertCircle size={32} color="var(--brand-gold)" style={{ margin: '0 auto 0.75rem' }} />
              <div style={{ fontWeight: 600, color: 'var(--ink)', fontSize: '0.95rem' }}>No Courses Enrolled</div>
              <p style={{ fontSize: '0.82rem', margin: '0.25rem 0 1rem' }}>Paste your university ERP attendance text or add courses to track attendance.</p>
              <Link to="/student/attendance" className="btn btn-secondary" style={{ fontSize: '0.8rem' }}>
                Import ERP Report
              </Link>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {joinedCourseHealth.slice(0, 4).map((course) => {
                return (
                  <div
                    key={course.id}
                    style={{
                      padding: '0.75rem 0.9rem',
                      borderRadius: 'var(--radius-md)',
                      backgroundColor: 'var(--surface-muted)',
                      border: '1px solid var(--border)',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
                      <div style={{ overflow: 'hidden', paddingRight: '0.5rem' }}>
                        <span style={{ fontWeight: 700, color: 'var(--ink)', fontSize: '0.88rem' }}>
                          {course.code}
                        </span>
                        <span style={{ color: 'var(--ink-soft)', fontSize: '0.8rem', marginLeft: '0.4rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {course.name}
                        </span>
                      </div>
                      <div
                        style={{
                          fontSize: '0.88rem',
                          fontWeight: 700,
                          color: course.isShortage ? 'var(--crimson, #ef4444)' : 'var(--emerald, #10b981)',
                        }}
                      >
                        {course.percentage}%
                      </div>
                    </div>

                    {/* Progress Bar */}
                    <div
                      style={{
                        height: 6,
                        width: '100%',
                        backgroundColor: 'var(--surface)',
                        borderRadius: 3,
                        overflow: 'hidden',
                        position: 'relative',
                      }}
                    >
                      <div
                        style={{
                          height: '100%',
                          width: `${Math.min(100, course.percentage)}%`,
                          backgroundColor: course.isShortage ? 'var(--crimson, #ef4444)' : 'var(--emerald, #10b981)',
                          borderRadius: 3,
                          transition: 'width 0.4s ease',
                        }}
                      />
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.35rem', fontSize: '0.74rem', color: 'var(--ink-soft)' }}>
                      <span>
                        {course.totalAttended !== undefined && course.totalConducted !== undefined
                          ? `Attended: ${course.totalAttended} / ${course.totalConducted} classes`
                          : 'Course percentage from registry'}
                      </span>
                      {course.isShortage ? (
                        <span style={{ color: 'var(--crimson, #ef4444)', fontWeight: 600 }}>
                          Need {course.classesNeeded} classes
                        </span>
                      ) : (
                        <span style={{ color: 'var(--emerald, #10b981)', fontWeight: 600 }}>
                          Safe ({course.classesSkippable} bunks)
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Quick Access Academic Modules Strip */}
      <div style={{ marginBottom: '1.5rem' }}>
        <h2 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--ink)', marginBottom: '0.875rem' }}>
          Explore Student Workspace
        </h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
          <Link
            to="/student/notes"
            className="card card-interactive"
            style={{
              textDecoration: 'none',
              padding: '1rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem',
            }}
          >
            <div style={{ padding: '0.5rem', borderRadius: 'var(--radius-md)', backgroundColor: 'var(--surface-muted)', color: 'var(--brand-gold)' }}>
              <FileText size={18} />
            </div>
            <div>
              <div style={{ fontWeight: 600, color: 'var(--ink)', fontSize: '0.88rem' }}>Lecture Notes</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--ink-soft)' }}>Markdown &amp; tags</div>
            </div>
          </Link>

          <Link
            to="/student/announcements"
            className="card card-interactive"
            style={{
              textDecoration: 'none',
              padding: '1rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem',
            }}
          >
            <div style={{ padding: '0.5rem', borderRadius: 'var(--radius-md)', backgroundColor: 'var(--surface-muted)', color: 'var(--brand-gold)' }}>
              <Bell size={18} />
            </div>
            <div>
              <div style={{ fontWeight: 600, color: 'var(--ink)', fontSize: '0.88rem' }}>Campus Notices</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--ink-soft)' }}>Circulars &amp; exams</div>
            </div>
          </Link>

          <Link
            to="/student/resources"
            className="card card-interactive"
            style={{
              textDecoration: 'none',
              padding: '1rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem',
            }}
          >
            <div style={{ padding: '0.5rem', borderRadius: 'var(--radius-md)', backgroundColor: 'var(--surface-muted)', color: 'var(--brand-gold)' }}>
              <Library size={18} />
            </div>
            <div>
              <div style={{ fontWeight: 600, color: 'var(--ink)', fontSize: '0.88rem' }}>Curriculum Library</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--ink-soft)' }}>PYQs &amp; Syllabi</div>
            </div>
          </Link>
        </div>
      </div>
    </div>
  );
}
