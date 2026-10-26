import { Router, Response } from 'express';
import { z } from 'zod';
import { Types } from 'mongoose';
import { StudySession } from '../models/StudySession.js';
import { Subject } from '../models/Subject.js';
import { requireAuth, AuthenticatedRequest } from '../middleware/auth.middleware.js';

export const studyRouter = Router();

studyRouter.use(requireAuth);

const startSessionSchema = z.object({
  subjectId: z.string().optional().nullable(),
  title: z.string().max(100).optional().default('Focused Study Session'),
});

function calculateElapsedSeconds(session: {
  status: string;
  startTime: Date;
  lastPauseTime?: Date;
  pausedSeconds: number;
}): number {
  const startMs = new Date(session.startTime).getTime();
  const pausedMs = (session.pausedSeconds || 0) * 1000;

  if (session.status === 'paused' && session.lastPauseTime) {
    const pauseMs = new Date(session.lastPauseTime).getTime();
    return Math.max(0, Math.floor((pauseMs - startMs - pausedMs) / 1000));
  }

  const nowMs = Date.now();
  return Math.max(0, Math.floor((nowMs - startMs - pausedMs) / 1000));
}

// GET /api/study/current - Authoritative server state for browser refresh resilience
studyRouter.get('/current', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const current = await StudySession.findOne({
    userId: req.user!._id,
    status: { $in: ['active', 'paused'] },
  });

  if (!current) {
    res.status(200).json({ status: 'ok', active: false, session: null });
    return;
  }

  const elapsedSeconds = calculateElapsedSeconds(current);

  res.status(200).json({
    status: 'ok',
    active: true,
    session: {
      ...current.toObject(),
      elapsedSeconds,
    },
  });
});

// POST /api/study/start - Prevent duplicate or overlapping sessions
studyRouter.post('/start', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const parseResult = startSessionSchema.safeParse(req.body);
  if (!parseResult.success) {
    res.status(400).json({ status: 'error', statusCode: 400, message: 'Invalid session input' });
    return;
  }

  const { subjectId, title } = parseResult.data;

  // Check for existing active or paused session
  const existing = await StudySession.findOne({
    userId: req.user!._id,
    status: { $in: ['active', 'paused'] },
  });

  if (existing) {
    res.status(409).json({
      status: 'error',
      statusCode: 409,
      message: 'You already have an active study session in progress. Please complete or cancel it first.',
      session: existing,
    });
    return;
  }

  let validSubjectId = null;
  let subjectCode = '';
  if (subjectId && Types.ObjectId.isValid(subjectId)) {
    const subject = await Subject.findOne({ _id: subjectId, userId: req.user!._id });
    if (subject) {
      validSubjectId = subject._id;
      subjectCode = subject.code;
    }
  }

  const session = new StudySession({
    userId: req.user!._id,
    subjectId: validSubjectId,
    subjectCode,
    title,
    status: 'active',
    startTime: new Date(),
    pausedSeconds: 0,
    durationSeconds: 0,
  });
  await session.save();

  res.status(201).json({
    status: 'ok',
    session: {
      ...session.toObject(),
      elapsedSeconds: 0,
    },
  });
});

// POST /api/study/pause
studyRouter.post('/pause', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const session = await StudySession.findOne({
    userId: req.user!._id,
    status: 'active',
  });

  if (!session) {
    res.status(400).json({ status: 'error', statusCode: 400, message: 'No active session found to pause.' });
    return;
  }

  session.status = 'paused';
  session.lastPauseTime = new Date();
  await session.save();

  const elapsedSeconds = calculateElapsedSeconds(session);

  res.status(200).json({
    status: 'ok',
    session: {
      ...session.toObject(),
      elapsedSeconds,
    },
  });
});

// POST /api/study/resume
studyRouter.post('/resume', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const session = await StudySession.findOne({
    userId: req.user!._id,
    status: 'paused',
  });

  if (!session) {
    res.status(400).json({ status: 'error', statusCode: 400, message: 'No paused session found to resume.' });
    return;
  }

  if (session.lastPauseTime) {
    const pauseDuration = Math.max(0, Math.floor((Date.now() - new Date(session.lastPauseTime).getTime()) / 1000));
    session.pausedSeconds += pauseDuration;
  }

  session.status = 'active';
  session.lastPauseTime = undefined;
  await session.save();

  const elapsedSeconds = calculateElapsedSeconds(session);

  res.status(200).json({
    status: 'ok',
    session: {
      ...session.toObject(),
      elapsedSeconds,
    },
  });
});

// POST /api/study/finish
studyRouter.post('/finish', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const session = await StudySession.findOne({
    userId: req.user!._id,
    status: { $in: ['active', 'paused'] },
  });

  if (!session) {
    res.status(400).json({ status: 'error', statusCode: 400, message: 'No active or paused session to finish.' });
    return;
  }

  const durationSeconds = calculateElapsedSeconds(session);
  session.durationSeconds = durationSeconds;
  session.endTime = new Date();
  session.status = 'completed';
  session.lastPauseTime = undefined;
  await session.save();

  res.status(200).json({
    status: 'ok',
    message: 'Study session finished and persisted successfully.',
    session,
  });
});

// POST /api/study/cancel
studyRouter.post('/cancel', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const session = await StudySession.findOne({
    userId: req.user!._id,
    status: { $in: ['active', 'paused'] },
  });

  if (!session) {
    res.status(400).json({ status: 'error', statusCode: 400, message: 'No active session to cancel.' });
    return;
  }

  session.status = 'cancelled';
  session.endTime = new Date();
  await session.save();

  res.status(200).json({ status: 'ok', message: 'Study session cancelled.' });
});

// GET /api/study/history - Past study logs and analytics summary
studyRouter.get('/history', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const sessions = await StudySession.find({
    userId: req.user!._id,
    status: 'completed',
  }).sort({ endTime: -1 });

  const totalSeconds = sessions.reduce((acc, s) => acc + (s.durationSeconds || 0), 0);
  const totalMinutes = Math.round(totalSeconds / 60);

  res.status(200).json({
    status: 'ok',
    summary: {
      totalSessions: sessions.length,
      totalSeconds,
      totalMinutes,
      totalHoursFormatted: (totalMinutes / 60).toFixed(1),
    },
    count: sessions.length,
    data: sessions,
  });
});
