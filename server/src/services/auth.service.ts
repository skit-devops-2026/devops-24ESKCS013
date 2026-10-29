import jwt, { SignOptions } from 'jsonwebtoken';
import { CookieOptions, Response } from 'express';
import { env } from '../config/env.js';
import { UserRole } from '../models/User.js';

export interface TokenPayload {
  id: string;
  email: string;
  role: UserRole;
}

export function generateToken(payload: TokenPayload): string {
  return jwt.sign(payload, env.JWT_SECRET, {
    expiresIn: env.JWT_EXPIRES_IN as SignOptions['expiresIn'],
  });
}

export function verifyToken(token: string): TokenPayload {
  return jwt.verify(token, env.JWT_SECRET) as TokenPayload;
}

export const AUTH_COOKIE_NAME = 'student_hub_token';

export function getCookieOptions(): CookieOptions {
  const isProduction = env.NODE_ENV === 'production';
  const sameSiteSetting = env.COOKIE_SAME_SITE || (isProduction ? 'none' : 'lax');
  const isSecure = isProduction || sameSiteSetting === 'none';

  return {
    httpOnly: true, // Prevents access via client JavaScript (XSS mitigation)
    secure: isSecure, // HTTPS required in production or for cross-site sameSite: 'none'
    sameSite: sameSiteSetting, // 'lax' in dev; 'none' in prod for cross-domain deployments (e.g. Vercel + Render)
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days in milliseconds
    path: '/',
  };
}

export function setAuthCookie(res: Response, token: string): void {
  res.cookie(AUTH_COOKIE_NAME, token, getCookieOptions());
}

export function clearAuthCookie(res: Response): void {
  res.clearCookie(AUTH_COOKIE_NAME, {
    ...getCookieOptions(),
    maxAge: 0,
  });
}
