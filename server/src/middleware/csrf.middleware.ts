import { Request, Response, NextFunction } from 'express';
import { env } from '../config/env.js';

/**
 * CSRF Protection Middleware for SameSite=None Cross-Site Setups:
 * When cross-site cookies are explicitly enabled (COOKIE_SAME_SITE=none),
 * this middleware validates that state-changing requests (POST, PUT, PATCH, DELETE)
 * originate from an explicitly allowed origin configured in CLIENT_ORIGIN.
 */
export function csrfProtection(req: Request, res: Response, next: NextFunction): void {
  // Read-only requests are inherently safe from CSRF state manipulation
  const isStateChanging = ['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method.toUpperCase());
  if (!isStateChanging) {
    return next();
  }

  // SameSite=Lax (default) and Strict already block cross-site cookie attachment on state-changing requests.
  // Origin verification is enforced when cross-site cookie transmission is enabled (SameSite=None).
  if (env.COOKIE_SAME_SITE !== 'none') {
    return next();
  }

  const originHeader = req.headers.origin;
  const refererHeader = req.headers.referer;
  const allowedOrigins = env.CLIENT_ORIGIN.split(',').map((o) => o.trim().replace(/\/$/, ''));

  let requestOrigin: string | null = null;

  if (originHeader) {
    requestOrigin = originHeader.trim().replace(/\/$/, '');
  } else if (refererHeader) {
    try {
      requestOrigin = new URL(refererHeader).origin.replace(/\/$/, '');
    } catch {
      requestOrigin = null;
    }
  }

  if (!requestOrigin || !allowedOrigins.includes(requestOrigin)) {
    res.status(403).json({
      status: 'error',
      statusCode: 403,
      message: 'CSRF protection: Request origin is not authorized.',
    });
    return;
  }

  next();
}

