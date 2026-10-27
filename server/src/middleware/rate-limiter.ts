import rateLimit from 'express-rate-limit';
import { env } from '../config/env.js';

export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes window
  max: env.NODE_ENV === 'test' ? 1000 : 25, // 25 attempts per 15 minutes in dev/prod
  standardHeaders: true, // Return rate limit info in RateLimit-* headers
  legacyHeaders: false,
  message: {
    status: 'error',
    statusCode: 429,
    message: 'Too many authentication attempts. Please try again after 15 minutes.',
  },
});

/**
 * General API rate limiter — applied to all non-auth routes.
 * Protects CPU-heavy endpoints like attendance parse-preview.
 */
export const generalRateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute window
  max: env.NODE_ENV === 'test' ? 10000 : 120, // 120 requests per minute per IP
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    status: 'error',
    statusCode: 429,
    message: 'Too many requests. Please slow down and try again in a moment.',
  },
});
