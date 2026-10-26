import { Router, Response } from 'express';
import { z } from 'zod';
import { Types } from 'mongoose';
import { Goal } from '../models/Goal.js';
import { requireAuth, AuthenticatedRequest } from '../middleware/auth.middleware.js';

export const goalRouter = Router();

goalRouter.use(requireAuth);

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
  status: z.enum(['active', 'completed', 'abandoned']).optional().default('active'),
});

const updateGoalSchema = goalInputSchema.partial();

// GET /api/goals/summary
goalRouter.get('/summary', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const userId = req.user!._id;
  const goals = await Goal.find({ userId });

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
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const query: any = { userId: req.user!._id };
  if (req.query.status) {
    query.status = req.query.status;
  }
  const goals = await Goal.find(query).sort({ targetDate: 1 });
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

  const { title, description, targetDate, targetValue, currentValue, unit, category, status } =
    parseResult.data;

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

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const updates: any = { ...parseResult.data };
  if (updates.targetDate) {
    updates.targetDate = new Date(updates.targetDate);
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
