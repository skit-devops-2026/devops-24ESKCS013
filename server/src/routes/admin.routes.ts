import { Router, Response } from 'express';
import mongoose from 'mongoose';
import { z } from 'zod';
import { requireAuth, requireRole, AuthenticatedRequest } from '../middleware/auth.middleware.js';
import { User, UserStatus } from '../models/User.js';
import { StudentProfile } from '../models/StudentProfile.js';
import { Subject } from '../models/Subject.js';
import { Task } from '../models/Task.js';
import { Resource } from '../models/Resource.js';
import { Announcement } from '../models/Announcement.js';

export const adminRouter = Router();

// Enforce admin authorization on all routes
adminRouter.use(requireAuth, requireRole('admin'));

const statusUpdateSchema = z.object({
  status: z.enum(['active', 'suspended'] as const, {
    errorMap: () => ({ message: "Status must be either 'active' or 'suspended'" }),
  }),
});

/**
 * GET /api/admin/students
 * Paginated, searchable student directory with profile data
 */
adminRouter.get('/students', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const page = Math.max(1, parseInt(req.query.page as string, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string, 10) || 10));
    const skip = (page - 1) * limit;

    const search = typeof req.query.search === 'string' ? req.query.search.trim() : '';
    const status = req.query.status as UserStatus | undefined;
    const department = typeof req.query.department === 'string' ? req.query.department.trim() : '';
    const semester = parseInt(req.query.semester as string, 10);

    // Build user match criteria
    const userMatch: Record<string, unknown> = { role: 'student' };
    if (status && ['active', 'suspended'].includes(status)) {
      userMatch.status = status;
    }

    if (search) {
      const searchRegex = new RegExp(search, 'i');
      // Check if search matches roll numbers
      const matchingProfiles = await StudentProfile.find({ rollNumber: searchRegex }, { userId: 1 });
      const matchingUserIds = matchingProfiles.map((p) => p.userId);

      userMatch.$or = [
        { name: searchRegex },
        { email: searchRegex },
        { _id: { $in: matchingUserIds } },
      ];
    }

    // Filter by department or semester if specified
    if (department || !isNaN(semester)) {
      const profileFilter: Record<string, unknown> = {};
      if (department) profileFilter.department = new RegExp(department, 'i');
      if (!isNaN(semester)) profileFilter.semester = semester;

      const profileMatches = await StudentProfile.find(profileFilter, { userId: 1 });
      const filteredUserIds = profileMatches.map((p) => p.userId);

      if (userMatch._id) {
        // If already had search filter, take intersection
        const existingOr = userMatch.$or as Array<Record<string, unknown>>;
        userMatch.$and = [{ $or: existingOr }, { _id: { $in: filteredUserIds } }];
        delete userMatch.$or;
      } else {
        userMatch._id = { $in: filteredUserIds };
      }
    }

    const total = await User.countDocuments(userMatch);
    const users = await User.find(userMatch, {
      _id: 1,
      name: 1,
      email: 1,
      role: 1,
      status: 1,
      createdAt: 1,
    })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    // Attach student profile to each user safely
    const userIds = users.map((u) => u._id);
    const profiles = await StudentProfile.find({ userId: { $in: userIds } }).lean();
    const profileMap = new Map(profiles.map((p) => [p.userId.toString(), p]));

    const data = users.map((u) => {
      const prof = profileMap.get(u._id.toString());
      return {
        id: u._id,
        name: u.name,
        email: u.email,
        role: u.role,
        status: u.status,
        createdAt: u.createdAt,
        profile: prof
          ? {
              rollNumber: prof.rollNumber,
              department: prof.department,
              semester: prof.semester,
              currentGpa: prof.currentGpa,
              attendancePercentage: prof.attendancePercentage,
            }
          : null,
      };
    });

    res.status(200).json({
      status: 'ok',
      data,
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
      message: error instanceof Error ? error.message : 'Failed to retrieve students',
    });
  }
});

/**
 * GET /api/admin/students/:id
 * Detailed student inspection with enrolled subjects and task stats
 */
adminRouter.get('/students/:id', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      res.status(400).json({ status: 'error', statusCode: 400, message: 'Invalid student ID format.' });
      return;
    }

    const student = await User.findOne({ _id: id, role: 'student' }, {
      _id: 1,
      name: 1,
      email: 1,
      role: 1,
      status: 1,
      createdAt: 1,
      updatedAt: 1,
    }).lean();

    if (!student) {
      res.status(404).json({ status: 'error', statusCode: 404, message: 'Student record not found.' });
      return;
    }

    const [profile, subjects, taskCounts] = await Promise.all([
      StudentProfile.findOne({ userId: id }).lean(),
      Subject.find({ userId: id }).sort({ code: 1 }).lean(),
      Task.aggregate([
        { $match: { userId: new mongoose.Types.ObjectId(id) } },
        { $group: { _id: '$status', count: { $sum: 1 } } },
      ]),
    ]);

    const taskStats = {
      total: 0,
      pending: 0,
      in_progress: 0,
      completed: 0,
    };
    taskCounts.forEach((tc) => {
      if (tc._id in taskStats) {
        taskStats[tc._id as keyof typeof taskStats] = tc.count;
      }
      taskStats.total += tc.count;
    });

    res.status(200).json({
      status: 'ok',
      data: {
        student: {
          id: student._id,
          name: student.name,
          email: student.email,
          role: student.role,
          status: student.status,
          createdAt: student.createdAt,
          updatedAt: student.updatedAt,
        },
        profile: profile
          ? {
              rollNumber: profile.rollNumber,
              department: profile.department,
              semester: profile.semester,
              currentGpa: profile.currentGpa,
              attendancePercentage: profile.attendancePercentage,
            }
          : null,
        subjects: subjects.map((s) => ({
          id: s._id,
          code: s.code,
          name: s.name,
          credits: s.credits,
          facultyName: s.facultyName,
          attendancePercentage: s.attendancePercentage,
          syllabusProgress: s.syllabusProgress,
        })),
        taskStats,
      },
    });
  } catch (error: unknown) {
    res.status(500).json({
      status: 'error',
      statusCode: 500,
      message: error instanceof Error ? error.message : 'Failed to retrieve student details',
    });
  }
});

