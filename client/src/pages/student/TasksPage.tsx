import React, { useState, useEffect, useMemo } from 'react';
import {
  Plus,
  Calendar,
  AlertTriangle,
  CheckCircle2,
  Clock,
  LayoutGrid,
  List,
  Trash2,
  GripVertical,
  ArrowRight,
  Search,
} from 'lucide-react';
import {
  DndContext,
  DragOverlay,
  closestCorners,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragStartEvent,
  DragEndEvent,
  useDroppable,
} from '@dnd-kit/core';
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
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

type TaskStatus = 'pending' | 'in_progress' | 'completed';

interface ColumnDef {
  id: TaskStatus;
  title: string;
  badgeClass: string;
  accentColor: string;
}

const COLUMNS: ColumnDef[] = [
  { id: 'pending', title: 'To Do', badgeClass: 'badge-gold', accentColor: 'var(--brand-gold, #f59e0b)' },
  { id: 'in_progress', title: 'In Progress', badgeClass: 'badge-blue', accentColor: 'var(--primary, #6366f1)' },
  { id: 'completed', title: 'Completed', badgeClass: 'badge-green', accentColor: 'var(--emerald, #10b981)' },
];

export function TasksPage() {
  const { toast, confirmModal } = useToast();
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [summary, setSummary] = useState<TaskSummary | null>(null);
  const [subjects, setSubjects] = useState<SubjectItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // View Mode: Kanban vs List
  const [viewMode, setViewMode] = useState<'kanban' | 'list'>('kanban');

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [subjectFilter, setSubjectFilter] = useState('all');

  // DnD Active dragging item
  const [activeTask, setActiveTask] = useState<TaskItem | null>(null);

  // Modal / Form state
  const [showModal, setShowModal] = useState(false);
  const [modalInitialStatus, setModalInitialStatus] = useState<TaskStatus>('pending');
  const [newTitle, setNewTitle] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newPriority, setNewPriority] = useState<'low' | 'medium' | 'high'>('medium');
  const [newDueDate, setNewDueDate] = useState(() => {
    const d = new Date(Date.now() + 86400000);
    return d.toISOString().split('T')[0];
  });
  const [newSubjectId, setNewSubjectId] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Setup DnD sensors (pointer constraint of 5px ensures click vs drag distinction)
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    }),
    useSensor(KeyboardSensor)
  );

  async function loadData() {
    setLoading(true);
    setError(null);
    try {
      const [tasksData, summaryData, subjectsData] = await Promise.all([
        getTasks({ priority: priorityFilter !== 'all' ? priorityFilter : undefined }),
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
  }, [priorityFilter]);

  // Filter tasks in memory for fast responsive search
  const filteredTasks = useMemo(() => {
    return tasks.filter((task) => {
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesTitle = task.title.toLowerCase().includes(q);
        const matchesDesc = task.description?.toLowerCase().includes(q);
        const matchesSubj = task.subjectCode?.toLowerCase().includes(q);
        if (!matchesTitle && !matchesDesc && !matchesSubj) return false;
      }
      if (subjectFilter !== 'all') {
        if (task.subjectId !== subjectFilter) return false;
      }
      return true;
    });
  }, [tasks, searchQuery, subjectFilter]);

  async function handleStatusChange(taskId: string, nextStatus: TaskStatus) {
    const targetTask = tasks.find((t) => t._id === taskId);
    if (!targetTask || targetTask.status === nextStatus) return;

    // Optimistic update
    setTasks((prev) =>
      prev.map((t) => (t._id === taskId ? { ...t, status: nextStatus } : t))
    );

    try {
      await updateTask(taskId, { status: nextStatus });
      const newSummary = await getTaskSummary();
      setSummary(newSummary);
      const col = COLUMNS.find((c) => c.id === nextStatus);
      toast.success(`Task moved to ${col?.title || nextStatus}`);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Status update failed');
      loadData(); // rollback
    }
  }

  async function handleDelete(id: string) {
    const confirmed = await confirmModal({
      title: 'Delete Task',
      message: 'Are you sure you want to delete this task? This action cannot be undone.',
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
        title: newTitle.trim(),
        description: newDescription.trim(),
        priority: newPriority,
        dueDate: safeDueDate,
        subjectId: newSubjectId || null,
        status: modalInitialStatus,
      });

      setShowModal(false);
      setNewTitle('');
      setNewDescription('');
      toast.success('Task created successfully');
      loadData();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Task creation failed');
    } finally {
      setSubmitting(false);
    }
  }

  function handleOpenCreateModal(status: TaskStatus = 'pending') {
    setModalInitialStatus(status);
    setShowModal(true);
  }

  // DnD Handlers
  function handleDragStart(event: DragStartEvent) {
    const { active } = event;
    const task = tasks.find((t) => t._id === active.id);
    if (task) {
      setActiveTask(task);
    }
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    setActiveTask(null);

    if (!over) return;

    const activeId = String(active.id);
    const overId = String(over.id);

    // If dropped directly onto a column container
    const isColumn = COLUMNS.some((col) => col.id === overId);
    if (isColumn) {
      const targetColumnStatus = overId as TaskStatus;
      handleStatusChange(activeId, targetColumnStatus);
      return;
    }

    // If dropped onto another task, find that task's column
    const overTask = tasks.find((t) => t._id === overId);
    if (overTask && overTask.status) {
      handleStatusChange(activeId, overTask.status as TaskStatus);
    }
  }

  return (
    <div className="container" style={{ padding: '1rem' }}>
      <PageHeader
        badge="Academic Workflow"
        badgeType="gold"
        title="Assignments & Kanban Board"
        description="Track assignments across To Do, In Progress, and Completed stages with interactive drag-and-drop and accessible keyboard controls."
        backTo="/student/dashboard"
        backLabel="Back to Dashboard"
        actions={
          <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
            <div
              style={{
                display: 'inline-flex',
                backgroundColor: 'var(--surface-muted)',
                borderRadius: 'var(--radius-md)',
                padding: '0.2rem',
                border: '1px solid var(--border)',
              }}
            >
              <button
                type="button"
                onClick={() => setViewMode('kanban')}
                className={`btn ${viewMode === 'kanban' ? 'btn-primary' : 'btn-ghost'}`}
                style={{ padding: '0.35rem 0.65rem', fontSize: '0.8rem', gap: '0.35rem' }}
                title="Kanban Board View"
              >
                <LayoutGrid size={15} />
                <span>Kanban</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode('list')}
                className={`btn ${viewMode === 'list' ? 'btn-primary' : 'btn-ghost'}`}
                style={{ padding: '0.35rem 0.65rem', fontSize: '0.8rem', gap: '0.35rem' }}
                title="List View"
              >
                <List size={15} />
                <span>List</span>
              </button>
            </div>

            <button
              onClick={() => handleOpenCreateModal('pending')}
              className="btn btn-primary"
              style={{ gap: '0.4rem' }}
            >
              <Plus size={16} />
              <span>Add Task</span>
            </button>
          </div>
        }
      />

      {/* Summary KPI Cards */}
      {summary && (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
            gap: '1rem',
            marginBottom: '1.5rem',
          }}
        >
          <div className="card" style={{ padding: '1.25rem' }}>
            <span style={{ color: 'var(--ink-soft)', fontSize: '0.85rem' }}>Total Tasks</span>
            <h3 style={{ fontSize: '1.75rem', marginTop: '0.25rem' }}>{summary.total}</h3>
          </div>
          <div className="card" style={{ padding: '1.25rem' }}>
            <span style={{ color: 'var(--ink-soft)', fontSize: '0.85rem' }}>To Do</span>
            <h3 style={{ fontSize: '1.75rem', marginTop: '0.25rem', color: 'var(--brand-gold)' }}>
              {summary.pending}
            </h3>
          </div>
          <div className="card" style={{ padding: '1.25rem' }}>
            <span style={{ color: 'var(--ink-soft)', fontSize: '0.85rem' }}>In Progress</span>
            <h3 style={{ fontSize: '1.75rem', marginTop: '0.25rem', color: 'var(--primary)' }}>
              {summary.inProgress}
            </h3>
          </div>
          <div className="card" style={{ padding: '1.25rem' }}>
            <span style={{ color: 'var(--ink-soft)', fontSize: '0.85rem' }}>Completed</span>
            <h3 style={{ fontSize: '1.75rem', marginTop: '0.25rem', color: 'var(--emerald)' }}>
              {summary.completed}
            </h3>
          </div>
          <div className="card" style={{ padding: '1.25rem' }}>
            <span style={{ color: 'var(--ink-soft)', fontSize: '0.85rem' }}>Overdue</span>
            <h3
              style={{
                fontSize: '1.75rem',
                marginTop: '0.25rem',
                color: summary.overdue > 0 ? 'var(--crimson)' : 'var(--ink-soft)',
              }}
            >
              {summary.overdue}
            </h3>
          </div>
        </div>
      )}

      {/* Filter and Search Toolbar */}
      <div
        className="card"
        style={{
          padding: '1rem 1.25rem',
          marginBottom: '1.5rem',
          display: 'flex',
          gap: '1rem',
          alignItems: 'center',
          flexWrap: 'wrap',
        }}
      >
        <div style={{ position: 'relative', flex: '1 1 220px' }}>
          <Search
            size={16}
            style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--ink-soft)' }}
          />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search assignments or subjects..."
            className="input-field"
            style={{ paddingLeft: '2.25rem', width: '100%', fontSize: '0.875rem' }}
          />
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--ink)' }}>Priority:</span>
          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            className="input-field"
            style={{ fontSize: '0.85rem', padding: '0.4rem 0.6rem' }}
          >
            <option value="all">All Priorities</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--ink)' }}>Course:</span>
          <select
            value={subjectFilter}
            onChange={(e) => setSubjectFilter(e.target.value)}
            className="input-field"
            style={{ fontSize: '0.85rem', padding: '0.4rem 0.6rem' }}
          >
            <option value="all">All Courses</option>
            {subjects.map((s) => (
              <option key={s._id} value={s._id}>
                {s.code} — {s.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Main Content Area */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '4rem 1rem', color: 'var(--ink-soft)' }}>
          Loading academic assignments...
        </div>
      ) : error ? (
        <div style={{ background: 'var(--crimson-soft)', color: 'var(--crimson)', padding: '1rem', borderRadius: '6px' }}>
          {error}
        </div>
      ) : viewMode === 'kanban' ? (
        /* Kanban Board View with DndKit */
        <DndContext
          sensors={sensors}
          collisionDetection={closestCorners}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 300px), 1fr))',
              gap: '1.25rem',
              alignItems: 'start',
            }}
          >
            {COLUMNS.map((column) => {
              const columnTasks = filteredTasks.filter((t) => t.status === column.id);
              return (
                <KanbanColumn
                  key={column.id}
                  column={column}
                  tasks={columnTasks}
                  onStatusChange={handleStatusChange}
                  onDelete={handleDelete}
                  onAddTask={() => handleOpenCreateModal(column.id)}
                />
              );
            })}
          </div>

          {/* Drag Overlay for smooth preview */}
          <DragOverlay>
            {activeTask ? (
              <div style={{ transform: 'rotate(2deg)', opacity: 0.9 }}>
                <TaskCardContent task={activeTask} />
              </div>
            ) : null}
          </DragOverlay>
        </DndContext>
      ) : (
        /* List View */
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {filteredTasks.length === 0 ? (
            <div className="card" style={{ textAlign: 'center', padding: '3rem 1rem' }}>
              <p style={{ color: 'var(--ink-soft)' }}>No tasks match your filters.</p>
            </div>
          ) : (
            filteredTasks.map((task) => (
              <TaskListItem
                key={task._id}
                task={task}
                onStatusChange={handleStatusChange}
                onDelete={handleDelete}
              />
            ))
          )}
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
            zIndex: 1000,
            padding: '1rem',
          }}
        >
          <div className="card" style={{ maxWidth: '520px', width: '100%', padding: '2rem' }}>
            <h3 style={{ fontSize: '1.4rem', marginBottom: '1.25rem', color: 'var(--ink)' }}>
              Create Academic Task
            </h3>
            <form onSubmit={handleCreate}>
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.35rem', color: 'var(--ink)' }}>
                  Title
                </label>
                <input
                  type="text"
                  required
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="e.g. Finish DAA Lab Dynamic Programming"
                  className="input-field"
                  style={{ width: '100%' }}
                />
              </div>

              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.35rem', color: 'var(--ink)' }}>
                  Description (Optional)
                </label>
                <textarea
                  rows={3}
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  placeholder="Assignment instructions or criteria..."
                  className="input-field"
                  style={{ width: '100%' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.35rem', color: 'var(--ink)' }}>
                    Priority
                  </label>
                  <select
                    value={newPriority}
                    onChange={(e) => setNewPriority(e.target.value as 'low' | 'medium' | 'high')}
                    className="input-field"
                    style={{ width: '100%' }}
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.35rem', color: 'var(--ink)' }}>
                    Due Date
                  </label>
                  <input
                    type="date"
                    required
                    value={newDueDate}
                    onChange={(e) => setNewDueDate(e.target.value)}
                    className="input-field"
                    style={{ width: '100%' }}
                  />
                </div>
              </div>

              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.35rem', color: 'var(--ink)' }}>
                  Course Association
                </label>
                <select
                  value={newSubjectId}
                  onChange={(e) => setNewSubjectId(e.target.value)}
                  className="input-field"
                  style={{ width: '100%' }}
                >
                  <option value="">-- General Task (No Subject) --</option>
                  {subjects.map((s) => (
                    <option key={s._id} value={s._id}>
                      {s.code} — {s.name}
                    </option>
                  ))}
                </select>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="btn btn-secondary"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="btn btn-primary"
                >
                  {submitting ? 'Creating...' : 'Save Task'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

// Kanban Column Component
interface KanbanColumnProps {
  column: ColumnDef;
  tasks: TaskItem[];
  onStatusChange: (id: string, status: TaskStatus) => void;
  onDelete: (id: string) => void;
  onAddTask: () => void;
}

function KanbanColumn({ column, tasks, onStatusChange, onDelete, onAddTask }: KanbanColumnProps) {
  const { setNodeRef, isOver } = useDroppable({
    id: column.id,
  });

  return (
    <div
      ref={setNodeRef}
      className="card"
      style={{
        padding: '1.25rem',
        backgroundColor: isOver ? 'var(--surface-muted)' : 'var(--surface)',
        borderColor: isOver ? column.accentColor : 'var(--border)',
        minHeight: '480px',
        display: 'flex',
        flexDirection: 'column',
        transition: 'border-color 0.15s ease, background-color 0.15s ease',
      }}
    >
      {/* Column Header */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '1rem',
          paddingBottom: '0.75rem',
          borderBottom: `2px solid ${column.accentColor}`,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <h4 style={{ fontSize: '1rem', fontWeight: 700, margin: 0, color: 'var(--ink)' }}>
            {column.title}
          </h4>
          <span
            className={`badge ${column.badgeClass}`}
            style={{ fontSize: '0.75rem', padding: '0.15rem 0.5rem' }}
          >
            {tasks.length}
          </span>
        </div>

        <button
          onClick={onAddTask}
          className="btn btn-ghost"
          style={{ padding: '0.25rem', borderRadius: '4px' }}
          title={`Add task to ${column.title}`}
          aria-label={`Add task to ${column.title}`}
        >
          <Plus size={16} />
        </button>
      </div>

      {/* Task Cards Sortable Container */}
      <SortableContext items={tasks.map((t) => t._id)} strategy={verticalListSortingStrategy}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', flex: 1 }}>
          {tasks.length === 0 ? (
            <div
              style={{
                border: '1px dashed var(--border)',
                borderRadius: 'var(--radius-md)',
                padding: '2rem 1rem',
                textAlign: 'center',
                color: 'var(--ink-soft)',
                fontSize: '0.85rem',
              }}
            >
              No tasks in {column.title}. Drag tasks here.
            </div>
          ) : (
            tasks.map((task) => (
              <SortableTaskCard
                key={task._id}
                task={task}
                onStatusChange={onStatusChange}
                onDelete={onDelete}
              />
            ))
          )}
        </div>
      </SortableContext>
    </div>
  );
}

// Sortable Task Card
interface SortableTaskCardProps {
  task: TaskItem;
  onStatusChange: (id: string, status: TaskStatus) => void;
  onDelete: (id: string) => void;
}

function SortableTaskCard({ task, onStatusChange, onDelete }: SortableTaskCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: task._id });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.3 : 1,
  };

  const isCompleted = task.status === 'completed';
  const isOverdue = !isCompleted && new Date(task.dueDate).getTime() < Date.now();

  return (
    <div
      ref={setNodeRef}
      style={{
        ...style,
        position: 'relative',
        backgroundColor: 'var(--surface)',
        borderRadius: 'var(--radius-md)',
        border: '1px solid var(--border)',
        borderLeft: isOverdue
          ? '4px solid var(--crimson)'
          : isCompleted
          ? '4px solid var(--emerald)'
          : '4px solid var(--brand-gold)',
        padding: '0.85rem 1rem',
        boxShadow: 'var(--shadow-sm)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '0.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
          {task.subjectCode && (
            <span className="badge badge-gold" style={{ fontSize: '0.7rem' }}>
              {task.subjectCode}
            </span>
          )}
          <span
            className={`badge ${
              task.priority === 'high'
                ? 'badge-red'
                : task.priority === 'medium'
                ? 'badge-gold'
                : 'badge-green'
            }`}
            style={{ fontSize: '0.7rem' }}
          >
            {task.priority}
          </span>
          {isOverdue && (
            <span
              className="badge badge-red"
              style={{
                fontSize: '0.7rem',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.2rem',
                fontWeight: 700,
              }}
            >
              <AlertTriangle size={11} /> Overdue
            </span>
          )}
        </div>

        {/* Drag handle */}
        <div
          {...attributes}
          {...listeners}
          style={{
            cursor: 'grab',
            color: 'var(--ink-soft)',
            padding: '0.1rem',
            display: 'flex',
            alignItems: 'center',
          }}
          title="Drag task"
          aria-label="Drag task"
        >
          <GripVertical size={16} />
        </div>
      </div>

      <h5
        style={{
          margin: '0.5rem 0 0.3rem',
          fontSize: '0.95rem',
          fontWeight: 600,
          color: isCompleted ? 'var(--ink-soft)' : 'var(--ink)',
          textDecoration: isCompleted ? 'line-through' : 'none',
        }}
      >
        {task.title}
      </h5>

      {task.description && (
        <p
          style={{
            margin: '0 0 0.6rem',
            fontSize: '0.8rem',
            color: 'var(--ink-soft)',
            lineHeight: 1.4,
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
          }}
        >
          {task.description}
        </p>
      )}

      {/* Footer with Due Date & Accessible Keyboard Move Actions */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          borderTop: '1px solid var(--border)',
          paddingTop: '0.5rem',
          marginTop: '0.4rem',
          fontSize: '0.75rem',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.3rem',
            color: isOverdue ? 'var(--crimson)' : 'var(--ink-soft)',
            fontWeight: isOverdue ? 700 : 400,
          }}
        >
          <Calendar size={13} />
          <span>
            {new Date(task.dueDate).toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
            })}
          </span>
        </div>

        {/* Accessible Keyboard Move Fallback */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
          {task.status !== 'completed' && (
            <button
              type="button"
              onClick={() => onStatusChange(task._id, 'completed')}
              className="btn btn-ghost"
              style={{
                padding: '0.2rem 0.4rem',
                fontSize: '0.7rem',
                color: 'var(--emerald)',
                gap: '0.2rem',
              }}
              title="Mark as completed"
            >
              <CheckCircle2 size={12} />
              <span>Done</span>
            </button>
          )}

          {task.status === 'pending' && (
            <button
              type="button"
              onClick={() => onStatusChange(task._id, 'in_progress')}
              className="btn btn-ghost"
              style={{
                padding: '0.2rem 0.4rem',
                fontSize: '0.7rem',
                color: 'var(--primary)',
                gap: '0.2rem',
              }}
              title="Move to in progress"
            >
              <ArrowRight size={12} />
              <span>Start</span>
            </button>
          )}

          {task.status === 'completed' && (
            <button
              type="button"
              onClick={() => onStatusChange(task._id, 'pending')}
              className="btn btn-ghost"
              style={{
                padding: '0.2rem 0.4rem',
                fontSize: '0.7rem',
                color: 'var(--brand-gold)',
                gap: '0.2rem',
              }}
              title="Reopen task"
            >
              <Clock size={12} />
              <span>Reopen</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => onDelete(task._id)}
            className="btn btn-ghost"
            style={{
              padding: '0.2rem 0.3rem',
              color: 'var(--crimson)',
            }}
            title="Delete task"
            aria-label="Delete task"
          >
            <Trash2 size={13} />
          </button>
        </div>
      </div>
    </div>
  );
}

// Visual Task Content inside DragOverlay
function TaskCardContent({ task }: { task: TaskItem }) {
  return (
    <div
      style={{
        backgroundColor: 'var(--surface)',
        borderRadius: 'var(--radius-md)',
        border: '1px solid var(--border)',
        padding: '0.85rem 1rem',
        boxShadow: 'var(--shadow-lg)',
        width: '280px',
      }}
    >
      <div style={{ display: 'flex', gap: '0.4rem', marginBottom: '0.4rem' }}>
        {task.subjectCode && <span className="badge badge-gold" style={{ fontSize: '0.7rem' }}>{task.subjectCode}</span>}
        <span className="badge badge-blue" style={{ fontSize: '0.7rem' }}>{task.priority}</span>
      </div>
      <h5 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 600, color: 'var(--ink)' }}>{task.title}</h5>
    </div>
  );
}

