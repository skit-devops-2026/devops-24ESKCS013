import React, { useState, useEffect } from 'react';
import { Plus, Target, CheckCircle2, Clock, Sparkles, Trash2 } from 'lucide-react';
import { useToast } from '../../context/ToastContext';
import { PageHeader } from '../../components/PageHeader';
import {
  getGoals,
  getGoalSummary,
  createGoal,
  updateGoal,
  deleteGoal,
  getSubjects,
  GoalItem,
  GoalSummary,
  SubjectItem,
} from '../../services/student.service';

export function GoalsPage() {
  const { toast, confirmModal } = useToast();
  const [goals, setGoals] = useState<GoalItem[]>([]);
  const [summary, setSummary] = useState<GoalSummary | null>(null);
  const [subjects, setSubjects] = useState<SubjectItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Form modal
  const [showModal, setShowModal] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [targetValue, setTargetValue] = useState(100);
  const [currentValue, setCurrentValue] = useState(0);
  const [unit, setUnit] = useState('%');
  const [category, setCategory] = useState('Academic');
  const [subjectId, setSubjectId] = useState('');
  const [autoLinkMetric, setAutoLinkMetric] = useState<'none' | 'attendance' | 'task_completion' | 'study_hours'>('none');
  const [targetDate, setTargetDate] = useState(() => {
    const d = new Date(Date.now() + 30 * 86400000);
    return d.toISOString().split('T')[0];
  });
  const [submitting, setSubmitting] = useState(false);

  async function loadData() {
    setLoading(true);
    setError(null);
    try {
      const [goalsData, summaryData, subjectsData] = await Promise.all([
        getGoals(),
        getGoalSummary(),
        getSubjects(),
      ]);
      setGoals(goalsData);
      setSummary(summaryData);
      setSubjects(subjectsData);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load goals');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  async function handleIncrement(goal: GoalItem, amount: number) {
    const nextVal = Math.min(goal.targetValue, goal.currentValue + amount);
    try {
      const updated = await updateGoal(goal._id, { currentValue: nextVal });
      setGoals((prev) => prev.map((g) => (g._id === updated._id ? updated : g)));
      const newSummary = await getGoalSummary();
      setSummary(newSummary);
      toast.success(`Progress updated (+${amount} ${goal.unit})`);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Progress update failed');
    }
  }

  async function handleDelete(id: string) {
    const confirmed = await confirmModal({
      title: 'Delete Goal',
      message: 'Are you sure you want to delete this goal? This action cannot be undone.',
      confirmText: 'Delete Goal',
      isDestructive: true,
    });
    if (!confirmed) return;

    try {
      await deleteGoal(id);
      setGoals((prev) => prev.filter((g) => g._id !== id));
      const newSummary = await getGoalSummary();
      setSummary(newSummary);
      toast.success('Goal deleted');
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Delete failed');
    }
  }

  function handleAutoLinkChange(val: 'none' | 'attendance' | 'task_completion' | 'study_hours') {
    setAutoLinkMetric(val);
    if (val === 'attendance') {
      setUnit('%');
      setTargetValue(85);
      setCategory('Attendance');
    } else if (val === 'task_completion') {
      setUnit('tasks');
      setTargetValue(10);
      setCategory('Academic');
    } else if (val === 'study_hours') {
      setUnit('hrs');
      setTargetValue(20);
      setCategory('Academic');
    }
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    setSubmitting(true);
    try {
      const parsedDate = targetDate ? new Date(targetDate) : new Date(Date.now() + 30 * 86400000);
      const safeTargetDate = isNaN(parsedDate.getTime())
        ? new Date(Date.now() + 30 * 86400000).toISOString()
        : parsedDate.toISOString();

      await createGoal({
        title: title.trim(),
        description: description.trim(),
        targetValue,
        currentValue,
        unit,
        category,
        subjectId: subjectId || null,
        autoLinkMetric,
        targetDate: safeTargetDate,
      });

      setShowModal(false);
      setTitle('');
      setDescription('');
      setAutoLinkMetric('none');
      setSubjectId('');
      toast.success('Goal created successfully');
      loadData();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Goal creation failed');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="container" style={{ padding: '1rem' }}>
      <PageHeader
        badge="Semester Milestones"
        badgeType="gold"
        title="Academic Goals"
        description="Set quantitative benchmarks, auto-track metrics from live attendance, tasks, or study sessions, and celebrate achievements."
        backTo="/student/dashboard"
        backLabel="Back to Dashboard"
        actions={
          <button onClick={() => setShowModal(true)} className="btn btn-primary" style={{ gap: '0.4rem' }}>
            <Plus size={16} />
            <span>Set New Goal</span>
          </button>
        }
      />

      {summary && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
          <div className="card" style={{ padding: '1.25rem' }}>
            <span style={{ color: 'var(--ink-soft)', fontSize: '0.85rem' }}>Total Goals</span>
            <h3 style={{ fontSize: '1.75rem', marginTop: '0.25rem' }}>{summary.total}</h3>
          </div>
          <div className="card" style={{ padding: '1.25rem' }}>
            <span style={{ color: 'var(--ink-soft)', fontSize: '0.85rem' }}>In Progress</span>
            <h3 style={{ fontSize: '1.75rem', marginTop: '0.25rem', color: 'var(--brand-gold)' }}>{summary.active}</h3>
          </div>
          <div className="card" style={{ padding: '1.25rem' }}>
            <span style={{ color: 'var(--ink-soft)', fontSize: '0.85rem' }}>Completed</span>
            <h3 style={{ fontSize: '1.75rem', marginTop: '0.25rem', color: 'var(--emerald)' }}>{summary.completed}</h3>
          </div>
          <div className="card" style={{ padding: '1.25rem' }}>
            <span style={{ color: 'var(--ink-soft)', fontSize: '0.85rem' }}>Average Progress</span>
            <h3 style={{ fontSize: '1.75rem', marginTop: '0.25rem', color: 'var(--ink)' }}>{summary.averageProgress}%</h3>
          </div>
        </div>
      )}

      {loading ? (
        <div style={{ textAlign: 'center', padding: '4rem 1rem', color: 'var(--ink-soft)' }}>
          Loading your academic milestones...
        </div>
      ) : error ? (
        <div style={{ background: 'var(--crimson-soft)', color: 'var(--crimson)', padding: '1rem', borderRadius: '6px' }}>
          {error}
        </div>
      ) : goals.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '4rem 1rem' }}>
          <Target size={40} style={{ color: 'var(--brand-gold)', margin: '0 auto 1rem', opacity: 0.8 }} />
          <h3 style={{ fontSize: '1.25rem', marginBottom: '0.5rem', color: 'var(--ink)' }}>
            No goals set for this semester
          </h3>
          <p style={{ color: 'var(--ink-soft)', marginBottom: '1.5rem', maxWidth: '440px', margin: '0 auto 1.5rem' }}>
            Define measurable milestones for study hours, attendance recovery, or problem-solving targets.
          </p>
          <button onClick={() => setShowModal(true)} className="btn btn-secondary">
            + Define First Goal
          </button>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 340px), 1fr))', gap: '1.5rem' }}>
          {goals.map((goal) => {
            const isDone = goal.status === 'completed' || goal.currentValue >= goal.targetValue;
            const progressPct = Math.min(100, Math.round((goal.currentValue / Math.max(1, goal.targetValue)) * 100));
            const isAutoLinked = goal.autoLinkMetric && goal.autoLinkMetric !== 'none';

            return (
              <div
                key={goal._id}
                className="card"
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  borderTop: isDone ? '3px solid var(--emerald)' : '3px solid var(--brand-gold)',
                  boxShadow: 'var(--shadow-sm)',
                  padding: '1.5rem',
                }}
              >
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem', flexWrap: 'wrap', gap: '0.4rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      <span className="badge badge-gold" style={{ fontSize: '0.72rem' }}>
                        {goal.category}
                      </span>
                      {goal.subjectCode && (
                        <span className="badge badge-blue" style={{ fontSize: '0.72rem' }}>
                          {goal.subjectCode}
                        </span>
                      )}
                      {isAutoLinked && (
                        <span className="badge badge-blue" style={{ fontSize: '0.7rem', display: 'inline-flex', alignItems: 'center', gap: '0.2rem' }}>
                          <Sparkles size={11} /> Auto-Tracked
                        </span>
                      )}
                    </div>
                    <span className={`badge ${isDone ? 'badge-green' : 'badge-gold'}`} style={{ fontSize: '0.75rem' }}>
                      {isDone ? 'Completed' : 'In Progress'}
                    </span>
                  </div>

                  <h3 style={{ fontSize: '1.2rem', fontWeight: 700, margin: '0.5rem 0', color: 'var(--ink)' }}>
                    {goal.title}
                  </h3>

                  {goal.description && (
                    <p style={{ fontSize: '0.85rem', color: 'var(--ink-soft)', marginBottom: '1rem', lineHeight: 1.4 }}>
                      {goal.description}
                    </p>
                  )}

                  {/* Progress Bar */}
                  <div style={{ marginBottom: '1.25rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.35rem' }}>
                      <span style={{ color: 'var(--ink)' }}>
                        {goal.currentValue} / {goal.targetValue} {goal.unit}
                      </span>
                      <span style={{ color: isDone ? 'var(--emerald)' : 'var(--brand-gold)' }}>
                        {progressPct}%
                      </span>
                    </div>
                    <div style={{ height: '8px', background: 'var(--surface-muted)', borderRadius: '4px', overflow: 'hidden' }}>
                      <div
                        style={{
                          height: '100%',
                          width: `${progressPct}%`,
                          backgroundColor: isDone ? 'var(--emerald)' : 'var(--brand-gold)',
                          transition: 'width 0.3s ease',
                          borderRadius: '4px',
                        }}
                      />
                    </div>
                  </div>
                </div>

                <div style={{ borderTop: '1px solid var(--border)', paddingTop: '0.85rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.75rem', color: 'var(--ink-soft)', display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}>
                    <Clock size={13} />
                    Target: {new Date(goal.targetDate).toLocaleDateString()}
                  </span>

                  <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
                    {!isDone && !isAutoLinked && (
                      <button
                        onClick={() => handleIncrement(goal, 1)}
                        className="btn btn-secondary"
                        style={{ padding: '0.2rem 0.5rem', fontSize: '0.75rem' }}
                      >
                        +1 {goal.unit}
                      </button>
                    )}
                    {isDone && (
                      <span style={{ fontSize: '0.75rem', color: 'var(--emerald)', display: 'inline-flex', alignItems: 'center', gap: '0.2rem', fontWeight: 600 }}>
                        <CheckCircle2 size={13} /> Achieved
                      </span>
                    )}
                    <button
                      onClick={() => handleDelete(goal._id)}
                      className="btn btn-ghost"
                      style={{ padding: '0.2rem', color: 'var(--crimson)' }}
                      title="Delete goal"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create Goal Modal */}
      {showModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '1rem' }}>
          <div className="card" style={{ maxWidth: '520px', width: '100%', padding: '2rem' }}>
            <h3 style={{ fontSize: '1.4rem', marginBottom: '1.25rem', color: 'var(--ink)' }}>
              Set Academic Milestone
            </h3>
            <form onSubmit={handleCreate}>
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.35rem', color: 'var(--ink)' }}>
                  Goal Title
                </label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Maintain 85% in Algorithms or Log 20 Study Hours"
                  className="input-field"
                  style={{ width: '100%' }}
                />
              </div>

              {/* Auto-Linking Metric Selector */}
              <div style={{ marginBottom: '1rem', backgroundColor: 'var(--surface-muted)', padding: '0.85rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.35rem', color: 'var(--ink)' }}>
                  Auto-Link to Academic System Data
                </label>
                <select
                  value={autoLinkMetric}
                  onChange={(e) => handleAutoLinkChange(e.target.value as typeof autoLinkMetric)}
                  className="input-field"
                  style={{ width: '100%', marginBottom: '0.5rem' }}
                >
                  <option value="none">Manual Progress (I will log numbers myself)</option>
                  <option value="attendance">Auto-Track Attendance Percentage (%)</option>
                  <option value="task_completion">Auto-Track Completed Tasks (count)</option>
                  <option value="study_hours">Auto-Track Focus Study Duration (hours)</option>
                </select>
                <span style={{ fontSize: '0.75rem', color: 'var(--ink-soft)' }}>
                  {autoLinkMetric === 'attendance'
                    ? 'Current progress will automatically sync with your live course attendance percentage.'
                    : autoLinkMetric === 'task_completion'
                    ? 'Current progress will automatically increment as you complete tasks.'
                    : autoLinkMetric === 'study_hours'
                    ? 'Current progress will automatically accumulate from your completed Pomodoro study sessions.'
                    : 'Manual tracking: you can increment progress using buttons on the goal card.'}
                </span>
              </div>

              {/* Course Association */}
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.35rem', color: 'var(--ink)' }}>
                  Course Association {autoLinkMetric === 'attendance' ? '(Required for Attendance)' : '(Optional)'}
                </label>
                <select
                  value={subjectId}
                  onChange={(e) => setSubjectId(e.target.value)}
                  className="input-field"
                  style={{ width: '100%' }}
                >
                  <option value="">-- General Goal (All Courses / General) --</option>
                  {subjects.map((s) => (
                    <option key={s._id} value={s._id}>
                      {s.code} — {s.name}
                    </option>
                  ))}
                </select>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.75rem', marginBottom: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.35rem', color: 'var(--ink)' }}>
                    Current
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={currentValue}
                    onChange={(e) => setCurrentValue(Number(e.target.value))}
                    disabled={autoLinkMetric !== 'none'}
                    className="input-field"
                    style={{ width: '100%' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.35rem', color: 'var(--ink)' }}>
                    Target
                  </label>
                  <input
                    type="number"
                    required
                    min={1}
                    value={targetValue}
                    onChange={(e) => setTargetValue(Number(e.target.value))}
                    className="input-field"
                    style={{ width: '100%' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.35rem', color: 'var(--ink)' }}>
                    Unit
                  </label>
                  <input
                    type="text"
                    value={unit}
                    onChange={(e) => setUnit(e.target.value)}
                    placeholder="%, hrs, tasks"
                    className="input-field"
                    style={{ width: '100%' }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.35rem', color: 'var(--ink)' }}>
                    Category
                  </label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="input-field"
                    style={{ width: '100%' }}
                  >
                    <option value="Academic">Academic</option>
                    <option value="Attendance">Attendance</option>
                    <option value="Skills">Skills / Coding</option>
                    <option value="Research">Research</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.35rem', color: 'var(--ink)' }}>
                    Target Date
                  </label>
                  <input
                    type="date"
                    required
                    value={targetDate}
                    onChange={(e) => setTargetDate(e.target.value)}
                    className="input-field"
                    style={{ width: '100%' }}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                <button type="button" onClick={() => setShowModal(false)} className="btn btn-secondary">
                  Cancel
                </button>
                <button type="submit" disabled={submitting} className="btn btn-primary">
                  {submitting ? 'Creating...' : 'Create Goal'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
