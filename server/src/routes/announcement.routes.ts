import { Router, Response } from 'express';
import mongoose from 'mongoose';
import { z } from 'zod';
import { requireAuth, requireRole, AuthenticatedRequest } from '../middleware/auth.middleware.js';
import { Announcement } from '../models/Announcement.js';

export const announcementRouter = Router();

// Announcements require authentication
announcementRouter.use(requireAuth);

const createAnnouncementSchema = z.object({
  title: z
    .string()
    .trim()
    .min(3, 'Title must be at least 3 characters')
    .max(200, 'Title cannot exceed 200 characters'),
  content: z
    .string()
    .trim()
    .min(5, 'Content must be at least 5 characters')
    .max(5000, 'Content cannot exceed 5000 characters'),
  priority: z.enum(['normal', 'urgent'] as const).default('normal'),
  targetAudience: z.enum(['all', 'students', 'faculty'] as const).default('all'),
  status: z.enum(['draft', 'published'] as const).default('published'),
  expiresAt: z.string().datetime().optional().nullable(),
});

/**
 * POST /api/announcements
 * Admin only: Create campus announcement
 */
announcementRouter.post(
  '/',
  requireRole('admin'),
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const parseResult = createAnnouncementSchema.safeParse(req.body);
      if (!parseResult.success) {
        res.status(400).json({
          status: 'error',
          statusCode: 400,
          message: parseResult.error.errors[0]?.message || 'Invalid announcement data.',
        });
        return;
      }

      const { title, content, priority, targetAudience, status, expiresAt } = parseResult.data;

      const announcement = await Announcement.create({
        title,
        content,
        priority,
        targetAudience,
        status,
        authorId: req.user!._id,
        publishedAt: status === 'published' ? new Date() : null,
        expiresAt: expiresAt ? new Date(expiresAt) : null,
      });

      res.status(201).json({
        status: 'ok',
        message: 'Announcement created successfully.',
        data: announcement,
      });
    } catch (error: unknown) {
      res.status(500).json({
        status: 'error',
        statusCode: 500,
        message: error instanceof Error ? error.message : 'Failed to create announcement',
      });
    }
  }
);

/**
 * GET /api/announcements
 * View announcements with audience and publication filtering
 */
announcementRouter.get('/', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const page = Math.max(1, parseInt(req.query.page as string, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string, 10) || 10));
    const skip = (page - 1) * limit;

    const filter: Record<string, unknown> = {};

    // Students only see published, unexpired announcements targeted to them or 'all'
    if (req.user!.role === 'student') {
      filter.status = 'published';
      filter.targetAudience = { $in: ['all', 'students'] };
      filter.$or = [{ expiresAt: null }, { expiresAt: { $gt: new Date() } }];
    } else {
      // Admins can filter by status, priority, or targetAudience
      const status = req.query.status as string;
      const priority = req.query.priority as string;
      const targetAudience = req.query.targetAudience as string;

      if (status && ['draft', 'published'].includes(status)) {
        filter.status = status;
      }
      if (priority && ['normal', 'urgent'].includes(priority)) {
        filter.priority = priority;
      }
      if (targetAudience && ['all', 'students', 'faculty'].includes(targetAudience)) {
        filter.targetAudience = targetAudience;
      }
    }

    const total = await Announcement.countDocuments(filter);
    const announcements = await Announcement.find(filter)
      .sort({ priority: -1, createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('authorId', 'name email role')
      .lean();

    res.status(200).json({
      status: 'ok',
      data: announcements,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit) || 1,
      },
    });
  } catch (error: unknown) {
    res.status(500).json({
      status: 'error',
      statusCode: 500,
      message: error instanceof Error ? error.message : 'Failed to retrieve announcements',
    });
  }
});

/**
 * DELETE /api/announcements/:id
 * Admin only: Delete an announcement
 */
announcementRouter.delete(
  '/:id',
  requireRole('admin'),
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      if (!mongoose.Types.ObjectId.isValid(id)) {
        res
          .status(400)
          .json({ status: 'error', statusCode: 400, message: 'Invalid announcement ID format.' });
        return;
      }

      const deleted = await Announcement.findByIdAndDelete(id);
      if (!deleted) {
        res
          .status(404)
          .json({ status: 'error', statusCode: 404, message: 'Announcement record not found.' });
        return;
      }

      res.status(200).json({
        status: 'ok',
        message: 'Announcement deleted successfully.',
      });
    } catch (error: unknown) {
      res.status(500).json({
        status: 'error',
        statusCode: 500,
        message: error instanceof Error ? error.message : 'Failed to delete announcement',
      });
    }
  }
);
