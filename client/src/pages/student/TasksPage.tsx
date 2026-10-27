import React, { useState, useEffect } from 'react';
import { Plus } from 'lucide-react';
import { useToast } from '../../context/ToastContext';
import { PageHeader } from '../../components/PageHeader';
import {
  getTasks,
  getTaskSummary,
  createTask,
  updateTask,
  deleteTask,
  getSubjects,
  TaskItem,
  TaskSummary,
  SubjectItem,
} from '../../services/student.service';

export function TasksPage() {
  const { toast, confirmModal } = useToast();
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [summary, setSummary] = useState<TaskSummary | null>(null);
  const [subjects, setSubjects] = useState<SubjectItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [statusFilter, setStatusFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');

  // Modal / Form state
  const [showModal, setShowModal] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newPriority, setNewPriority] = useState<'low' | 'medium' | 'high'>('medium');
  const [newDueDate, setNewDueDate] = useState(() => {
    const d = new Date(Date.now() + 86400000);
    return d.toISOString().split('T')[0];
  });
  const [newSubjectId, setNewSubjectId] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function loadData() {
    setLoading(true);
    setError(null);
    try {
      const [tasksData, summaryData, subjectsData] = await Promise.all([
        getTasks({ status: statusFilter, priority: priorityFilter }),
        getTaskSummary(),
        getSubjects(),
      ]);
      setTasks(tasksData);
      setSummary(summaryData);
      setSubjects(subjectsData);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load tasks');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, [statusFilter, priorityFilter]);

  async function handleToggleStatus(task: TaskItem) {
    const nextStatus = task.status === 'completed' ? 'pending' : 'completed';
    try {
      const updated = await updateTask(task._id, { status: nextStatus });
      setTasks((prev) => prev.map((t) => (t._id === updated._id ? updated : t)));
      const newSummary = await getTaskSummary();
      setSummary(newSummary);
      toast.success(nextStatus === 'completed' ? 'Task marked as completed' : 'Task reopened');
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Update failed');
    }
  }

  async function handleDelete(id: string) {
    const confirmed = await confirmModal({
      title: 'Delete Task',
      message: 'Are you sure you want to delete this task? This cannot be undone.',
      confirmText: 'Delete Task',
      isDestructive: true,
    });
    if (!confirmed) return;

    try {
      await deleteTask(id);
      setTasks((prev) => prev.filter((t) => t._id !== id));
      const newSummary = await getTaskSummary();
      setSummary(newSummary);
      toast.success('Task deleted successfully');
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Delete failed');
    }
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!newTitle.trim()) return;
    setSubmitting(true);
    try {
      const parsedDate = newDueDate ? new Date(newDueDate) : new Date(Date.now() + 86400000);
      const safeDueDate = isNaN(parsedDate.getTime())
        ? new Date(Date.now() + 86400000).toISOString()
        : parsedDate.toISOString();

      await createTask({
        title: newTitle,
        description: newDescription,
        priority: newPriority,
        dueDate: safeDueDate,
        subjectId: newSubjectId || null,
      });
      setShowModal(false);
      setNewTitle('');
      setNewDescription('');
      toast.success('Task added successfully');
      loadData();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Task creation failed');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="container" style={{ padding: '1rem' }}>
      <PageHeader
        badge="Academic Workflow"
        badgeType="gold"
        title="Assignments & Tasks"
        description="Track upcoming deadlines, prioritize coursework, and monitor completion status."
        backTo="/student/dashboard"
        backLabel="Back to Dashboard"
        actions={
          <button onClick={() => setShowModal(true)} className="btn btn-primary" style={{ gap: '0.4rem' }}>
            <Plus size={16} />
            <span>Add New Task</span>
          </button>
        }
      />

      {/* Summary KPI Cards */}
      {summary && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
          <div className="card" style={{ padding: '1.25rem' }}>
            <span style={{ color: 'var(--ink-soft)', fontSize: '0.85rem' }}>Total Tasks</span>
            <h3 style={{ fontSize: '1.75rem', marginTop: '0.25rem' }}>{summary.total}</h3>
          </div>
          <div className="card" style={{ padding: '1.25rem' }}>
            <span style={{ color: 'var(--ink-soft)', fontSize: '0.85rem' }}>Pending</span>
            <h3 style={{ fontSize: '1.75rem', marginTop: '0.25rem', color: 'var(--gold-ink)' }}>{summary.pending}</h3>
          </div>
          <div className="card" style={{ padding: '1.25rem' }}>
            <span style={{ color: 'var(--ink-soft)', fontSize: '0.85rem' }}>In Progress</span>
            <h3 style={{ fontSize: '1.75rem', marginTop: '0.25rem', color: 'var(--ink)' }}>{summary.inProgress}</h3>
          </div>
          <div className="card" style={{ padding: '1.25rem' }}>
            <span style={{ color: 'var(--ink-soft)', fontSize: '0.85rem' }}>Completed</span>
            <h3 style={{ fontSize: '1.75rem', marginTop: '0.25rem', color: 'var(--green)' }}>{summary.completed}</h3>
          </div>
          <div className="card" style={{ padding: '1.25rem' }}>
            <span style={{ color: 'var(--ink-soft)', fontSize: '0.85rem' }}>Overdue</span>
            <h3 style={{ fontSize: '1.75rem', marginTop: '0.25rem', color: summary.overdue > 0 ? 'var(--red)' : 'var(--ink-soft)' }}>
              {summary.overdue}
            </h3>
          </div>
        </div>
      )}

      {/* Filter Toolbar */}
      <div className="card" style={{ padding: '1rem 1.5rem', marginBottom: '2rem', display: 'flex', gap: '1.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span style={{ fontSize: '0.875rem', fontWeight: 600 }}>Status:</span>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            style={{ padding: '0.4rem 0.8rem', borderRadius: '4px', border: '1px solid var(--rule-strong)', fontSize: '0.875rem' }}
          >
            <option value="all">All Statuses</option>
            <option value="pending">Pending</option>
            <option value="in_progress">In Progress</option>
            <option value="completed">Completed</option>
          </select>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span style={{ fontSize: '0.875rem', fontWeight: 600 }}>Priority:</span>
          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            style={{ padding: '0.4rem 0.8rem', borderRadius: '4px', border: '1px solid var(--rule-strong)', fontSize: '0.875rem' }}
          >
            <option value="all">All Priorities</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
        </div>
      </div>

      {/* Task List Content */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '4rem 1rem', color: 'var(--ink-soft)' }}>Loading persistent tasks...</div>
      ) : error ? (
        <div style={{ background: 'var(--red-soft)', color: 'var(--red)', padding: '1rem', borderRadius: '6px' }}>{error}</div>
      ) : tasks.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '4rem 1rem' }}>
          <h3 style={{ fontSize: '1.25rem', marginBottom: '0.5rem' }}>No tasks found</h3>
          <p style={{ color: 'var(--ink-soft)', marginBottom: '1.5rem' }}>You're all caught up! Create a new task to stay organized.</p>
          <button onClick={() => setShowModal(true)} className="btn btn-secondary">
            + Create First Task
          </button>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {tasks.map((task) => {
            const isCompleted = task.status === 'completed';
            const isOverdue = !isCompleted && new Date(task.dueDate).getTime() < Date.now();

            return (
              <div
                key={task._id}
                className="card"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '1.25rem 1.5rem',
                  opacity: isCompleted ? 0.7 : 1,
                  borderLeft: isOverdue ? '4px solid var(--red)' : isCompleted ? '4px solid var(--green)' : '4px solid var(--gold)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flex: 1 }}>
                  <input
                    type="checkbox"
                    checked={isCompleted}
                    onChange={() => handleToggleStatus(task)}
                    style={{ width: '1.2rem', height: '1.2rem', cursor: 'pointer' }}
                  />
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.25rem' }}>
                      <span
                        style={{
                          fontSize: '1.05rem',
                          fontWeight: 600,
                          textDecoration: isCompleted ? 'line-through' : 'none',
                          color: isCompleted ? 'var(--ink-soft)' : 'var(--ink)',
                        }}
                      >
                        {task.title}
                      </span>
                      {task.subjectCode && <span className="badge badge-gold">{task.subjectCode}</span>}
                      <span
                        className={`badge ${
                          task.priority === 'high' ? 'badge-red' : task.priority === 'medium' ? 'badge-gold' : 'badge-green'
                        }`}
                      >
                        {task.priority}
                      </span>
                    </div>
                    {task.description && <p style={{ fontSize: '0.875rem', color: 'var(--ink-soft)' }}>{task.description}</p>}
                    <span style={{ fontSize: '0.8rem', color: isOverdue ? 'var(--red)' : 'var(--ink-faint)' }}>
                      Due: {new Date(task.dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      {isOverdue && ' (Overdue)'}
                    </span>
                  </div>
                </div>

                <div>
                  <button
                    onClick={() => handleDelete(task._id)}
                    className="btn btn-secondary"
                    style={{ padding: '0.35rem 0.75rem', fontSize: '0.8rem', color: 'var(--red)' }}
                  >
                    Delete
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create Task Modal */}
      {showModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 100,
            padding: '1rem',
          }}
        >
          <div className="card" style={{ maxWidth: '500px', width: '100%', padding: '2rem' }}>
            <h3 style={{ fontSize: '1.5rem', marginBottom: '1.25rem' }}>Create Academic Task</h3>
            <form onSubmit={handleCreate}>
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.35rem' }}>Title</label>
                <input
                  type="text"
                  required
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="e.g. Finish Operating Systems Lab"
                  style={{ width: '100%', padding: '0.5rem 0.75rem', borderRadius: '4px', border: '1px solid var(--rule-strong)' }}
                />
              </div>

              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.35rem' }}>Description</label>
                <textarea
                  rows={3}
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  placeholder="Optional assignment instructions..."
                  style={{ width: '100%', padding: '0.5rem 0.75rem', borderRadius: '4px', border: '1px solid var(--rule-strong)' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.35rem' }}>Priority</label>
                  <select
                    value={newPriority}
                    onChange={(e) => setNewPriority(e.target.value as 'low' | 'medium' | 'high')}
                    style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid var(--rule-strong)' }}
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.35rem' }}>Due Date</label>
                  <input
                    type="date"
                    required
                    value={newDueDate}
                    onChange={(e) => setNewDueDate(e.target.value)}
                    style={{ width: '100%', padding: '0.45rem', borderRadius: '4px', border: '1px solid var(--rule-strong)' }}
                  />
                </div>
              </div>

              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.35rem' }}>Subject Association</label>
                <select
                  value={newSubjectId}
                  onChange={(e) => setNewSubjectId(e.target.value)}
                  style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid var(--rule-strong)' }}
                >
                  <option value="">-- No Subject (General Task) --</option>
                  {subjects.map((s) => (
                    <option key={s._id} value={s._id}>
                      {s.code} — {s.name}
                    </option>
                  ))}
                </select>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                <button type="button" onClick={() => setShowModal(false)} className="btn btn-secondary">
                  Cancel
                </button>
                <button type="submit" disabled={submitting} className="btn btn-primary">
                  {submitting ? 'Saving...' : 'Save Task'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
