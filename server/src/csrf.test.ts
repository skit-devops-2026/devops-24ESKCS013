import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { createApp } from './app.js';
import { connectDB, disconnectDB } from './config/db.js';
import { env } from './config/env.js';
import { getCookieOptions } from './services/auth.service.js';

let mongod: MongoMemoryServer;

describe('CSRF Protection & SameSite Cookie Configuration Tests', () => {
  before(async () => {
    mongod = await MongoMemoryServer.create();
    await connectDB(mongod.getUri());
  });

  after(async () => {
    await disconnectDB();
    await mongod.stop();
  });

  it('defaults to SameSite=Lax for Safari-safe same-origin proxy deployments', () => {
    const originalSetting = env.COOKIE_SAME_SITE;
    try {
      (env as Record<string, unknown>).COOKIE_SAME_SITE = undefined;
      const opts = getCookieOptions();
      assert.equal(opts.sameSite, 'lax');
      assert.equal(opts.httpOnly, true);
    } finally {
      (env as Record<string, unknown>).COOKIE_SAME_SITE = originalSetting;
    }
  });

  it('allows state-changing requests through without blocking when COOKIE_SAME_SITE=lax', async () => {
    const originalSetting = env.COOKIE_SAME_SITE;
    try {
      (env as Record<string, unknown>).COOKIE_SAME_SITE = 'lax';
      const app = createApp();

      // State-changing request with arbitrary origin under lax mode
      const res = await request(app)
        .post('/api/auth/login')
        .set('Origin', 'https://arbitrary-site.com')
        .send({ email: 'nonexistent@test.edu', password: 'Password123' });

      // Should not be blocked by CSRF middleware with 403
      assert.notEqual(res.status, 403);
    } finally {
      (env as Record<string, unknown>).COOKIE_SAME_SITE = originalSetting;
    }
  });

  it('enforces origin check and rejects unauthorized origin with 403 when COOKIE_SAME_SITE=none', async () => {
    const originalSetting = env.COOKIE_SAME_SITE;
    try {
      (env as Record<string, unknown>).COOKIE_SAME_SITE = 'none';
      const app = createApp();

      // State-changing request from unauthorized cross-origin attacker
      const res = await request(app)
        .post('/api/auth/login')
        .set('Origin', 'https://malicious-cross-origin.com')
        .send({ email: 'test@test.edu', password: 'Password123' });

      assert.equal(res.status, 403);
      assert.equal(res.body.status, 'error');
      assert.match(res.body.message, /CSRF protection: Request origin is not authorized/i);
    } finally {
      (env as Record<string, unknown>).COOKIE_SAME_SITE = originalSetting;
    }
  });

  it('permits state-changing requests from authorized CLIENT_ORIGIN when COOKIE_SAME_SITE=none', async () => {
    const originalSetting = env.COOKIE_SAME_SITE;
    try {
      (env as Record<string, unknown>).COOKIE_SAME_SITE = 'none';
      const app = createApp();

      const allowedOrigin = env.CLIENT_ORIGIN.split(',')[0].trim();

      const res = await request(app)
        .post('/api/auth/login')
        .set('Origin', allowedOrigin)
        .send({ email: 'invalid_smoke@test.edu', password: 'Password123!' });

      // Permitted past CSRF check to application auth validation (returns 401, not 403)
      assert.equal(res.status, 401);
    } finally {
      (env as Record<string, unknown>).COOKIE_SAME_SITE = originalSetting;
    }
  });

  it('always allows safe read requests (GET) regardless of origin under COOKIE_SAME_SITE=none', async () => {
    const originalSetting = env.COOKIE_SAME_SITE;
    try {
      (env as Record<string, unknown>).COOKIE_SAME_SITE = 'none';
      const app = createApp();

      const res = await request(app)
        .get('/api/health')
        .set('Origin', 'https://any-cross-site-client.org');

      assert.equal(res.status, 200);
      assert.equal(res.body.status, 'ok');
    } finally {
      (env as Record<string, unknown>).COOKIE_SAME_SITE = originalSetting;
    }
  });
});
