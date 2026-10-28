import { useState, useEffect, useMemo } from 'react';
import {
  Play,
  Pause,
  CheckCircle2,
  Trash2,
  Clock,
  BarChart2,
  Calendar,
  Flame,
  Search,
  BookOpen,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from 'recharts';
import {
  getCurrentStudySession,
  startStudySession,
  pauseStudySession,
  resumeStudySession,
  finishStudySession,
  cancelStudySession,
  getStudyHistory,
  getSubjects,
  CurrentStudySessionResponse,
  StudyHistoryResponse,
  SubjectItem,
} from '../../services/student.service';
import { useToast } from '../../context/ToastContext';
import { PageHeader } from '../../components/PageHeader';

export function StudyTimerPage() {
  const { toast, confirmModal } = useToast();
  const [currentSession, setCurrentSession] = useState<CurrentStudySessionResponse['session'] | null>(null);
  const [history, setHistory] = useState<StudyHistoryResponse | null>(null);
  const [subjects, setSubjects] = useState<SubjectItem[]>([]);
  const [selectedSubjectId, setSelectedSubjectId] = useState('');
  const [sessionTitle, setSessionTitle] = useState('Deep Focus Study Session');

  // Client display ticker (synchronized with server elapsedSeconds)
  const [displaySeconds, setDisplaySeconds] = useState(0);
  const [actionLoading, setActionLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // History search & filters
  const [historySearch, setHistorySearch] = useState('');
  const [historyCourseFilter, setHistoryCourseFilter] = useState('all');

  // Load authoritative server session state (resilient to browser refresh)
  async function syncServerState() {
    try {
      const [currentRes, historyRes, subjectsRes] = await Promise.all([
        getCurrentStudySession(),
        getStudyHistory(),
        getSubjects(),
      ]);

      if (currentRes.active && currentRes.session) {
        setCurrentSession(currentRes.session);
        setDisplaySeconds(currentRes.session.elapsedSeconds);
      } else {
        setCurrentSession(null);
        setDisplaySeconds(0);
      }

      setHistory(historyRes);
      setSubjects(subjectsRes);
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to synchronize study session');
    }
  }

  useEffect(() => {
    syncServerState();
  }, []);

  // Tick the frontend counter only when active
  useEffect(() => {
    if (!currentSession || currentSession.status !== 'active') return;

    const interval = setInterval(() => {
      setDisplaySeconds((prev) => prev + 1);
    }, 1000);

    return () => clearInterval(interval);
  }, [currentSession]);

  async function handleStart() {
    setActionLoading(true);
    setErrorMsg(null);
    try {
      const res = await startStudySession(selectedSubjectId || undefined, sessionTitle.trim() || 'Focus Session');
      setCurrentSession(res.session);
      setDisplaySeconds(0);
      toast.success('Study session started! Focus mode engaged.');
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Could not start session');
      toast.error(err instanceof Error ? err.message : 'Could not start session');
    } finally {
      setActionLoading(false);
    }
  }

  async function handlePause() {
    setActionLoading(true);
    setErrorMsg(null);
    try {
      const res = await pauseStudySession();
      setCurrentSession(res.session);
      if (res.session) {
        setDisplaySeconds(res.session.elapsedSeconds);
      }
      toast.info('Session paused. Paused duration will be deducted.');
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to pause session');
      toast.error(err instanceof Error ? err.message : 'Failed to pause session');
    } finally {
      setActionLoading(false);
    }
  }

  async function handleResume() {
    setActionLoading(true);
    setErrorMsg(null);
    try {
      const res = await resumeStudySession();
      setCurrentSession(res.session);
      if (res.session) {
        setDisplaySeconds(res.session.elapsedSeconds);
      }
      toast.success('Session resumed!');
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to resume session');
      toast.error(err instanceof Error ? err.message : 'Failed to resume session');
    } finally {
      setActionLoading(false);
    }
  }

  async function handleFinish() {
    const ok = await confirmModal({
      title: 'Conclude Study Session',
      message: 'Are you ready to conclude this study session and persist it to your academic ledger?',
      confirmText: 'Finish Session',
    });
    if (!ok) return;
    setActionLoading(true);
    setErrorMsg(null);
    try {
      await finishStudySession();
      setCurrentSession(null);
      setDisplaySeconds(0);
      toast.success('Study session saved to your academic ledger!');
      syncServerState();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to finish session';
      setErrorMsg(msg);
      toast.error(msg);
    } finally {
      setActionLoading(false);
    }
  }

  async function handleCancel() {
    const ok = await confirmModal({
      title: 'Discard Session',
      message: 'Are you sure you want to discard this study session? Paused and elapsed time will not be recorded.',
      confirmText: 'Discard',
      isDestructive: true,
    });
    if (!ok) return;
    setActionLoading(true);
    try {
      await cancelStudySession();
      setCurrentSession(null);
      setDisplaySeconds(0);
      toast.info('Study session discarded');
      syncServerState();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to cancel session';
      setErrorMsg(msg);
      toast.error(msg);
    } finally {
      setActionLoading(false);
    }
  }

  // Format seconds -> HH:MM:SS
  function formatTime(totalSeconds: number) {
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds
      .toString()
      .padStart(2, '0')}`;
  }

  // Generate 7-day focus chart data from session history
  const weeklyChartData = useMemo(() => {
    const days: { day: string; dateStr: string; minutes: number }[] = [];
    const today = new Date();

    for (let i = 6; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      const dayName = d.toLocaleDateString('en-US', { weekday: 'short' });

      days.push({
        day: i === 0 ? 'Today' : dayName,
        dateStr,
        minutes: 0,
      });
    }

    if (history?.data) {
      for (const sess of history.data) {
        if (!sess.endTime) continue;
        const sessDate = sess.endTime.split('T')[0];
        const match = days.find((item) => item.dateStr === sessDate);
        if (match) {
          match.minutes += Math.round(sess.durationSeconds / 60);
        }
      }
    }

    return days;
  }, [history]);

  // Today's total study time
  const todayMinutes = useMemo(() => {
    const todayStr = new Date().toISOString().split('T')[0];
    if (!history?.data) return 0;
    return history.data
      .filter((s) => s.endTime && s.endTime.startsWith(todayStr))
      .reduce((sum, s) => sum + Math.round(s.durationSeconds / 60), 0);
  }, [history]);

  // Filtered history records
  const filteredHistory = useMemo(() => {
    if (!history?.data) return [];
    return history.data.filter((item) => {
      if (historySearch.trim()) {
        const q = historySearch.toLowerCase();
        const matchesTitle = item.title.toLowerCase().includes(q);
        const matchesSubj = item.subjectCode?.toLowerCase().includes(q);
        if (!matchesTitle && !matchesSubj) return false;
      }
      if (historyCourseFilter !== 'all') {
        if (item.subjectCode !== historyCourseFilter) return false;
      }
      return true;
    });
  }, [history, historySearch, historyCourseFilter]);

  const uniqueCourseCodes = useMemo(() => {
    if (!history?.data) return [];
    return Array.from(new Set(history.data.map((s) => s.subjectCode).filter(Boolean))) as string[];
  }, [history]);

  return (
    <div className="container" style={{ padding: '1rem', maxWidth: '1100px', margin: '0 auto' }}>
      <PageHeader
        badge="Authoritative Focus"
        badgeType="gold"
        title="Study Timer & Focus Tracker"
        description="Server-authoritative focus timer resilient to browser reloads. Paused duration is deducted from net study time."
        backTo="/student/dashboard"
        backLabel="Back to Dashboard"
      />

      {errorMsg && (
        <div style={{ maxWidth: '640px', margin: '0 auto 1.5rem', background: 'var(--crimson-soft)', color: 'var(--crimson)', padding: '1rem', borderRadius: '6px' }}>
          {errorMsg}
        </div>
      )}

      {/* Main Timer Display Card */}
      <div
        className="card"
        style={{
          maxWidth: '680px',
          margin: '0 auto 2.5rem',
          padding: '2.5rem 2rem',
          textAlign: 'center',
          boxShadow: 'var(--shadow-lg)',
          borderTop: currentSession?.status === 'active' ? '4px solid var(--emerald)' : '4px solid var(--brand-gold)',
        }}
      >
        <div style={{ marginBottom: '1rem', display: 'flex', justifyContent: 'center' }}>
          <span
            className={`badge ${
              !currentSession
                ? 'badge-gold'
                : currentSession.status === 'active'
                ? 'badge-green'
                : 'badge-gold'
            }`}
            style={{ fontSize: '0.85rem', padding: '0.35rem 0.85rem', display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}
          >
            {!currentSession ? (
              <>
                <Clock size={14} /> Ready to Focus
              </>
            ) : currentSession.status === 'active' ? (
              <>
                <Flame size={14} /> Active Focus Session
              </>
            ) : (
              <>
                <Pause size={14} /> Session Paused
              </>
            )}
          </span>
        </div>

        {/* Big Digital Clock */}
        <div
          style={{
            fontFamily: 'monospace',
            fontSize: 'clamp(3rem, 10vw, 4.5rem)',
            fontWeight: 800,
            letterSpacing: '0.05em',
            color: currentSession?.status === 'active' ? 'var(--emerald)' : 'var(--ink)',
            margin: '0.5rem 0 1.25rem',
            textShadow: currentSession?.status === 'active' ? '0 0 20px rgba(16, 185, 129, 0.2)' : 'none',
          }}
        >
          {formatTime(displaySeconds)}
        </div>

        {currentSession ? (
          <div>
            <h4 style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--ink)', marginBottom: '0.4rem' }}>
              {currentSession.title}
            </h4>
            {currentSession.subjectCode && (
              <span className="badge badge-gold" style={{ marginBottom: '1.25rem', display: 'inline-block' }}>
                Course: {currentSession.subjectCode}
              </span>
            )}

            <div style={{ display: 'flex', justifyContent: 'center', gap: '0.85rem', flexWrap: 'wrap', marginTop: '1.25rem' }}>
              {currentSession.status === 'active' ? (
                <button
                  type="button"
                  onClick={handlePause}
                  disabled={actionLoading}
                  className="btn btn-secondary"
                  style={{ padding: '0.65rem 1.4rem', gap: '0.4rem', fontSize: '0.9rem' }}
                >
                  <Pause size={16} />
                  <span>Pause</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleResume}
                  disabled={actionLoading}
                  className="btn btn-primary"
                  style={{ padding: '0.65rem 1.4rem', gap: '0.4rem', fontSize: '0.9rem' }}
                >
                  <Play size={16} />
                  <span>Resume</span>
                </button>
              )}

              <button
                type="button"
                onClick={handleFinish}
                disabled={actionLoading}
                className="btn btn-primary"
                style={{
                  padding: '0.65rem 1.4rem',
                  gap: '0.4rem',
                  fontSize: '0.9rem',
                  backgroundColor: 'var(--emerald)',
                  borderColor: 'var(--emerald)',
                }}
              >
                <CheckCircle2 size={16} />
                <span>Complete &amp; Save</span>
              </button>

              <button
                type="button"
                onClick={handleCancel}
                disabled={actionLoading}
                className="btn btn-ghost"
                style={{ padding: '0.65rem 1rem', color: 'var(--crimson)', gap: '0.35rem', fontSize: '0.85rem' }}
              >
                <Trash2 size={15} />
                <span>Discard</span>
              </button>
            </div>
          </div>
        ) : (
          <div style={{ maxWidth: '440px', margin: '0 auto', textAlign: 'left' }}>
            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.35rem', color: 'var(--ink)' }}>
                Session Objective / Topic
              </label>
              <input
                type="text"
                value={sessionTitle}
                onChange={(e) => setSessionTitle(e.target.value)}
                placeholder="e.g. Chapter 4 Practice Problems"
                className="input-field"
                style={{ width: '100%' }}
              />
            </div>

            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.35rem', color: 'var(--ink)' }}>
                Course Association (Optional)
              </label>
              <select
                value={selectedSubjectId}
                onChange={(e) => setSelectedSubjectId(e.target.value)}
                className="input-field"
                style={{ width: '100%' }}
              >
                <option value="">-- General Focus Session --</option>
                {subjects.map((s) => (
                  <option key={s._id} value={s._id}>
                    {s.code} — {s.name}
                  </option>
                ))}
              </select>
            </div>

            <button
              type="button"
              onClick={handleStart}
              disabled={actionLoading}
              className="btn btn-primary"
              style={{ width: '100%', padding: '0.85rem', fontSize: '1rem', gap: '0.5rem', justifyContent: 'center' }}
            >
              <Play size={18} />
              <span>{actionLoading ? 'Initializing...' : 'Start Focus Session'}</span>
            </button>
          </div>
        )}
      </div>

      {/* Analytics & Weekly Breakdown Grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 320px), 1fr))',
          gap: '1.5rem',
          marginBottom: '2.5rem',
        }}
      >
        {/* Weekly Focus Bar Chart */}
        <div className="card" style={{ padding: '1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
            <div>
              <h4 style={{ fontSize: '1.05rem', fontWeight: 700, margin: 0, color: 'var(--ink)' }}>
                Weekly Focus Trend
              </h4>
              <span style={{ fontSize: '0.78rem', color: 'var(--ink-soft)' }}>
                Daily study minutes over the last 7 days
              </span>
            </div>
            <BarChart2 size={18} style={{ color: 'var(--brand-gold)' }} />
          </div>

          <div style={{ height: '220px', width: '100%' }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={weeklyChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                <XAxis dataKey="day" stroke="var(--ink-soft)" fontSize={11} tickLine={false} />
                <YAxis stroke="var(--ink-soft)" fontSize={11} tickLine={false} unit="m" />
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload as { day: string; dateStr: string; minutes: number };
                      return (
                        <div
                          style={{
                            backgroundColor: 'var(--surface)',
                            border: '1px solid var(--border)',
                            borderRadius: 'var(--radius-sm)',
                            padding: '0.5rem 0.75rem',
                            boxShadow: 'var(--shadow-md)',
                            fontSize: '0.8rem',
                          }}
                        >
                          <p style={{ margin: 0, fontWeight: 700, color: 'var(--ink)' }}>
                            {data.day} ({data.dateStr})
                          </p>
                          <p style={{ margin: '0.2rem 0 0', color: 'var(--brand-gold)', fontWeight: 600 }}>
                            {data.minutes} focus minutes
                          </p>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Bar dataKey="minutes" fill="var(--brand-gold, #f59e0b)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Focus Metrics Summary Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
          <div className="card" style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
            <div>
              <span style={{ color: 'var(--ink-soft)', fontSize: '0.8rem', fontWeight: 600 }}>Today's Focus</span>
              <h3 style={{ fontSize: '1.8rem', marginTop: '0.25rem', color: 'var(--emerald)' }}>
                {todayMinutes}m
              </h3>
            </div>
            <span style={{ fontSize: '0.75rem', color: 'var(--ink-soft)' }}>
              {(todayMinutes / 60).toFixed(1)} hours completed today
            </span>
          </div>

          <div className="card" style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
            <div>
              <span style={{ color: 'var(--ink-soft)', fontSize: '0.8rem', fontWeight: 600 }}>Total All-Time</span>
              <h3 style={{ fontSize: '1.8rem', marginTop: '0.25rem', color: 'var(--brand-gold)' }}>
                {history?.summary.totalHoursFormatted || '0.0'}h
              </h3>
            </div>
            <span style={{ fontSize: '0.75rem', color: 'var(--ink-soft)' }}>
              {history?.summary.totalMinutes || 0} net minutes recorded
            </span>
          </div>

          <div className="card" style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
            <div>
              <span style={{ color: 'var(--ink-soft)', fontSize: '0.8rem', fontWeight: 600 }}>Total Sessions</span>
              <h3 style={{ fontSize: '1.8rem', marginTop: '0.25rem', color: 'var(--primary)' }}>
                {history?.summary.totalSessions || 0}
              </h3>
            </div>
            <span style={{ fontSize: '0.75rem', color: 'var(--ink-soft)' }}>
              Completed focus sessions
            </span>
          </div>

          <div className="card" style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
            <div>
              <span style={{ color: 'var(--ink-soft)', fontSize: '0.8rem', fontWeight: 600 }}>Avg Session</span>
              <h3 style={{ fontSize: '1.8rem', marginTop: '0.25rem', color: 'var(--ink)' }}>
                {history && history.summary.totalSessions > 0
                  ? Math.round(history.summary.totalMinutes / history.summary.totalSessions)
                  : 0}
                m
              </h3>
            </div>
            <span style={{ fontSize: '0.75rem', color: 'var(--ink-soft)' }}>
              Per completed session
            </span>
          </div>
        </div>
      </div>

      {/* Historical Logs and Analytics Table */}
      <div className="card" style={{ padding: '1.5rem', marginBottom: '2rem' }}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '1.25rem',
            flexWrap: 'wrap',
            gap: '1rem',
          }}
        >
          <div>
            <h3 style={{ fontSize: '1.25rem', color: 'var(--ink)', margin: 0 }}>
              Study Ledger &amp; Focus History
            </h3>
            <p style={{ color: 'var(--ink-soft)', fontSize: '0.82rem', margin: '0.2rem 0 0' }}>
              Authoritative list of completed focus sessions recorded in the database
            </p>
          </div>

          {/* Table Search & Filter Toolbar */}
          <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
            <div style={{ position: 'relative', width: '200px' }}>
              <Search
                size={14}
                style={{ position: 'absolute', left: '0.6rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--ink-soft)' }}
              />
              <input
                type="text"
                value={historySearch}
                onChange={(e) => setHistorySearch(e.target.value)}
                placeholder="Search sessions..."
                className="input-field"
                style={{ paddingLeft: '2rem', fontSize: '0.8rem', width: '100%', padding: '0.3rem 0.6rem 0.3rem 2rem' }}
              />
            </div>

            {uniqueCourseCodes.length > 0 && (
              <select
                value={historyCourseFilter}
                onChange={(e) => setHistoryCourseFilter(e.target.value)}
                className="input-field"
                style={{ fontSize: '0.8rem', padding: '0.3rem 0.6rem' }}
              >
                <option value="all">All Courses</option>
                {uniqueCourseCodes.map((code) => (
                  <option key={code} value={code}>
                    {code}
                  </option>
                ))}
              </select>
            )}
          </div>
        </div>

        {filteredHistory.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '3rem 1rem', color: 'var(--ink-soft)' }}>
            <BookOpen size={32} style={{ color: 'var(--brand-gold)', margin: '0 auto 0.75rem', opacity: 0.7 }} />
            <p style={{ margin: 0, fontSize: '0.9rem' }}>
              {history?.data.length === 0
                ? 'No completed study sessions recorded yet. Start your first focus session above!'
                : 'No sessions matched your filter.'}
            </p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid var(--border)', color: 'var(--ink-soft)' }}>
                  <th style={{ padding: '0.75rem 0.6rem' }}>Session Objective</th>
                  <th style={{ padding: '0.75rem 0.6rem' }}>Course</th>
                  <th style={{ padding: '0.75rem 0.6rem' }}>Net Duration</th>
                  <th style={{ padding: '0.75rem 0.6rem' }}>Completed At</th>
                </tr>
              </thead>
              <tbody>
                {filteredHistory.map((sess) => {
                  const mins = Math.max(1, Math.round(sess.durationSeconds / 60));
                  return (
                    <tr
                      key={sess._id}
                      style={{
                        borderBottom: '1px solid var(--border)',
                        transition: 'background-color 0.15s ease',
                      }}
                    >
                      <td style={{ padding: '0.75rem 0.6rem', fontWeight: 600, color: 'var(--ink)' }}>
                        {sess.title}
                      </td>
                      <td style={{ padding: '0.75rem 0.6rem' }}>
                        {sess.subjectCode ? (
                          <span className="badge badge-gold">{sess.subjectCode}</span>
                        ) : (
                          <span style={{ color: 'var(--ink-soft)' }}>General</span>
                        )}
                      </td>
                      <td style={{ padding: '0.75rem 0.6rem', color: 'var(--emerald)', fontWeight: 700 }}>
                        {mins} {mins === 1 ? 'min' : 'mins'}{' '}
                        <span style={{ fontSize: '0.75rem', fontWeight: 400, color: 'var(--ink-soft)' }}>
                          ({sess.durationSeconds}s)
                        </span>
                      </td>
                      <td style={{ padding: '0.75rem 0.6rem', color: 'var(--ink-soft)' }}>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}>
                          <Calendar size={13} />
                          {new Date(sess.endTime).toLocaleString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
