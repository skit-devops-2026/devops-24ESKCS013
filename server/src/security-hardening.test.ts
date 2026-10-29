import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { createApp } from './app.js';
import { User } from './models/User.js';
import { Note } from './models/Note.js';
import { Goal } from './models/Goal.js';
import { Subject } from './models/Subject.js';
import { Task } from './models/Task.js';

let mongod: MongoMemoryServer;
let app: ReturnType<typeof createApp>;

let studentACookie: string;
let studentBCookie: string;
let adminCookie: string;
let studentAId: string;
let studentBId: string;
let noteAId: string;
let goalAId: string;
let subjectAId: string;
let taskAId: string;

describe('Phase 7: Security Hardening & Data Isolation Test Suite', () => {
  before(async () => {
    mongod = await MongoMemoryServer.create();
    await mongoose.connect(mongod.getUri());
    app = createApp();

    // 1. Create Administrator
    const adminPasswordHash = await User.hashPassword('AdminSecPass123!');
    await User.create({
      email: 'admin.sec@college.edu',
      passwordHash: adminPasswordHash,
      name: 'Security Admin',
      role: 'admin',
      status: 'active',
    });
    const adminLogin = await request(app)
      .post('/api/auth/login')
      .send({ email: 'admin.sec@college.edu', password: 'AdminSecPass123!' });
    const rawAdminCookie = adminLogin.headers['set-cookie'];
    adminCookie = (Array.isArray(rawAdminCookie) ? rawAdminCookie : [String(rawAdminCookie)]).find(
      (c) => c.startsWith('student_hub_token=')
    )!;

    // 2. Register Student A (Alice)
    const resA = await request(app).post('/api/auth/register').send({
      name: 'Alice Sec',
      email: 'alice.sec@college.edu',
      password: 'Password123!',
      rollNumber: '24ESKCS201',
      department: 'Computer Science',
      semester: 4,
    });
    studentAId = resA.body.user.id;
    const rawACookie = resA.headers['set-cookie'];
    studentACookie = (Array.isArray(rawACookie) ? rawACookie : [String(rawACookie)]).find((c) =>
      c.startsWith('student_hub_token=')
    )!;

    // 3. Register Student B (Bob)
    const resB = await request(app).post('/api/auth/register').send({
      name: 'Bob Sec',
      email: 'bob.sec@college.edu',
      password: 'Password123!',
      rollNumber: '24ESKCS202',
      department: 'Information Tech',
      semester: 4,
    });
    studentBId = resB.body.user.id;
    const rawBCookie = resB.headers['set-cookie'];
    studentBCookie = (Array.isArray(rawBCookie) ? rawBCookie : [String(rawBCookie)]).find((c) =>
      c.startsWith('student_hub_token=')
    )!;

    // 4. Create private records owned by Alice
    const subjectA = await Subject.create({
      userId: new mongoose.Types.ObjectId(studentAId),
      name: 'Advanced Algorithms',
      code: 'CS401',
      credits: 4,
      facultyName: 'Dr. Turing',
      attendancePercentage: 88,
      syllabusProgress: 60,
    });
    subjectAId = subjectA._id.toString();

    const taskA = await Task.create({
      userId: new mongoose.Types.ObjectId(studentAId),
      subjectId: subjectA._id,
      subjectCode: 'CS401',
      title: 'Alice Private Homework',
      description: 'Dynamic programming assignment',
      status: 'pending',
      priority: 'high',
      dueDate: new Date(Date.now() + 86400000 * 3),
    });
    taskAId = taskA._id.toString();

    const noteA = await Note.create({
      userId: new mongoose.Types.ObjectId(studentAId),
      subjectId: subjectA._id,
      title: 'Alice Private Notes on Graphs',
      content: 'Confidential research notes on Dijkstra and A* search.',
      tags: ['algorithms', 'private'],
      isPinned: true,
    });
    noteAId = noteA._id.toString();

    const goalA = await Goal.create({
      userId: new mongoose.Types.ObjectId(studentAId),
      title: 'Complete 100 LeetCode Problems',
      description: 'Competitive programming prep',
      targetValue: 100,
      currentValue: 40,
      unit: 'problems',
      category: 'Skills',
      targetDate: new Date(Date.now() + 86400000 * 60),
    });
    goalAId = goalA._id.toString();
  });

  after(async () => {
    await mongoose.connection.close();
    if (mongod) {
      await mongod.stop();
    }
  });

  // ==========================================
  // SECTION 1: Cross-User Data Isolation
  // ==========================================
  describe('Cross-User Data Isolation', () => {
    it('prevents Student B from viewing Student A private note by ID', async () => {
      const res = await request(app).get(`/api/notes/${noteAId}`).set('Cookie', studentBCookie);
      assert.equal(res.status, 404, 'Should return 404 to avoid leaking record existence');
    });

    it('prevents Student B from updating Student A private note', async () => {
      const res = await request(app)
        .patch(`/api/notes/${noteAId}`)
        .set('Cookie', studentBCookie)
        .send({ title: 'Hacked by Bob' });
      assert.equal(res.status, 404);

      // Verify Alice's note was not modified
      const checkNote = await Note.findById(noteAId);
      assert.equal(checkNote?.title, 'Alice Private Notes on Graphs');
    });

    it('prevents Student B from deleting Student A private note', async () => {
      const res = await request(app).delete(`/api/notes/${noteAId}`).set('Cookie', studentBCookie);
      assert.equal(res.status, 404);

      const checkNote = await Note.findById(noteAId);
      assert.ok(checkNote !== null);
    });

    it('prevents Student B from viewing Student A private goal by ID', async () => {
      const res = await request(app).get(`/api/goals/${goalAId}`).set('Cookie', studentBCookie);
      assert.equal(res.status, 404);
    });

    it('prevents Student B from updating Student A goal progress', async () => {
      const res = await request(app)
        .patch(`/api/goals/${goalAId}`)
        .set('Cookie', studentBCookie)
        .send({ currentValue: 99 });
      assert.equal(res.status, 404);

      const checkGoal = await Goal.findById(goalAId);
      assert.equal(checkGoal?.currentValue, 40);
    });

    it('prevents Student B from deleting Student A goal', async () => {
      const res = await request(app).delete(`/api/goals/${goalAId}`).set('Cookie', studentBCookie);
      assert.equal(res.status, 404);

      const checkGoal = await Goal.findById(goalAId);
      assert.ok(checkGoal !== null);
    });

    it('prevents Student B from viewing Student A task by ID', async () => {
      const res = await request(app).get(`/api/tasks/${taskAId}`).set('Cookie', studentBCookie);
      assert.equal(res.status, 404);
    });

    it('prevents Student B from updating Student A task', async () => {
      const res = await request(app)
        .patch(`/api/tasks/${taskAId}`)
        .set('Cookie', studentBCookie)
        .send({ status: 'completed' });
      assert.equal(res.status, 404);
    });

    it('prevents Student B from deleting Student A task', async () => {
      const res = await request(app).delete(`/api/tasks/${taskAId}`).set('Cookie', studentBCookie);
      assert.equal(res.status, 404);
    });

    it('prevents Student B from viewing or modifying Student A subject', async () => {
      const getRes = await request(app)
        .get(`/api/subjects/${subjectAId}`)
        .set('Cookie', studentBCookie);
      assert.equal(getRes.status, 404);

      const delRes = await request(app)
        .delete(`/api/subjects/${subjectAId}`)
        .set('Cookie', studentBCookie);
      assert.equal(delRes.status, 404);
    });
  });

  // ==========================================
  // SECTION 2: Privilege Escalation & Mass Assignment
  // ==========================================
  describe('Privilege Escalation & Mass Assignment Prevention', () => {
    it('prevents registering as an admin through registration payload', async () => {
      const res = await request(app).post('/api/auth/register').send({
        name: 'Attacker Eve',
        email: 'eve.attacker@college.edu',
        password: 'Password123!',
        rollNumber: '24ESKCS999',
        department: 'Computer Science',
        role: 'admin', // Malicious attempt to escalate role
      });

      assert.equal(res.status, 201);
      assert.equal(
        res.body.user.role,
        'student',
        'Registration must ignore role injection and force student'
      );

      // Verify in database directly
      const userInDb = await User.findOne({ email: 'eve.attacker@college.edu' });
      assert.equal(userInDb?.role, 'student');
    });

    it('prevents self-reactivation when suspended', async () => {
      // Admin suspends Bob
      await request(app)
        .patch(`/api/admin/students/${studentBId}/status`)
        .set('Cookie', adminCookie)
        .send({ status: 'suspended' });

      // Bob tries to call status endpoint to reactivate himself
      const res = await request(app)
        .patch(`/api/admin/students/${studentBId}/status`)
        .set('Cookie', studentBCookie)
        .send({ status: 'active' });

      // Must be rejected with 403 Forbidden (both because he is suspended and not an admin)
      assert.equal(res.status, 403);

      const checkBob = await User.findById(studentBId);
      assert.equal(checkBob?.status, 'suspended');

      // Restore Bob for subsequent tests
      await request(app)
        .patch(`/api/admin/students/${studentBId}/status`)
        .set('Cookie', adminCookie)
        .send({ status: 'active' });
    });
  });

  // ==========================================
  // SECTION 3: Regex / ReDoS Injection Resistance
  // ==========================================
  describe('Search Sanitization & Regex Injection Resistance', () => {
    it('safely handles special regex characters in note search without throwing 500', async () => {
      const maliciousQueries = ['(', '[', '+', '.*', '\\', '(?=.*)', '(((('];

      for (const query of maliciousQueries) {
        const res = await request(app)
          .get(`/api/notes?q=${encodeURIComponent(query)}`)
          .set('Cookie', studentACookie);

        assert.equal(res.status, 200, `Query '${query}' must return 200 OK without crashing`);
        assert.ok(Array.isArray(res.body.data));
      }
    });

    it('safely handles special regex characters in admin student search without crashing', async () => {
      const maliciousQueries = ['[a-z]+', '(', '.*'];

      for (const query of maliciousQueries) {
        const res = await request(app)
          .get(`/api/admin/students?search=${encodeURIComponent(query)}`)
          .set('Cookie', adminCookie);

        assert.equal(res.status, 200);
        assert.ok(Array.isArray(res.body.data));
      }
    });

    it('safely handles special regex characters in resource search without crashing', async () => {
      const res = await request(app)
        .get(`/api/resources?search=${encodeURIComponent('(.*)')}`)
        .set('Cookie', studentACookie);

      assert.equal(res.status, 200);
      assert.ok(Array.isArray(res.body.data));
    });
  });

  // ==========================================
  // SECTION 4: System Diagnostics & Health Reporting
  // ==========================================
  describe('System Diagnostics & Health Verification', () => {
    it('GET /api/health accurately reports API liveness and uptime', async () => {
      const res = await request(app).get('/api/health');
      assert.equal(res.status, 200);
      assert.equal(res.body.status, 'ok');
      assert.equal(res.body.service, 'student-hub-api');
      assert.ok(typeof res.body.uptime === 'number');
    });

    it('GET /api/health/db accurately reports database connection state', async () => {
      const res = await request(app).get('/api/health/db');
      assert.equal(res.status, 200);
      assert.equal(res.body.status, 'ok');
      assert.equal(res.body.database.connected, true);
      assert.equal(res.body.database.state, 'connected');
      // Verify credentials are NEVER exposed in health endpoint
      assert.equal(res.body.database.password, undefined);
      assert.equal(res.body.database.uri, undefined);
    });

    it('returns structured 404 JSON for non-existent API endpoints', async () => {
      const res = await request(app).get('/api/v1/invalid-route-xyz');
      assert.equal(res.status, 404);
      assert.equal(res.body.status, 'error');
      assert.equal(res.body.statusCode, 404);
      assert.ok(res.body.message);
    });
  });
});
