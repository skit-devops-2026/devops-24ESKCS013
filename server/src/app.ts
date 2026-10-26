import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { env } from './config/env.js';
import { healthRouter } from './routes/health.routes.js';
import { authRouter } from './routes/auth.routes.js';
import { subjectRouter } from './routes/subject.routes.js';
import { taskRouter } from './routes/task.routes.js';
import { goalRouter } from './routes/goal.routes.js';
import { noteRouter } from './routes/note.routes.js';
import { studyRouter } from './routes/study.routes.js';
import { notFoundHandler, errorHandler } from './middleware/error-handler.js';

export function createApp() {
  const app = express();

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

  // Mount API health routes
  app.use('/api', healthRouter);

  // Mount Authentication routes
  app.use('/api/auth', authRouter);

  // Mount Student Academic Feature routes
  app.use('/api/subjects', subjectRouter);
  app.use('/api/tasks', taskRouter);
  app.use('/api/goals', goalRouter);
  app.use('/api/notes', noteRouter);
  app.use('/api/study', studyRouter);

  // 404 Not Found handler for unknown routes
  app.use(notFoundHandler);

  // Centralized Error handler
  app.use(errorHandler);

  return app;
}
