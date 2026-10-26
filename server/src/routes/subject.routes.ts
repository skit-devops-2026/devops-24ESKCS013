import { Router, Response } from 'express';
import { z } from 'zod';
import { Types } from 'mongoose';
import { Subject } from '../models/Subject.js';
import { Task } from '../models/Task.js';
import { Note } from '../models/Note.js';
import { requireAuth, AuthenticatedRequest } from '../middleware/auth.middleware.js';

export const subjectRouter = Router();

// Protect all subject routes with authentication
subjectRouter.use(requireAuth);

const subjectSchema = z.object({
  code: z.string().min(2, 'Subject code must be at least 2 characters').max(20).trim().toUpperCase(),
  name: z.string().min(2, 'Subject name must be at least 2 characters').max(100).trim(),
  credits: z.coerce.number().int().min(1, 'Credits must be at least 1').max(10).default(3),
  semester: z.coerce.number().int().min(1).max(8).default(1),
  facultyName: z.string().trim().max(100).optional().default(''),
  attendancePercentage: z.coerce.number().min(0).max(100).optional().default(85),
  syllabusProgress: z.coerce.number().min(0).max(100).optional().default(0),
  color: z.string().optional().default('#D69A2D'),
});

const updateSubjectSchema = subjectSchema.partial();

// GET /api/subjects
subjectRouter.get('/', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const subjects = await Subject.find({ userId: req.user!._id }).sort({ code: 1 });
  res.status(200).json({ status: 'ok', count: subjects.length, data: subjects });
});

// POST /api/subjects
subjectRouter.post('/', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const parseResult = subjectSchema.safeParse(req.body);
  if (!parseResult.success) {
    res.status(400).json({
      status: 'error',
      statusCode: 400,
      message: parseResult.error.issues.map((i) => i.message).join('. '),
    });
    return;
  }

  const { code, name, credits, semester, facultyName, attendancePercentage, color } = parseResult.data;

  // Check duplicate code for this specific student
  const existing = await Subject.findOne({ userId: req.user!._id, code });
  if (existing) {
    res.status(409).json({
      status: 'error',
      statusCode: 409,
      message: `You already have a subject with code ${code}.`,
    });
    return;
  }

  const subject = await Subject.create({
    userId: req.user!._id,
    code,
    name,
    credits,
    semester,
    facultyName,
    attendancePercentage,
    color,
  });

  res.status(201).json({ status: 'ok', data: subject });
});

// GET /api/subjects/:id
subjectRouter.get('/:id', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  if (!Types.ObjectId.isValid(req.params.id)) {
    res.status(400).json({ status: 'error', statusCode: 400, message: 'Invalid subject ID' });
    return;
  }

  const subject = await Subject.findOne({ _id: req.params.id, userId: req.user!._id });
  if (!subject) {
    res.status(404).json({ status: 'error', statusCode: 404, message: 'Subject not found' });
    return;
  }

  // Fetch linked tasks & notes for deep-dive page
  const [tasks, notes] = await Promise.all([
    Task.find({ userId: req.user!._id, subjectId: subject._id }).sort({ dueDate: 1 }).limit(10),
    Note.find({ userId: req.user!._id, subjectId: subject._id }).sort({ updatedAt: -1 }).limit(10),
  ]);

  res.status(200).json({
    status: 'ok',
    data: {
      ...subject.toObject(),
      tasks,
      notes,
    },
  });
});

// PATCH /api/subjects/:id
subjectRouter.patch('/:id', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  if (!Types.ObjectId.isValid(req.params.id)) {
    res.status(400).json({ status: 'error', statusCode: 400, message: 'Invalid subject ID' });
    return;
  }

  const parseResult = updateSubjectSchema.safeParse(req.body);
  if (!parseResult.success) {
    res.status(400).json({
      status: 'error',
      statusCode: 400,
      message: parseResult.error.issues.map((i) => i.message).join('. '),
    });
    return;
  }

  // If changing code, check duplicate
  if (parseResult.data.code) {
    const existing = await Subject.findOne({
      userId: req.user!._id,
      code: parseResult.data.code,
      _id: { $ne: req.params.id },
    });
    if (existing) {
      res.status(409).json({
        status: 'error',
        statusCode: 409,
        message: `Another subject already uses code ${parseResult.data.code}.`,
      });
      return;
    }
  }

  const updated = await Subject.findOneAndUpdate(
    { _id: req.params.id, userId: req.user!._id },
    { $set: parseResult.data },
    { returnDocument: 'after', runValidators: true }
  );

  if (!updated) {
    res.status(404).json({ status: 'error', statusCode: 404, message: 'Subject not found' });
    return;
  }

  res.status(200).json({ status: 'ok', data: updated });
});

// DELETE /api/subjects/:id
subjectRouter.delete('/:id', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  if (!Types.ObjectId.isValid(req.params.id)) {
    res.status(400).json({ status: 'error', statusCode: 400, message: 'Invalid subject ID' });
    return;
  }

  const subject = await Subject.findOneAndDelete({ _id: req.params.id, userId: req.user!._id });
  if (!subject) {
    res.status(404).json({ status: 'error', statusCode: 404, message: 'Subject not found' });
    return;
  }

  // Unlink deleted subject from dependent tasks and notes without dropping records
  await Promise.all([
    Task.updateMany({ userId: req.user!._id, subjectId: subject._id }, { $set: { subjectId: null, subjectCode: '' } }),
    Note.updateMany({ userId: req.user!._id, subjectId: subject._id }, { $set: { subjectId: null, subjectCode: '' } }),
  ]);

  res.status(200).json({ status: 'ok', message: 'Subject deleted and associations safely cleared.' });
});