// List View Item
interface TaskListItemProps {
  task: TaskItem;
  onStatusChange: (id: string, status: TaskStatus) => void;
  onDelete: (id: string) => void;
}

function TaskListItem({ task, onStatusChange, onDelete }: TaskListItemProps) {
  const isCompleted = task.status === 'completed';
  const isOverdue = !isCompleted && new Date(task.dueDate).getTime() < Date.now();

  return (
    <div
      className="card"
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '1rem 1.25rem',
        opacity: isCompleted ? 0.75 : 1,
        borderLeft: isOverdue
          ? '4px solid var(--crimson)'
          : isCompleted
          ? '4px solid var(--emerald)'
          : '4px solid var(--brand-gold)',
        gap: '1rem',
        flexWrap: 'wrap',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flex: '1 1 300px' }}>
        <input
          type="checkbox"
          checked={isCompleted}
          onChange={() => onStatusChange(task._id, isCompleted ? 'pending' : 'completed')}
          style={{ width: '1.2rem', height: '1.2rem', cursor: 'pointer', accentColor: 'var(--emerald)' }}
        />
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap', marginBottom: '0.2rem' }}>
            <span
              style={{
                fontSize: '1rem',
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
                task.priority === 'high'
                  ? 'badge-red'
                  : task.priority === 'medium'
                  ? 'badge-gold'
                  : 'badge-green'
              }`}
            >
              {task.priority}
            </span>
            <span
              className={`badge ${
                task.status === 'completed'
                  ? 'badge-green'
                  : task.status === 'in_progress'
                  ? 'badge-blue'
                  : 'badge-gold'
              }`}
            >
              {task.status.replace('_', ' ')}
            </span>
            {isOverdue && (
              <span
                className="badge badge-red"
                style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', fontWeight: 700 }}
              >
                <AlertTriangle size={12} /> Overdue
              </span>
            )}
          </div>
          {task.description && <p style={{ fontSize: '0.85rem', color: 'var(--ink-soft)', margin: 0 }}>{task.description}</p>}
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
        <span
          style={{
            fontSize: '0.8rem',
            color: isOverdue ? 'var(--crimson)' : 'var(--ink-soft)',
            fontWeight: isOverdue ? 700 : 400,
          }}
        >
          Due {new Date(task.dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
        </span>

        <select
          value={task.status}
          onChange={(e) => onStatusChange(task._id, e.target.value as TaskStatus)}
          className="input-field"
          style={{ fontSize: '0.8rem', padding: '0.25rem 0.5rem' }}
        >
          <option value="pending">To Do</option>
          <option value="in_progress">In Progress</option>
          <option value="completed">Completed</option>
        </select>

        <button
          onClick={() => onDelete(task._id)}
          className="btn btn-ghost"
          style={{ color: 'var(--crimson)', padding: '0.3rem' }}
          title="Delete task"
        >
          <Trash2 size={16} />
        </button>
      </div>
    </div>
  );
}
