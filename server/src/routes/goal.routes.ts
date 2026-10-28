import { Router, Response } from 'express';
import { z } from 'zod';
import { Types } from 'mongoose';
import { Goal, IGoal } from '../models/Goal.js';
import { Subject } from '../models/Subject.js';
import { Task } from '../models/Task.js';
import { StudySession } from '../models/StudySession.js';
import { requireAuth, AuthenticatedRequest } from '../middleware/auth.middleware.js';

export const goalRouter = Router();

goalRouter.use(requireAuth);

type MongoQueryFilter = Record<string, unknown>;

const goalInputSchema = z.object({
  title: z.string().min(1, 'Goal title cannot be empty').max(200).trim(),
  description: z.string().max(1000).optional().default(''),
  targetDate: z.string().refine((val) => !isNaN(Date.parse(val)), {
    message: 'Please provide a valid target date',
  }),
  targetValue: z.coerce.number().min(1, 'Target value must be at least 1').default(100),
  currentValue: z.coerce.number().min(0, 'Current progress cannot be negative').default(0),
  unit: z.string().trim().max(20).optional().default('%'),
  category: z.string().trim().max(50).optional().default('Academic'),
  subjectId: z.string().optional().nullable(),
  subjectCode: z.string().trim().optional().default(''),
  autoLinkMetric: z.enum(['none', 'attendance', 'task_completion', 'study_hours']).optional().default('none'),
  status: z.enum(['active', 'completed', 'abandoned']).optional().default('active'),
});

const updateGoalSchema = goalInputSchema.partial();

/**
 * Synchronizes auto-linked goals with live academic data:
 * - attendance: auto-updates currentValue from linked Subject's attendancePercentage
 * - task_completion: auto-updates currentValue from completed tasks
 * - study_hours: auto-updates currentValue from completed focus study hours
 */
async function syncAutoLinkedGoals(goals: IGoal[], userId: Types.ObjectId): Promise<void> {
  for (const goal of goals) {
    if (!goal.autoLinkMetric || goal.autoLinkMetric === 'none') continue;

    let newValue = goal.currentValue;

    if (goal.autoLinkMetric === 'attendance' && goal.subjectId) {
      const subject = await Subject.findOne({ _id: goal.subjectId, userId });
      if (subject) {
        newValue = subject.attendancePercentage;
      }
    } else if (goal.autoLinkMetric === 'task_completion') {
      const taskFilter: MongoQueryFilter = { userId, status: 'completed' };
      if (goal.subjectId) {
        taskFilter.subjectId = goal.subjectId;
      }
      const count = await Task.countDocuments(taskFilter);
      newValue = count;
    } else if (goal.autoLinkMetric === 'study_hours') {
      const sessionFilter: MongoQueryFilter = { userId, status: 'completed' };
      if (goal.subjectId) {
        sessionFilter.subjectId = goal.subjectId;
      }
      const sessions = await StudySession.find(sessionFilter);
      const totalSeconds = sessions.reduce((acc, s) => acc + (s.durationSeconds || 0), 0);
      newValue = Number((totalSeconds / 3600).toFixed(1));
    }

    if (newValue !== goal.currentValue) {
      goal.currentValue = newValue;
      if (goal.currentValue >= goal.targetValue && goal.status === 'active') {
        goal.status = 'completed';
      }
      await Goal.updateOne(
        { _id: goal._id, userId },
        { $set: { currentValue: goal.currentValue, status: goal.status } }
      );
    }
  }
}

// GET /api/goals/summary
goalRouter.get('/summary', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const userId = req.user!._id;
  const goals = await Goal.find({ userId });

  // Sync auto-linked goals before returning summary
  await syncAutoLinkedGoals(goals, userId);

  const total = goals.length;
  const active = goals.filter((g) => g.status === 'active').length;
  const completed = goals.filter((g) => g.status === 'completed').length;
  const abandoned = goals.filter((g) => g.status === 'abandoned').length;

  let averageProgress = 0;
  if (total > 0) {
    const sum = goals.reduce((acc, g) => {
      const pct = Math.min(100, Math.round((g.currentValue / Math.max(1, g.targetValue)) * 100));
      return acc + pct;
    }, 0);
    averageProgress = Math.round(sum / total);
  }

  res.status(200).json({
    status: 'ok',
    data: {
      total,
      active,
      completed,
      abandoned,
      averageProgress,
    },
  });
});

