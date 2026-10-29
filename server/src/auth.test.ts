import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { createApp } from './app.js';
import { connectDB, disconnectDB } from './config/db.js';
import { User } from './models/User.js';
import { AUTH_COOKIE_NAME } from './services/auth.service.js';

let mongod: MongoMemoryServer;
const app = createApp();

describe('Authentication & MongoDB Integration Tests', () => {
  before(async () => {
    mongod = await MongoMemoryServer.create();
    const uri = mongod.getUri();
    await connectDB(uri);
  });

  after(async () => {
    await disconnectDB();
    if (mongod) {
      await mongod.stop();
    }
  });

  it('GET /api/health/db reports connected status and driver info', async () => {
    const res = await request(app).get('/api/health/db');
    assert.equal(res.status, 200);
    assert.equal(res.body.status, 'ok');
    assert.equal(res.body.database.connected, true);
    assert.equal(res.body.database.driver, 'mongoose');
    assert.ok(res.body.database.name);
    // Security check: Never leak URI or credentials
    assert.equal(res.body.database.uri, undefined);
    assert.equal(res.body.database.password, undefined);
  });

  it('POST /api/auth/register successfully registers a new student with hashed password', async () => {
    const res = await request(app).post('/api/auth/register').send({
      name: 'Jane Doe',
      email: 'jane.doe@university.edu',
      password: 'SecurePassword123!',
      rollNumber: '24CS001',
      department: 'Computer Science',
      semester: 3,
    });

    assert.equal(res.status, 201);
    assert.equal(res.body.status, 'ok');
    assert.equal(res.body.user.name, 'Jane Doe');
    assert.equal(res.body.user.email, 'jane.doe@university.edu');
    assert.equal(res.body.user.role, 'student');
    assert.equal(res.body.user.profile.rollNumber, '24CS001');

    // Verify cookie was set with HttpOnly
    const cookies = res.headers['set-cookie'];
    assert.ok(Array.isArray(cookies));
    const authCookie = cookies.find((c: string) => c.startsWith(`${AUTH_COOKIE_NAME}=`));
    assert.ok(authCookie);
    assert.ok(authCookie.includes('HttpOnly'));

    // Verify database record has hashed password (not plain text)
    const dbUser = await User.findOne({ email: 'jane.doe@university.edu' }).select('+passwordHash');
    assert.ok(dbUser);
    assert.notEqual(dbUser.passwordHash, 'SecurePassword123!');
    assert.ok(dbUser.passwordHash.startsWith('$2')); // bcrypt prefix
  });

  it('POST /api/auth/register prevents duplicate email registration', async () => {
    const res = await request(app).post('/api/auth/register').send({
      name: 'Duplicate Jane',
      email: 'JANE.DOE@university.edu', // Test lowercase normalization
      password: 'AnotherPassword456!',
      rollNumber: '24CS002',
      department: 'Computer Science',
    });

    assert.equal(res.status, 409);
    assert.equal(res.body.status, 'error');
    assert.ok(res.body.message.includes('already exists'));
  });

  it('POST /api/auth/register prevents duplicate roll number registration', async () => {
    const res = await request(app).post('/api/auth/register').send({
      name: 'New Student',
      email: 'new.student@university.edu',
      password: 'Password789!',
      rollNumber: '24cs001', // Lowercase candidate should collide with uppercase 24CS001
      department: 'Information Technology',
    });

    assert.equal(res.status, 409);
    assert.equal(res.body.status, 'error');
    assert.ok(res.body.message.includes('roll number already exists'));
  });

  it('POST /api/auth/register rejects invalid inputs (validation check)', async () => {
    const res = await request(app).post('/api/auth/register').send({
      name: '',
      email: 'invalid-email',
      password: '123', // Too short
      rollNumber: '',
      department: '',
    });

    assert.equal(res.status, 400);
    assert.equal(res.body.status, 'error');
  });

  it('POST /api/auth/login succeeds with valid credentials and sets session cookie', async () => {
    const res = await request(app).post('/api/auth/login').send({
      email: 'jane.doe@university.edu',
      password: 'SecurePassword123!',
    });

    assert.equal(res.status, 200);
    assert.equal(res.body.status, 'ok');
    assert.equal(res.body.user.email, 'jane.doe@university.edu');
    assert.ok(res.body.user.profile);

    const rawCookies = res.headers['set-cookie'];
    const cookies = Array.isArray(rawCookies) ? rawCookies : [String(rawCookies)];
    const authCookie = cookies.find((c: string) => c.startsWith(`${AUTH_COOKIE_NAME}=`));
    assert.ok(authCookie);
  });

  it('POST /api/auth/login fails with invalid password (401)', async () => {
    const res = await request(app).post('/api/auth/login').send({
      email: 'jane.doe@university.edu',
      password: 'WrongPassword!',
    });

    assert.equal(res.status, 401);
    assert.equal(res.body.status, 'error');
    assert.equal(res.body.message, 'Invalid email or password.');
  });

  it('GET /api/auth/me returns current user profile when session cookie is provided', async () => {
    // First login to get cookie
    const loginRes = await request(app).post('/api/auth/login').send({
      email: 'jane.doe@university.edu',
      password: 'SecurePassword123!',
    });

    const cookie = loginRes.headers['set-cookie'];

    // Call /api/auth/me with cookie
    const meRes = await request(app).get('/api/auth/me').set('Cookie', cookie);

    assert.equal(meRes.status, 200);
    assert.equal(meRes.body.status, 'ok');
    assert.equal(meRes.body.user.email, 'jane.doe@university.edu');
    assert.equal(meRes.body.user.profile.rollNumber, '24CS001');
    assert.equal(meRes.body.user.passwordHash, undefined);
  });

  it('session persists across multiple requests and reloads using session cookie', async () => {
    // Re-login to get active session cookie
    const loginRes = await request(app).post('/api/auth/login').send({
      email: 'jane.doe@university.edu',
      password: 'SecurePassword123!',
    });
    const cookie = loginRes.headers['set-cookie'];

    // Simulate 3 consecutive page views / refreshes
    for (let i = 0; i < 3; i++) {
      const res = await request(app).get('/api/auth/me').set('Cookie', cookie);
      assert.equal(res.status, 200);
      assert.equal(res.body.user.email, 'jane.doe@university.edu');
    }
  });

  it('never exposes password hashes in any authentication responses', async () => {
    const loginRes = await request(app).post('/api/auth/login').send({
      email: 'jane.doe@university.edu',
      password: 'SecurePassword123!',
    });
    assert.equal(loginRes.status, 200);
    assert.equal(loginRes.body.user.passwordHash, undefined);
    assert.equal(loginRes.body.user.password, undefined);
  });

  it('GET /api/auth/me rejects unauthenticated requests with 401', async () => {
    const res = await request(app).get('/api/auth/me');
    assert.equal(res.status, 401);
    assert.equal(res.body.status, 'error');
  });

  it('POST /api/auth/logout clears authentication cookie', async () => {
    const res = await request(app).post('/api/auth/logout');
    assert.equal(res.status, 200);
    assert.equal(res.body.status, 'ok');

    const rawCookies = res.headers['set-cookie'];
    const cookies = Array.isArray(rawCookies) ? rawCookies : [String(rawCookies)];
    const authCookie = cookies.find((c: string) => c.startsWith(`${AUTH_COOKIE_NAME}=`));
    assert.ok(authCookie);
    // Max-age=0 or expires in past
    assert.ok(authCookie.includes('Max-Age=0') || authCookie.includes('1970'));
  });
});
