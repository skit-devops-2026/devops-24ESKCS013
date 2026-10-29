import { Router, Response } from 'express';
import mongoose from 'mongoose';
import { z } from 'zod';
import { requireAuth, requireRole, AuthenticatedRequest } from '../middleware/auth.middleware.js';
import { Resource } from '../models/Resource.js';
import { escapeRegExp } from '../utils/security.js';

export const resourceRouter = Router();

// Resources require authentication
resourceRouter.use(requireAuth);

const SAFE_HTTP_URL_REGEX = /^https?:\/\/[^\s$.?#].[^\s]*$/i;

const createResourceSchema = z.object({
  title: z
    .string()
    .trim()
    .min(3, 'Title must be at least 3 characters')
    .max(200, 'Title cannot exceed 200 characters'),
  description: z
    .string()
    .trim()
    .min(5, 'Description must be at least 5 characters')
    .max(2000, 'Description cannot exceed 2000 characters'),
  resourceType: z.enum(
    ['notes', 'syllabus', 'question_paper', 'lab_manual', 'reference'] as const,
    {
      errorMap: () => ({ message: 'Invalid resource type' }),
    }
  ),
  url: z
    .string()
    .trim()
    .refine((val) => SAFE_HTTP_URL_REGEX.test(val), {
      message:
        'Resource URL must be a valid http:// or https:// URL. Local or unsafe protocols are disallowed.',
    }),
  subjectId: z
    .string()
    .refine((val) => mongoose.Types.ObjectId.isValid(val), { message: 'Invalid subject ID' })
    .optional()
    .nullable(),
  department: z.string().trim().max(100).optional().nullable(),
  semester: z.number().int().min(1).max(8).optional().nullable(),
  status: z.enum(['draft', 'published'] as const).default('published'),
});

/**
 * POST /api/resources
 * Admin only: Publish institutional resource
 */
resourceRouter.post(
  '/',
  requireRole('admin'),
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const parseResult = createResourceSchema.safeParse(req.body);
      if (!parseResult.success) {
        res.status(400).json({
          status: 'error',
          statusCode: 400,
          message: parseResult.error.errors[0]?.message || 'Invalid resource data.',
        });
        return;
      }

      const { title, description, resourceType, url, subjectId, department, semester, status } =
        parseResult.data;

      const resource = await Resource.create({
        title,
        description,
        resourceType,
        url,
        subjectId: subjectId ? new mongoose.Types.ObjectId(subjectId) : null,
        department: department || null,
        semester: semester || null,
        status,
        uploadedBy: req.user!._id,
      });

      res.status(201).json({
        status: 'ok',
        message: 'Resource published successfully.',
        data: resource,
      });
    } catch (error: unknown) {
      res.status(500).json({
        status: 'error',
        statusCode: 500,
        message: error instanceof Error ? error.message : 'Failed to create resource',
      });
    }
  }
);

/**
 * GET /api/resources
 * Query resources with role-aware visibility and filters
 */
resourceRouter.get('/', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const page = Math.max(1, parseInt(req.query.page as string, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string, 10) || 10));
    const skip = (page - 1) * limit;

    const filter: Record<string, unknown> = {};

    // Students only see published resources
    if (req.user!.role === 'student') {
      filter.status = 'published';
    } else {
      const status = req.query.status as string;
      if (status && ['draft', 'published'].includes(status)) {
        filter.status = status;
      }
    }

    // Common filters
    const resourceType = req.query.resourceType as string;
    if (
      resourceType &&
      ['notes', 'syllabus', 'question_paper', 'lab_manual', 'reference'].includes(resourceType)
    ) {
      filter.resourceType = resourceType;
    }

    const subjectId = req.query.subjectId as string;
    if (subjectId && mongoose.Types.ObjectId.isValid(subjectId)) {
      filter.subjectId = new mongoose.Types.ObjectId(subjectId);
    }

    const department = req.query.department as string;
    if (department) {
      filter.department = new RegExp(escapeRegExp(department.trim()), 'i');
    }

    const semester = parseInt(req.query.semester as string, 10);
    if (!isNaN(semester)) {
      filter.semester = semester;
    }

    const search = typeof req.query.search === 'string' ? req.query.search.trim() : '';
    if (search) {
      const searchRegex = new RegExp(escapeRegExp(search), 'i');
      filter.$or = [{ title: searchRegex }, { description: searchRegex }];
    }

    const total = await Resource.countDocuments(filter);
    const resources = await Resource.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('subjectId', 'name code')
      .populate('uploadedBy', 'name email role')
      .lean();

    res.status(200).json({
      status: 'ok',
      data: resources,
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
      message: error instanceof Error ? error.message : 'Failed to retrieve resources',
    });
  }
});

/**
 * DELETE /api/resources/:id
 * Admin only: Remove institutional resource
 */
resourceRouter.delete(
  '/:id',
  requireRole('admin'),
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      if (!mongoose.Types.ObjectId.isValid(id)) {
        res
          .status(400)
          .json({ status: 'error', statusCode: 400, message: 'Invalid resource ID format.' });
        return;
      }

      const deleted = await Resource.findByIdAndDelete(id);
      if (!deleted) {
        res.status(404).json({ status: 'error', statusCode: 404, message: 'Resource not found.' });
        return;
      }

      res.status(200).json({
        status: 'ok',
        message: 'Resource deleted successfully.',
      });
    } catch (error: unknown) {
      res.status(500).json({
        status: 'error',
        statusCode: 500,
        message: error instanceof Error ? error.message : 'Failed to delete resource',
      });
    }
  }
);
