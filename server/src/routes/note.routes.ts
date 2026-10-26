import { Router, Response } from 'express';
import { z } from 'zod';
import { Types } from 'mongoose';
import { Note } from '../models/Note.js';
import { Subject } from '../models/Subject.js';
import { requireAuth, AuthenticatedRequest } from '../middleware/auth.middleware.js';

export const noteRouter = Router();

noteRouter.use(requireAuth);

const noteInputSchema = z.object({
  title: z.string().min(1, 'Note title cannot be empty').max(200).trim(),
  content: z.string().max(50000).optional().default(''),
  subjectId: z.string().optional().nullable(),
  tags: z.array(z.string().trim()).optional().default([]),
  isPinned: z.boolean().optional().default(false),
});

const updateNoteSchema = noteInputSchema.partial();

// GET /api/notes
noteRouter.get('/', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const userId = req.user!._id;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const query: any = { userId };

  if (req.query.q) {
    const searchTerm = String(req.query.q).trim();
    query.$or = [
      { title: { $regex: searchTerm, $options: 'i' } },
      { content: { $regex: searchTerm, $options: 'i' } },
      { tags: { $in: [new RegExp(searchTerm, 'i')] } },
    ];
  }

  if (req.query.tag) {
    query.tags = String(req.query.tag);
  }

  if (req.query.subjectId && Types.ObjectId.isValid(String(req.query.subjectId))) {
    query.subjectId = req.query.subjectId;
  }

  const notes = await Note.find(query).sort({ isPinned: -1, updatedAt: -1 });
  res.status(200).json({ status: 'ok', count: notes.length, data: notes });
});

// POST /api/notes
noteRouter.post('/', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const parseResult = noteInputSchema.safeParse(req.body);
  if (!parseResult.success) {
    res.status(400).json({
      status: 'error',
      statusCode: 400,
      message: parseResult.error.issues.map((i) => i.message).join('. '),
    });
    return;
  }

  const { title, content, subjectId, tags, isPinned } = parseResult.data;
  let validSubjectId = null;
  let subjectCode = '';

  if (subjectId && Types.ObjectId.isValid(subjectId)) {
    const subject = await Subject.findOne({ _id: subjectId, userId: req.user!._id });
    if (subject) {
      validSubjectId = subject._id;
      subjectCode = subject.code;
    }
  }

  const note = await Note.create({
    userId: req.user!._id,
    title,
    content,
    subjectId: validSubjectId,
    subjectCode,
    tags,
    isPinned,
  });

  res.status(201).json({ status: 'ok', data: note });
});

// GET /api/notes/:id
noteRouter.get('/:id', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  if (!Types.ObjectId.isValid(req.params.id)) {
    res.status(400).json({ status: 'error', statusCode: 400, message: 'Invalid note ID' });
    return;
  }

  const note = await Note.findOne({ _id: req.params.id, userId: req.user!._id });
  if (!note) {
    res.status(404).json({ status: 'error', statusCode: 404, message: 'Note not found' });
    return;
  }

  res.status(200).json({ status: 'ok', data: note });
});

// PUT & PATCH /api/notes/:id
const updateHandler = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  if (!Types.ObjectId.isValid(req.params.id)) {
    res.status(400).json({ status: 'error', statusCode: 400, message: 'Invalid note ID' });
    return;
  }

  const parseResult = updateNoteSchema.safeParse(req.body);
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

  if (updates.subjectId) {
    const subject = await Subject.findOne({ _id: updates.subjectId, userId: req.user!._id });
    if (subject) {
      updates.subjectCode = subject.code;
    }
  } else if (updates.subjectId === null) {
    updates.subjectCode = '';
  }

  const updated = await Note.findOneAndUpdate(
    { _id: req.params.id, userId: req.user!._id },
    { $set: updates },
    { new: true, runValidators: true }
  );

  if (!updated) {
    res.status(404).json({ status: 'error', statusCode: 404, message: 'Note not found' });
    return;
  }

  res.status(200).json({ status: 'ok', data: updated });
};

noteRouter.put('/:id', updateHandler);
noteRouter.patch('/:id', updateHandler);

// DELETE /api/notes/:id
noteRouter.delete('/:id', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  if (!Types.ObjectId.isValid(req.params.id)) {
    res.status(400).json({ status: 'error', statusCode: 400, message: 'Invalid note ID' });
    return;
  }

  const deleted = await Note.findOneAndDelete({ _id: req.params.id, userId: req.user!._id });
  if (!deleted) {
    res.status(404).json({ status: 'error', statusCode: 404, message: 'Note not found' });
    return;
  }

  res.status(200).json({ status: 'ok', message: 'Note deleted successfully' });
});