// GET /api/goals
goalRouter.get('/', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const query: MongoQueryFilter = { userId: req.user!._id };
  if (req.query.status) {
    query.status = String(req.query.status);
  }
  const goals = await Goal.find(query).sort({ targetDate: 1 });

  // Sync auto-linked goals with live metrics
  await syncAutoLinkedGoals(goals, req.user!._id);

  res.status(200).json({ status: 'ok', count: goals.length, data: goals });
});

// POST /api/goals
goalRouter.post('/', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const parseResult = goalInputSchema.safeParse(req.body);
  if (!parseResult.success) {
    res.status(400).json({
      status: 'error',
      statusCode: 400,
      message: parseResult.error.issues.map((i) => i.message).join('. '),
    });
    return;
  }

  const {
    title,
    description,
    targetDate,
    targetValue,
    currentValue,
    unit,
    category,
    subjectId,
    subjectCode,
    autoLinkMetric,
    status,
  } = parseResult.data;

  let resolvedSubjectCode = subjectCode;
  let parsedSubjectId: Types.ObjectId | null = null;

  if (subjectId && Types.ObjectId.isValid(subjectId)) {
    parsedSubjectId = new Types.ObjectId(subjectId);
    const sub = await Subject.findOne({ _id: parsedSubjectId, userId: req.user!._id });
    if (sub) {
      resolvedSubjectCode = sub.code;
    }
  }

  // Auto-complete if currentValue >= targetValue
  const initialStatus = currentValue >= targetValue ? 'completed' : status;

  const goal = await Goal.create({
    userId: req.user!._id,
    title,
    description,
    targetDate: new Date(targetDate),
    targetValue,
    currentValue,
    unit,
    category,
    subjectId: parsedSubjectId,
    subjectCode: resolvedSubjectCode,
    autoLinkMetric,
    status: initialStatus,
  });

  res.status(201).json({ status: 'ok', data: goal });
});

// GET /api/goals/:id
goalRouter.get('/:id', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  if (!Types.ObjectId.isValid(req.params.id)) {
    res.status(400).json({ status: 'error', statusCode: 400, message: 'Invalid goal ID' });
    return;
  }

  const goal = await Goal.findOne({ _id: req.params.id, userId: req.user!._id });
  if (!goal) {
    res.status(404).json({ status: 'error', statusCode: 404, message: 'Goal not found' });
    return;
  }

  await syncAutoLinkedGoals([goal], req.user!._id);

  res.status(200).json({ status: 'ok', data: goal });
});

// PATCH /api/goals/:id
goalRouter.patch('/:id', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  if (!Types.ObjectId.isValid(req.params.id)) {
    res.status(400).json({ status: 'error', statusCode: 400, message: 'Invalid goal ID' });
    return;
  }

  const parseResult = updateGoalSchema.safeParse(req.body);
  if (!parseResult.success) {
    res.status(400).json({
      status: 'error',
      statusCode: 400,
      message: parseResult.error.issues.map((i) => i.message).join('. '),
    });
    return;
  }

  const updates: Partial<IGoal> = { ...parseResult.data } as Partial<IGoal>;
  if (parseResult.data.targetDate) {
    updates.targetDate = new Date(parseResult.data.targetDate);
  }

  const existingGoal = await Goal.findOne({ _id: req.params.id, userId: req.user!._id });
  if (!existingGoal) {
    res.status(404).json({ status: 'error', statusCode: 404, message: 'Goal not found' });
    return;
  }

  const targetVal = updates.targetValue !== undefined ? updates.targetValue : existingGoal.targetValue;
  const currentVal = updates.currentValue !== undefined ? updates.currentValue : existingGoal.currentValue;

  if (currentVal >= targetVal && !updates.status) {
    updates.status = 'completed';
  }

  const updated = await Goal.findOneAndUpdate(
    { _id: req.params.id, userId: req.user!._id },
    { $set: updates },
    { returnDocument: 'after', runValidators: true }
  );

  res.status(200).json({ status: 'ok', data: updated });
});

// DELETE /api/goals/:id
goalRouter.delete('/:id', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  if (!Types.ObjectId.isValid(req.params.id)) {
    res.status(400).json({ status: 'error', statusCode: 400, message: 'Invalid goal ID' });
    return;
  }

  const deleted = await Goal.findOneAndDelete({ _id: req.params.id, userId: req.user!._id });
  if (!deleted) {
    res.status(404).json({ status: 'error', statusCode: 404, message: 'Goal not found' });
    return;
  }

  res.status(200).json({ status: 'ok', message: 'Goal deleted successfully' });
});
