import { Router, Request, Response } from 'express';
import { env } from '../config/env.js';
import { getDatabaseStatus } from '../config/db.js';
import { requireAuth, requireRole, AuthenticatedRequest } from '../middleware/auth.middleware.js';

export const healthRouter = Router();

// Liveness probe: Reports whether process is alive (public — used by devops)
healthRouter.get('/health', (req: Request, res: Response) => {
  res.status(200).json({
    status: 'ok',
    service: 'student-hub-api',
    environment: env.NODE_ENV,
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  });
});

// Readiness probe: Reports actual database connectivity (public — used by devops)
healthRouter.get('/health/db', (req: Request, res: Response) => {
  const dbStatus = getDatabaseStatus();

  if (dbStatus.connected) {
    res.status(200).json({
      status: 'ok',
      database: dbStatus,
      timestamp: new Date().toISOString(),
    });
  } else {
    res.status(503).json({
      status: 'error',
      database: dbStatus,
      message: 'Database is currently not connected or connecting.',
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * GET /api/admin/health — Admin-only system diagnostics panel data.
 * Returns full health + DB status in one call for the admin dashboard.
 */
healthRouter.get(
  '/admin/health',
  requireAuth,
  requireRole('admin'),
  (req: AuthenticatedRequest, res: Response) => {
    const dbStatus = getDatabaseStatus();
    res.status(200).json({
      status: 'ok',
      service: 'student-hub-api',
      environment: env.NODE_ENV,
      uptime: process.uptime(),
      database: dbStatus,
      timestamp: new Date().toISOString(),
    });
  }
);
