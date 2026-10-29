import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import { env } from './config/env.js';
import { healthRouter } from './routes/health.routes.js';
import { authRouter } from './routes/auth.routes.js';
import { subjectRouter } from './routes/subject.routes.js';
import { taskRouter } from './routes/task.routes.js';
import { goalRouter } from './routes/goal.routes.js';
import { noteRouter } from './routes/note.routes.js';
import { studyRouter } from './routes/study.routes.js';
import { adminRouter } from './routes/admin.routes.js';
import { announcementRouter } from './routes/announcement.routes.js';
import { resourceRouter } from './routes/resource.routes.js';
import { attendanceRouter } from './routes/attendance.routes.js';
import { notFoundHandler, errorHandler } from './middleware/error-handler.js';
import { generalRateLimiter } from './middleware/rate-limiter.js';
import { csrfProtection } from './middleware/csrf.middleware.js';

export function createApp() {
  const app = express();

  // Security headers (CSP, X-Frame-Options, HSTS, X-Content-Type-Options, etc.)
  app.use(
    helmet({
      crossOriginEmbedderPolicy: false, // Allow embedding from same origin during dev
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
          fontSrc: ["'self'", 'https://fonts.gstatic.com'],
          imgSrc: ["'self'", 'data:', 'blob:'],
          connectSrc: ["'self'"],
        },
      },
    })
  );

  // Basic security and parsing middlewares
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));
  app.use(cookieParser());

  // CORS configuration supporting credentials (cookies)
  app.use(
    cors({
      origin: env.CLIENT_ORIGIN.split(',').map((o) => o.trim()),
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization'],
    })
  );

  // CSRF Origin verification (enforced when COOKIE_SAME_SITE=none)
  app.use(csrfProtection);

  // Mount API health routes
  app.use('/api', healthRouter);

  // General rate limiter — applies to all API routes below this line
  app.use('/api', generalRateLimiter);

  // Mount Authentication routes
  app.use('/api/auth', authRouter);

  // Mount Student Academic Feature routes
  app.use('/api/subjects', subjectRouter);
  app.use('/api/tasks', taskRouter);
  app.use('/api/goals', goalRouter);
  app.use('/api/notes', noteRouter);
  app.use('/api/study', studyRouter);
  app.use('/api/attendance', attendanceRouter);

  // Mount Admin and Institutional Management routes
  app.use('/api/admin', adminRouter);
  app.use('/api/announcements', announcementRouter);
  app.use('/api/resources', resourceRouter);

  // 404 Not Found handler for unknown routes
  app.use(notFoundHandler);

  // Centralized Error handler
  app.use(errorHandler);

  return app;
}
