import { useState, useEffect } from 'react';
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
      const res = await startStudySession(selectedSubjectId || undefined, sessionTitle);
      setCurrentSession(res.session);
      setDisplaySeconds(0);
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Could not start session');
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
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to pause session');
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
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to resume session');
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

  return (
    <div className="container" style={{ padding: '2rem 1.5rem', maxWidth: '1100px', margin: '0 auto' }}>
      <PageHeader
        badge="Authoritative Focus"
        badgeType="gold"
        title="Study Timer & Focus Tracker"
        description="Server-synced timer resilient to browser refreshes. Paused duration is deducted from net study time."
      />

      {errorMsg && (
        <div style={{ maxWidth: '640px', margin: '0 auto 1.5rem', background: 'var(--red-soft)', color: 'var(--red)', padding: '1rem', borderRadius: '6px' }}>
          {errorMsg}
        </div>
      )}

      {/* Main Timer Display Card */}
      <div className="card" style={{ maxWidth: '640px', margin: '0 auto 3rem', padding: '3rem 2rem', textAlign: 'center' }}>
        <div style={{ marginBottom: '1rem' }}>
          <span
            className={`badge ${
              !currentSession
                ? 'badge-gold'
                : currentSession.status === 'active'
                ? 'badge-green'
                : 'badge-gold'
            }`}
          >
            {!currentSession ? 'Ready to Focus' : currentSession.status === 'active' ? 'Active Session' : 'Paused Session'}
          </span>
        </div>

        {/* Big Digital Clock */}
        <div
          style={{
            fontFamily: 'monospace',
            fontSize: '4.5rem',
            fontWeight: 700,
            letterSpacing: '0.05em',
            color: currentSession?.status === 'active' ? 'var(--ink)' : 'var(--ink-soft)',
            margin: '1rem 0 1.5rem',
          }}
        >
          {formatTime(displaySeconds)}
        </div>

        {currentSession ? (
          <div>
            <p style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--ink)', marginBottom: '0.5rem' }}>
              {currentSession.title}
            </p>
            {currentSession.subjectCode && (
              <span className="badge badge-gold" style={{ marginBottom: '1.5rem' }}>
                Course: {currentSession.subjectCode}
              </span>
            )}

            <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem', flexWrap: 'wrap', marginTop: '1.5rem' }}>
              {currentSession.status === 'active' ? (
                <button onClick={handlePause} disabled={actionLoading} className="btn btn-secondary" style={{ padding: '0.75rem 1.5rem' }}>
                  ⏸ Pause
                </button>
              ) : (
                <button onClick={handleResume} disabled={actionLoading} className="btn btn-primary" style={{ padding: '0.75rem 1.5rem' }}>
                  ▶ Resume
                </button>
              )}

              <button onClick={handleFinish} disabled={actionLoading} className="btn btn-gold" style={{ padding: '0.75rem 1.5rem' }}>
                ✓ Complete &amp; Save
              </button>

              <button onClick={handleCancel} disabled={actionLoading} style={{ padding: '0.75rem 1.25rem', color: 'var(--red)', fontSize: '0.85rem' }}>
                Discard
              </button>
            </div>
          </div>
        ) : (
          <div style={{ maxWidth: '420px', margin: '0 auto' }}>
            <div style={{ marginBottom: '1rem', textAlign: 'left' }}>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.35rem' }}>
                Session Objective / Topic
              </label>
              <input
                type="text"
                value={sessionTitle}
                onChange={(e) => setSessionTitle(e.target.value)}
                placeholder="e.g. Chapter 4 Practice Problems"
                style={{ width: '100%', padding: '0.5rem 0.75rem', borderRadius: '4px', border: '1px solid var(--rule-strong)' }}
              />
            </div>

            <div style={{ marginBottom: '1.5rem', textAlign: 'left' }}>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.35rem' }}>
                Course Association (Optional)
              </label>
              <select
                value={selectedSubjectId}
                onChange={(e) => setSelectedSubjectId(e.target.value)}
                style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid var(--rule-strong)' }}
              >
                <option value="">-- General Study Session --</option>
                {subjects.map((s) => (
                  <option key={s._id} value={s._id}>
                    {s.code} — {s.name}
                  </option>
                ))}
              </select>
            </div>

            <button onClick={handleStart} disabled={actionLoading} className="btn btn-primary" style={{ width: '100%', padding: '0.85rem', fontSize: '1rem' }}>
              {actionLoading ? 'Initializing...' : '▶ Start Study Session'}
            </button>
          </div>
        )}
      </div>

      {/* Historical Logs and Analytics Table */}
      {history && (
        <div className="card" style={{ maxWidth: '820px', margin: '0 auto', padding: '2rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
            <div>
              <h3 style={{ fontSize: '1.35rem', color: 'var(--ink)' }}>Study Ledger &amp; Focus History</h3>
              <p style={{ color: 'var(--ink-soft)', fontSize: '0.85rem' }}>
                Total Focus Time: <strong>{history.summary.totalHoursFormatted} hours</strong> ({history.summary.totalMinutes} mins across {history.summary.totalSessions} sessions)
              </p>
            </div>
          </div>

          {history.data.length === 0 ? (
            <p style={{ color: 'var(--ink-soft)', textAlign: 'center', padding: '2rem 0' }}>
              No completed study sessions recorded yet. Start your first focus session above!
            </p>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.875rem' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid var(--rule)', color: 'var(--ink-soft)' }}>
                    <th style={{ padding: '0.75rem 0.5rem' }}>Session Title</th>
                    <th style={{ padding: '0.75rem 0.5rem' }}>Course</th>
                    <th style={{ padding: '0.75rem 0.5rem' }}>Net Duration</th>
                    <th style={{ padding: '0.75rem 0.5rem' }}>Completed At</th>
                  </tr>
                </thead>
                <tbody>
                  {history.data.map((sess) => {
                    const mins = Math.max(1, Math.round(sess.durationSeconds / 60));
                    return (
                      <tr key={sess._id} style={{ borderBottom: '1px solid var(--rule)' }}>
                        <td style={{ padding: '0.75rem 0.5rem', fontWeight: 600 }}>{sess.title}</td>
                        <td style={{ padding: '0.75rem 0.5rem' }}>
                          {sess.subjectCode ? <span className="badge badge-gold">{sess.subjectCode}</span> : '—'}
                        </td>
                        <td style={{ padding: '0.75rem 0.5rem', color: 'var(--green)', fontWeight: 600 }}>
                          {mins} {mins === 1 ? 'min' : 'mins'} ({sess.durationSeconds}s)
                        </td>
                        <td style={{ padding: '0.75rem 0.5rem', color: 'var(--ink-faint)' }}>
                          {new Date(sess.endTime).toLocaleString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
