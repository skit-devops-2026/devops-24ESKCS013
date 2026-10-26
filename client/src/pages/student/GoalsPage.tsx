import React, { useState, useEffect } from 'react';
import {
  getGoals,
  getGoalSummary,
  createGoal,
  updateGoal,
  deleteGoal,
  GoalItem,
  GoalSummary,
} from '../../services/student.service';

export function GoalsPage() {
  const [goals, setGoals] = useState<GoalItem[]>([]);
  const [summary, setSummary] = useState<GoalSummary | null>(null);
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
  const [targetDate, setTargetDate] = useState(() => {
    const d = new Date(Date.now() + 30 * 86400000);
    return d.toISOString().split('T')[0];
  });
  const [submitting, setSubmitting] = useState(false);

  async function loadData() {
    setLoading(true);
    setError(null);
    try {
      const [goalsData, summaryData] = await Promise.all([getGoals(), getGoalSummary()]);
      setGoals(goalsData);
      setSummary(summaryData);
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
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Progress update failed');
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Are you sure you want to delete this goal?')) return;
    try {
      await deleteGoal(id);
      setGoals((prev) => prev.filter((g) => g._id !== id));
      const newSummary = await getGoalSummary();
      setSummary(newSummary);
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Delete failed');
    }
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    setSubmitting(true);
    try {
      await createGoal({
        title,
        description,
        targetValue,
        currentValue,
        unit,
        category,
        targetDate: new Date(targetDate).toISOString(),
      });
      setShowModal(false);
      setTitle('');
      setDescription('');
      loadData();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Goal creation failed');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="container" style={{ padding: '2.5rem 1rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <span className="badge badge-gold" style={{ marginBottom: '0.5rem' }}>Semester Milestones</span>
          <h1 style={{ fontSize: '2.25rem', color: 'var(--ink)' }}>Academic Goals</h1>
          <p style={{ color: 'var(--ink-soft)' }}>Set quantitative benchmarks, track progress, and celebrate achievements.</p>
        </div>
        <button onClick={() => setShowModal(true)} className="btn btn-primary">
          + Set New Goal
        </button>
      </div>

      {summary && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem', marginBottom: '2.5rem' }}>
          <div className="card" style={{ padding: '1.25rem' }}>
            <span style={{ color: 'var(--ink-soft)', fontSize: '0.85rem' }}>Total Goals</span>
            <h3 style={{ fontSize: '1.75rem', marginTop: '0.25rem' }}>{summary.total}</h3>
          </div>
          <div className="card" style={{ padding: '1.25rem' }}>
            <span style={{ color: 'var(--ink-soft)', fontSize: '0.85rem' }}>In Progress</span>
            <h3 style={{ fontSize: '1.75rem', marginTop: '0.25rem', color: 'var(--gold-ink)' }}>{summary.active}</h3>
          </div>
          <div className="card" style={{ padding: '1.25rem' }}>
            <span style={{ color: 'var(--ink-soft)', fontSize: '0.85rem' }}>Completed</span>
            <h3 style={{ fontSize: '1.75rem', marginTop: '0.25rem', color: 'var(--green)' }}>{summary.completed}</h3>
          </div>
          <div className="card" style={{ padding: '1.25rem' }}>
            <span style={{ color: 'var(--ink-soft)', fontSize: '0.85rem' }}>Average Completion</span>
            <h3 style={{ fontSize: '1.75rem', marginTop: '0.25rem', color: 'var(--ink)' }}>{summary.averageProgress}%</h3>
          </div>
        </div>
      )}

      {loading ? (
        <div style={{ textAlign: 'center', padding: '4rem 1rem', color: 'var(--ink-soft)' }}>Loading academic goals...</div>
      ) : error ? (
        <div style={{ background: 'var(--red-soft)', color: 'var(--red)', padding: '1rem', borderRadius: '6px' }}>{error}</div>
      ) : goals.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '4rem 1rem' }}>
          <h3 style={{ fontSize: '1.25rem', marginBottom: '0.5rem' }}>No goals defined yet</h3>
          <p style={{ color: 'var(--ink-soft)', marginBottom: '1.5rem' }}>Define your first academic target (e.g. "Maintain 85% Attendance").</p>
          <button onClick={() => setShowModal(true)} className="btn btn-secondary">
            + Define Target
          </button>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.5rem' }}>
          {goals.map((goal) => {
            const pct = Math.min(100, Math.round((goal.currentValue / Math.max(1, goal.targetValue)) * 100));
            const isCompleted = goal.status === 'completed' || pct >= 100;

            return (
              <div key={goal._id} className="card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                    <span className="badge badge-gold">{goal.category}</span>
                    <span className={`badge ${isCompleted ? 'badge-green' : 'badge-gold'}`}>
                      {isCompleted ? 'Completed' : 'In Progress'}
                    </span>
                  </div>

                  <h3 style={{ fontSize: '1.2rem', marginBottom: '0.5rem', color: 'var(--ink)' }}>{goal.title}</h3>
                  {goal.description && <p style={{ fontSize: '0.875rem', color: 'var(--ink-soft)', marginBottom: '1rem' }}>{goal.description}</p>}

                  {/* Progress bar */}
                  <div style={{ marginBottom: '1rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '0.25rem' }}>
                      <span style={{ fontWeight: 600 }}>
                        {goal.currentValue} / {goal.targetValue} {goal.unit}
                      </span>
                      <span style={{ color: 'var(--ink-soft)' }}>{pct}%</span>
                    </div>
                    <div style={{ width: '100%', height: '8px', background: 'var(--paper)', borderRadius: '4px', overflow: 'hidden' }}>
                      <div
                        style={{
                          width: `${pct}%`,
                          height: '100%',
                          background: isCompleted ? 'var(--green)' : 'var(--gold)',
                          transition: 'width 0.3s ease',
                        }}
                      />
                    </div>
                  </div>
                </div>

                <div style={{ borderTop: '1px solid var(--rule)', paddingTop: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    {!isCompleted && (
                      <>
                        <button
                          onClick={() => handleIncrement(goal, 5)}
                          className="btn btn-secondary"
                          style={{ padding: '0.25rem 0.6rem', fontSize: '0.75rem' }}
                        >
                          +5
                        </button>
                        <button
                          onClick={() => handleIncrement(goal, 10)}
                          className="btn btn-secondary"
                          style={{ padding: '0.25rem 0.6rem', fontSize: '0.75rem' }}
                        >
                          +10
                        </button>
                      </>
                    )}
                  </div>
                  <button
                    onClick={() => handleDelete(goal._id)}
                    style={{ fontSize: '0.8rem', color: 'var(--red)', cursor: 'pointer' }}
                  >
                    Delete
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: '1rem' }}>
          <div className="card" style={{ maxWidth: '480px', width: '100%', padding: '2rem' }}>
            <h3 style={{ fontSize: '1.5rem', marginBottom: '1.25rem' }}>Set Academic Goal</h3>
            <form onSubmit={handleCreate}>
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.35rem' }}>Goal Title</label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Read 50 Research Papers"
                  style={{ width: '100%', padding: '0.5rem 0.75rem', borderRadius: '4px', border: '1px solid var(--rule-strong)' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.75rem', marginBottom: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.35rem' }}>Current</label>
                  <input
                    type="number"
                    min={0}
                    value={currentValue}
                    onChange={(e) => setCurrentValue(Number(e.target.value))}
                    style={{ width: '100%', padding: '0.5rem 0.75rem', borderRadius: '4px', border: '1px solid var(--rule-strong)' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.35rem' }}>Target</label>
                  <input
                    type="number"
                    required
                    min={1}
                    value={targetValue}
                    onChange={(e) => setTargetValue(Number(e.target.value))}
                    style={{ width: '100%', padding: '0.5rem 0.75rem', borderRadius: '4px', border: '1px solid var(--rule-strong)' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.35rem' }}>Unit</label>
                  <input
                    type="text"
                    value={unit}
                    onChange={(e) => setUnit(e.target.value)}
                    placeholder="%, hrs, etc."
                    style={{ width: '100%', padding: '0.5rem 0.75rem', borderRadius: '4px', border: '1px solid var(--rule-strong)' }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.35rem' }}>Category</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid var(--rule-strong)' }}
                  >
                    <option value="Academic">Academic</option>
                    <option value="Attendance">Attendance</option>
                    <option value="Skills">Skills / Coding</option>
                    <option value="Research">Research</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.35rem' }}>Target Date</label>
                  <input
                    type="date"
                    required
                    value={targetDate}
                    onChange={(e) => setTargetDate(e.target.value)}
                    style={{ width: '100%', padding: '0.45rem', borderRadius: '4px', border: '1px solid var(--rule-strong)' }}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                <button type="button" onClick={() => setShowModal(false)} className="btn btn-secondary">
                  Cancel
                </button>
                <button type="submit" disabled={submitting} className="btn btn-primary">
                  {submitting ? 'Saving...' : 'Create Goal'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