/**
 * PATCH /api/admin/students/:id/status
 * Activate or suspend student accounts
 */
adminRouter.patch('/students/:id/status', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      res.status(400).json({ status: 'error', statusCode: 400, message: 'Invalid student ID format.' });
      return;
    }

    const parseResult = statusUpdateSchema.safeParse(req.body);
    if (!parseResult.success) {
      res.status(400).json({
        status: 'error',
        statusCode: 400,
        message: parseResult.error.errors[0]?.message || 'Invalid status data.',
      });
      return;
    }

    const { status } = parseResult.data;

    // Prevent administrator from locking themselves out
    if (req.user!._id.toString() === id) {
      res.status(400).json({
        status: 'error',
        statusCode: 400,
        message: 'Administrators cannot alter their own account status to prevent lockout.',
      });
      return;
    }

    const targetUser = await User.findById(id);
    if (!targetUser) {
      res.status(404).json({ status: 'error', statusCode: 404, message: 'Target user record not found.' });
      return;
    }

    targetUser.status = status;
    await targetUser.save();

    res.status(200).json({
      status: 'ok',
      message: `User account successfully ${status === 'active' ? 'activated' : 'suspended'}.`,
      data: {
        id: targetUser._id,
        name: targetUser.name,
        email: targetUser.email,
        role: targetUser.role,
        status: targetUser.status,
      },
    });
  } catch (error: unknown) {
    res.status(500).json({
      status: 'error',
      statusCode: 500,
      message: error instanceof Error ? error.message : 'Failed to update student status',
    });
  }
});

/**
 * GET /api/admin/stats
 * Institutional KPI metrics calculated strictly from persisted MongoDB data
 */
adminRouter.get('/stats', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    // Configurable attendance threshold with default 75%
    const thresholdParam = parseInt(req.query.threshold as string, 10);
    const attendanceThreshold = !isNaN(thresholdParam) && thresholdParam >= 0 && thresholdParam <= 100
      ? thresholdParam
      : 75;

    const [
      totalStudents,
      activeStudents,
      suspendedStudents,
      totalResources,
      publishedResources,
      publishedAnnouncements,
      totalAnnouncements,
      overallProfileDefaulters,
      lowAttendanceSubjectRecords,
      uniqueSubjectDefaulters,
    ] = await Promise.all([
      User.countDocuments({ role: 'student' }),
      User.countDocuments({ role: 'student', status: 'active' }),
      User.countDocuments({ role: 'student', status: 'suspended' }),
      Resource.countDocuments(),
      Resource.countDocuments({ status: 'published' }),
      Announcement.countDocuments({ status: 'published' }),
      Announcement.countDocuments(),
      // Unique students with overall attendance below threshold in StudentProfile
      StudentProfile.find({ attendancePercentage: { $lt: attendanceThreshold } }, { userId: 1 }).lean(),
      // Total course records with attendance below threshold in Subject
      Subject.countDocuments({ attendancePercentage: { $lt: attendanceThreshold } }),
      // Unique students with at least one course below threshold in Subject
      Subject.distinct('userId', { attendancePercentage: { $lt: attendanceThreshold } }),
    ]);

    // Aggregate unique student IDs affected either in profile or in any enrolled subject
    const profileDefaulterUserIds = overallProfileDefaulters.map((p) => p.userId.toString());
    const subjectDefaulterUserIds = uniqueSubjectDefaulters.map((id) => id.toString());
    const allDefaulterIdsSet = new Set([...profileDefaulterUserIds, ...subjectDefaulterUserIds]);

    res.status(200).json({
      status: 'ok',
      data: {
        students: {
          total: totalStudents,
          active: activeStudents,
          suspended: suspendedStudents,
        },
        resources: {
          total: totalResources,
          published: publishedResources,
          drafts: totalResources - publishedResources,
        },
        announcements: {
          total: totalAnnouncements,
          published: publishedAnnouncements,
          drafts: totalAnnouncements - publishedAnnouncements,
        },
        attendance: {
          thresholdPercentage: attendanceThreshold,
          // Unique students whose overall profile attendance is below threshold
          overallProfileDefaultersCount: profileDefaulterUserIds.length,
          // Total course/subject records where student attendance is below threshold
          lowAttendanceSubjectRecordsCount: lowAttendanceSubjectRecords,
          // Unique students having at least one course below threshold
          uniqueSubjectDefaultersCount: subjectDefaulterUserIds.length,
          // Total unique student count affected across overall profile and/or individual subjects
          uniqueAffectedStudentsCount: allDefaulterIdsSet.size,
        },
      },
    });
  } catch (error: unknown) {
    res.status(500).json({
      status: 'error',
      statusCode: 500,
      message: error instanceof Error ? error.message : 'Failed to calculate system statistics',
    });
  }
});
