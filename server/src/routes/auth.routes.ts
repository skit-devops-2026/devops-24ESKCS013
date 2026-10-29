import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { User } from '../models/User.js';
import { StudentProfile } from '../models/StudentProfile.js';
import { generateToken, setAuthCookie, clearAuthCookie } from '../services/auth.service.js';
import { requireAuth, AuthenticatedRequest } from '../middleware/auth.middleware.js';
import { authRateLimiter } from '../middleware/rate-limiter.js';

export const authRouter = Router();

const registerSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters long').max(100),
  email: z.string().email('Please enter a valid email address').trim().toLowerCase(),
  password: z.string().min(6, 'Password must be at least 6 characters long'),
  rollNumber: z.string().min(3, 'Roll number is required').trim().toUpperCase(),
  department: z.string().min(2, 'Department is required').trim(),
  semester: z.coerce.number().int().min(1).max(8).optional().default(1),
});

const loginSchema = z.object({
  email: z.string().email('Please enter a valid email address').trim().toLowerCase(),
  password: z.string().min(1, 'Password is required'),
});

// POST /api/auth/register
authRouter.post(
  '/register',
  authRateLimiter,
  async (req: Request, res: Response): Promise<void> => {
    const parseResult = registerSchema.safeParse(req.body);

    if (!parseResult.success) {
      const errorDetails = parseResult.error.issues.map((i) => i.message).join('. ');
      res.status(400).json({
        status: 'error',
        statusCode: 400,
        message: errorDetails,
      });
      return;
    }

    const { name, email, password, rollNumber, department, semester } = parseResult.data;

    // Check for duplicate email
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      res.status(409).json({
        status: 'error',
        statusCode: 409,
        message: 'An account with this email address already exists.',
      });
      return;
    }

    // Check for duplicate roll number
    const existingProfile = await StudentProfile.findOne({ rollNumber });
    if (existingProfile) {
      res.status(409).json({
        status: 'error',
        statusCode: 409,
        message: 'A student profile with this roll number already exists.',
      });
      return;
    }

    // Securely hash password
    const passwordHash = await User.hashPassword(password);

    // Role is strictly enforced to 'student' (admin accounts cannot be registered publicly)
    const newUser = await User.create({
      name,
      email,
      passwordHash,
      role: 'student',
    });

    const profile = await StudentProfile.create({
      userId: newUser._id,
      rollNumber,
      department,
      semester,
    });

    // Issue session token and set secure HttpOnly cookie
    const token = generateToken({
      id: newUser._id.toString(),
      email: newUser.email,
      role: newUser.role,
    });
    setAuthCookie(res, token);

    res.status(201).json({
      status: 'ok',
      message: 'Registration successful.',
      user: {
        id: newUser._id,
        name: newUser.name,
        email: newUser.email,
        role: newUser.role,
        profile: {
          rollNumber: profile.rollNumber,
          department: profile.department,
          semester: profile.semester,
          currentGpa: profile.currentGpa,
          attendancePercentage: profile.attendancePercentage,
        },
      },
    });
  }
);

// POST /api/auth/login
authRouter.post('/login', authRateLimiter, async (req: Request, res: Response): Promise<void> => {
  const parseResult = loginSchema.safeParse(req.body);

  if (!parseResult.success) {
    res.status(400).json({
      status: 'error',
      statusCode: 400,
      message: 'Please provide a valid email and password.',
    });
    return;
  }

  const { email, password } = parseResult.data;

  // Retrieve user with passwordHash
  const user = await User.findOne({ email }).select('+passwordHash');

  if (!user || !(await user.comparePassword(password))) {
    res.status(401).json({
      status: 'error',
      statusCode: 401,
      message: 'Invalid email or password.',
    });
    return;
  }

  if (user.status === 'suspended') {
    res.status(403).json({
      status: 'error',
      statusCode: 403,
      message: 'Your account has been suspended. Please contact the institutional administrator.',
    });
    return;
  }

  let profileData = null;
  if (user.role === 'student') {
    const profile = await StudentProfile.findOne({ userId: user._id });
    if (profile) {
      profileData = {
        rollNumber: profile.rollNumber,
        department: profile.department,
        semester: profile.semester,
        currentGpa: profile.currentGpa,
        attendancePercentage: profile.attendancePercentage,
      };
    }
  }

  // Issue session token and set secure HttpOnly cookie
  const token = generateToken({
    id: user._id.toString(),
    email: user.email,
    role: user.role,
  });
  setAuthCookie(res, token);

  res.status(200).json({
    status: 'ok',
    message: 'Authentication successful.',
    user: {
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      status: user.status,
      profile: profileData,
    },
  });
});

// POST /api/auth/logout
authRouter.post('/logout', (req: Request, res: Response) => {
  clearAuthCookie(res);
  res.status(200).json({
    status: 'ok',
    message: 'Logged out successfully.',
  });
});

// GET /api/auth/me
authRouter.get(
  '/me',
  requireAuth,
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const user = req.user!;
    let profileData = null;

    if (user.role === 'student') {
      const profile = await StudentProfile.findOne({ userId: user._id });
      if (profile) {
        profileData = {
          rollNumber: profile.rollNumber,
          department: profile.department,
          semester: profile.semester,
          currentGpa: profile.currentGpa,
          attendancePercentage: profile.attendancePercentage,
        };
      }
    }

    res.status(200).json({
      status: 'ok',
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        status: user.status,
        profile: profileData,
      },
    });
  }
);
