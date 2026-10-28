import { Router, Response } from 'express';
import { z } from 'zod';
import { Types } from 'mongoose';
import { Task, ITask } from '../models/Task.js';
import { Subject } from '../models/Subject.js';
import { requireAuth, AuthenticatedRequest } from '../middleware/auth.middleware.js';

export const taskRouter = Router();

taskRouter.use(requireAuth);

type MongoQueryFilter = Record<string, unknown>;

const taskInputSchema = z.object({
  title: z.string().min(1, 'Task title cannot be empty').max(200).trim(),
  description: z.string().max(2000).optional().default(''),
  status: z.enum(['pending', 'in_progress', 'completed']).optional().default('pending'),
  priority: z.enum(['low', 'medium', 'high']).optional().default('medium'),
  dueDate: z.string().refine((val) => !isNaN(Date.parse(val)), {
    message: 'Please provide a valid ISO due date',
  }),
  subjectId: z.string().optional().nullable(),
});

const updateTaskSchema = taskInputSchema.partial();

// GET /api/tasks/summary
taskRouter.get('/summary', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const userId = req.user!._id;
  const now = new Date();

  const [total, pending, inProgress, completed, overdue] = await Promise.all([
    Task.countDocuments({ userId }),
    Task.countDocuments({ userId, status: 'pending' }),
    Task.countDocuments({ userId, status: 'in_progress' }),
    Task.countDocuments({ userId, status: 'completed' }),
    Task.countDocuments({ userId, status: { $ne: 'completed' }, dueDate: { $lt: now } }),
  ]);

  res.status(200).json({
    status: 'ok',
    data: {
      total,
      pending,
      inProgress,
      completed,
      overdue,
    },
  });
});

// GET /api/tasks
taskRouter.get('/', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const userId = req.user!._id;
  const query: MongoQueryFilter = { userId };

  if (req.query.status) {
    query.status = req.query.status;
  }
  if (req.query.priority) {
    query.priority = req.query.priority;
  }
  if (req.query.subjectId && Types.ObjectId.isValid(String(req.query.subjectId))) {
    query.subjectId = req.query.subjectId;
  }
  if (req.query.overdue === 'true') {
    query.status = { $ne: 'completed' };
    query.dueDate = { $lt: new Date() };
  }

  const tasks = await Task.find(query).sort({ dueDate: 1 });
  res.status(200).json({ status: 'ok', count: tasks.length, data: tasks });
});

// POST /api/tasks
taskRouter.post('/', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const parseResult = taskInputSchema.safeParse(req.body);
  if (!parseResult.success) {
    res.status(400).json({
      status: 'error',
      statusCode: 400,
      message: parseResult.error.issues.map((i) => i.message).join('. '),
    });
    return;
  }

  const { title, description, status, priority, dueDate, subjectId } = parseResult.data;
  let subjectCode = '';
  let validSubjectId = null;

  if (subjectId && Types.ObjectId.isValid(subjectId)) {
    const subject = await Subject.findOne({ _id: subjectId, userId: req.user!._id });
    if (subject) {
      validSubjectId = subject._id;
      subjectCode = subject.code;
    }
  }

  const task = await Task.create({
    userId: req.user!._id,
    title,
    description,
    status,
    priority,
    dueDate: new Date(dueDate),
    subjectId: validSubjectId,
    subjectCode,
  });

  res.status(201).json({ status: 'ok', data: task });
});

// GET /api/tasks/:id
taskRouter.get('/:id', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  if (!Types.ObjectId.isValid(req.params.id)) {
    res.status(400).json({ status: 'error', statusCode: 400, message: 'Invalid task ID' });
    return;
  }

  const task = await Task.findOne({ _id: req.params.id, userId: req.user!._id });
  if (!task) {
    res.status(404).json({ status: 'error', statusCode: 404, message: 'Task not found' });
    return;
  }

  res.status(200).json({ status: 'ok', data: task });
});

// PATCH /api/tasks/:id
taskRouter.patch('/:id', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  if (!Types.ObjectId.isValid(req.params.id)) {
    res.status(400).json({ status: 'error', statusCode: 400, message: 'Invalid task ID' });
    return;
  }

  const parseResult = updateTaskSchema.safeParse(req.body);
  if (!parseResult.success) {
    res.status(400).json({
      status: 'error',
      statusCode: 400,
      message: parseResult.error.issues.map((i) => i.message).join('. '),
    });
    return;
  }

  const updates: Partial<ITask> = { ...parseResult.data } as Partial<ITask>;
  if (updates.dueDate) {
    updates.dueDate = new Date(updates.dueDate);
  }

  if (updates.subjectId) {
    const subject = await Subject.findOne({ _id: updates.subjectId, userId: req.user!._id });
    if (subject) {
      updates.subjectCode = subject.code;
    }
  } else if (updates.subjectId === null) {
    updates.subjectCode = '';
  }

  const updated = await Task.findOneAndUpdate(
    { _id: req.params.id, userId: req.user!._id },
    { $set: updates },
    { returnDocument: 'after', runValidators: true }
  );

  if (!updated) {
    res.status(404).json({ status: 'error', statusCode: 404, message: 'Task not found' });
    return;
  }

  res.status(200).json({ status: 'ok', data: updated });
});

// DELETE /api/tasks/:id
taskRouter.delete('/:id', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  if (!Types.ObjectId.isValid(req.params.id)) {
    res.status(400).json({ status: 'error', statusCode: 400, message: 'Invalid task ID' });
    return;
  }

  const deleted = await Task.findOneAndDelete({ _id: req.params.id, userId: req.user!._id });
  if (!deleted) {
    res.status(404).json({ status: 'error', statusCode: 404, message: 'Task not found' });
    return;
  }

  res.status(200).json({ status: 'ok', message: 'Task deleted successfully' });
});
