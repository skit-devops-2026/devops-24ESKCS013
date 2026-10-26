import { Request, Response, NextFunction } from 'express';
import { verifyToken, AUTH_COOKIE_NAME } from '../services/auth.service.js';
import { User, IUser, UserRole } from '../models/User.js';

export interface AuthenticatedRequest extends Request {
  user?: IUser;
}

export async function requireAuth(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    let token = req.cookies?.[AUTH_COOKIE_NAME];

    // Also support Authorization header for API clients
    const authHeader = req.headers.authorization;
    if (!token && authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.split(' ')[1];
    }

    if (!token) {
      res.status(401).json({
        status: 'error',
        statusCode: 401,
        message: 'Authentication required. Please sign in to access this resource.',
      });
      return;
    }

    const payload = verifyToken(token);
    const user = await User.findById(payload.id);

    if (!user) {
      res.status(401).json({
        status: 'error',
        statusCode: 401,
        message: 'User session invalid. The user account no longer exists.',
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

    req.user = user;
    next();
  } catch (error: unknown) {
    res.status(401).json({
      status: 'error',
      statusCode: 401,
      message: 'Invalid or expired authentication session. Please sign in again.',
    });
  }
}

export function requireRole(...allowedRoles: UserRole[]) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        status: 'error',
        statusCode: 401,
        message: 'Authentication required.',
      });
      return;
    }

    if (!allowedRoles.includes(req.user.role)) {
      res.status(403).json({
        status: 'error',
        statusCode: 403,
        message: `Forbidden. Access restricted to [${allowedRoles.join(', ')}] role(s).`,
      });
      return;
    }

    next();
  };
}
