import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { createApp } from './app.js';
import { connectDB, disconnectDB } from './config/db.js';
import { AUTH_COOKIE_NAME } from './services/auth.service.js';

let mongod: MongoMemoryServer;
const app = createApp();

let studentACookie: string[];
let studentBCookie: string[];

describe('Student Academic Features Integration Tests', () => {
  before(async () => {
    mongod = await MongoMemoryServer.create();
    await connectDB(mongod.getUri());

    // Register Student A
    const resA = await request(app)
      .post('/api/auth/register')
      .send({
        name: 'Student Alice',
        email: 'alice@test.edu',
        password: 'Password123!',
        rollNumber: 'CS101',
        department: 'CS',
        semester: 4,
      });
    studentACookie = resA.headers['set-cookie'] as unknown as string[];

    // Register Student B (for data isolation checks)
    const resB = await request(app)
      .post('/api/auth/register')
      .send({
        name: 'Student Bob',
        email: 'bob@test.edu',
        password: 'Password123!',
        rollNumber: 'CS102',
        department: 'CS',
        semester: 4,
      });
    studentBCookie = resB.headers['set-cookie'] as unknown as string[];
  });

  after(async () => {
    await disconnectDB();
    if (mongod) {
      await mongod.stop();
    }
  });

  let createdSubjectId: string;
  let createdTaskId: string;
  let createdGoalId: string;
  let createdNoteId: string;

  /* -------------------------------------------------------------
   * 1. SUBJECTS CATALOG TESTS
   * ------------------------------------------------------------- */
  describe('Subjects Module', () => {
    it('POST /api/subjects creates a subject for Alice', async () => {
      const res = await request(app)
        .post('/api/subjects')
        .set('Cookie', studentACookie)
        .send({
          code: 'CS301',
          name: 'Database Management Systems',
          credits: 4,
          semester: 4,
          facultyName: 'Dr. Turing',
          attendancePercentage: 92,
        });

      assert.equal(res.status, 201);
      assert.equal(res.body.status, 'ok');
      assert.equal(res.body.data.code, 'CS301');
      createdSubjectId = res.body.data._id;
    });

    it('POST /api/subjects rejects duplicate subject code for the same user', async () => {
      const res = await request(app)
        .post('/api/subjects')
        .set('Cookie', studentACookie)
        .send({
          code: 'cs301', // case-insensitive duplicate check
          name: 'Duplicate DBMS',
        });

      assert.equal(res.status, 409);
      assert.ok(res.body.message.includes('already have a subject with code CS301'));
    });

    it('POST /api/subjects allows another student (Bob) to have the same subject code', async () => {
      const res = await request(app)
        .post('/api/subjects')
        .set('Cookie', studentBCookie)
        .send({
          code: 'CS301',
          name: 'DBMS Bob Section',
          credits: 4,
        });

      assert.equal(res.status, 201);
      assert.equal(res.body.data.code, 'CS301');
    });

    it('GET /api/subjects enforces user isolation (Alice only sees her subjects)', async () => {
      const res = await request(app)
        .get('/api/subjects')
        .set('Cookie', studentACookie);

      assert.equal(res.status, 200);
      assert.equal(res.body.count, 1);
      assert.equal(res.body.data[0].code, 'CS301');
      assert.equal(res.body.data[0].name, 'Database Management Systems');
    });
  });

  /* -------------------------------------------------------------
   * 2. TASK MANAGEMENT TESTS
   * ------------------------------------------------------------- */
  describe('Tasks Module', () => {
    it('POST /api/tasks creates a task linked to Alice and her subject', async () => {
      const tomorrow = new Date(Date.now() + 86400000).toISOString();
      const res = await request(app)
        .post('/api/tasks')
        .set('Cookie', studentACookie)
        .send({
          title: 'Complete SQL Normalization Assignment',
          description: '3NF and BCNF problems',
          priority: 'high',
          status: 'pending',
          dueDate: tomorrow,
          subjectId: createdSubjectId,
        });

      assert.equal(res.status, 201);
      assert.equal(res.body.data.title, 'Complete SQL Normalization Assignment');
      assert.equal(res.body.data.subjectCode, 'CS301');
      createdTaskId = res.body.data._id;
    });

    it('GET /api/tasks/summary calculates pending and overdue counts', async () => {
      const res = await request(app)
        .get('/api/tasks/summary')
        .set('Cookie', studentACookie);

      assert.equal(res.status, 200);
      assert.equal(res.body.data.total, 1);
      assert.equal(res.body.data.pending, 1);
      assert.equal(res.body.data.completed, 0);
    });

    it('GET /api/tasks/:id rejects cross-user access (Bob cannot view Alice task)', async () => {
      const res = await request(app)
        .get(`/api/tasks/${createdTaskId}`)
        .set('Cookie', studentBCookie);

      assert.equal(res.status, 404);
    });

    it('PATCH /api/tasks/:id updates status to completed', async () => {
      const res = await request(app)
        .patch(`/api/tasks/${createdTaskId}`)
        .set('Cookie', studentACookie)
        .send({ status: 'completed' });

      assert.equal(res.status, 200);
      assert.equal(res.body.data.status, 'completed');
    });
  });

  /* -------------------------------------------------------------
   * 3. GOALS TRACKING TESTS
   * ------------------------------------------------------------- */
  describe('Goals Module', () => {
    it('POST /api/goals creates an academic milestone', async () => {
      const nextMonth = new Date(Date.now() + 30 * 86400000).toISOString();
      const res = await request(app)
        .post('/api/goals')
        .set('Cookie', studentACookie)
        .send({
          title: 'Solve 50 LeetCode Algorithms',
          targetValue: 50,
          currentValue: 15,
          unit: 'problems',
          targetDate: nextMonth,
        });

      assert.equal(res.status, 201);
      assert.equal(res.body.data.currentValue, 15);
      assert.equal(res.body.data.status, 'active');
      createdGoalId = res.body.data._id;
    });

    it('PATCH /api/goals/:id updates progress and auto-completes when reached', async () => {
      const res = await request(app)
        .patch(`/api/goals/${createdGoalId}`)
        .set('Cookie', studentACookie)
        .send({ currentValue: 50 });

      assert.equal(res.status, 200);
      assert.equal(res.body.data.currentValue, 50);
      assert.equal(res.body.data.status, 'completed');
    });

    it('GET /api/goals/summary returns average progress and counts', async () => {
      const res = await request(app)
        .get('/api/goals/summary')
        .set('Cookie', studentACookie);

      assert.equal(res.status, 200);
      assert.equal(res.body.data.total, 1);
      assert.equal(res.body.data.completed, 1);
      assert.equal(res.body.data.averageProgress, 100);
    });
  });

  /* -------------------------------------------------------------
   * 4. NOTES MODULE TESTS
   * ------------------------------------------------------------- */
  describe('Notes Module', () => {
    it('POST /api/notes creates a note with tags', async () => {
      const res = await request(app)
        .post('/api/notes')
        .set('Cookie', studentACookie)
        .send({
          title: 'Relational Algebra Lecture Notes',
          content: 'Selection (sigma), Projection (pi), Cartesian Product (X)...',
          tags: ['DBMS', 'RelationalAlgebra', 'MidsemPrep'],
          subjectId: createdSubjectId,
        });

      assert.equal(res.status, 201);
      assert.equal(res.body.data.title, 'Relational Algebra Lecture Notes');
      assert.equal(res.body.data.subjectCode, 'CS301');
      assert.equal(res.body.data.tags.length, 3);
      createdNoteId = res.body.data._id;
    });

    it('GET /api/notes supports search queries', async () => {
      const res = await request(app)
        .get('/api/notes?q=Cartesian')
        .set('Cookie', studentACookie);

      assert.equal(res.status, 200);
      assert.equal(res.body.count, 1);
      assert.equal(res.body.data[0]._id, createdNoteId);
    });

    it('GET /api/notes enforces cross-user isolation (Bob finds 0 notes)', async () => {
      const res = await request(app)
        .get('/api/notes')
        .set('Cookie', studentBCookie);

      assert.equal(res.status, 200);
      assert.equal(res.body.count, 0);
    });
  });

  /* -------------------------------------------------------------
   * 5. STUDY TIMER TESTS
   * ------------------------------------------------------------- */
  describe('Study Timer Module', () => {
    it('POST /api/study/start begins a focused study session', async () => {
      const res = await request(app)
        .post('/api/study/start')
        .set('Cookie', studentACookie)
        .send({
          subjectId: createdSubjectId,
          title: 'Deep Focus - Database Algorithms',
        });

      assert.equal(res.status, 201);
      assert.equal(res.body.session.status, 'active');
      assert.equal(res.body.session.subjectCode, 'CS301');
    });

    it('POST /api/study/start blocks duplicate overlapping sessions (409)', async () => {
      const res = await request(app)
        .post('/api/study/start')
        .set('Cookie', studentACookie)
        .send({ title: 'Second Session' });

      assert.equal(res.status, 409);
      assert.ok(res.body.message.includes('already have an active study session'));
    });

    it('GET /api/study/current returns authoritative active session on refresh', async () => {
      const res = await request(app)
        .get('/api/study/current')
        .set('Cookie', studentACookie);

      assert.equal(res.status, 200);
      assert.equal(res.body.active, true);
      assert.equal(res.body.session.status, 'active');
      assert.ok(typeof res.body.session.elapsedSeconds === 'number');
    });

    it('POST /api/study/pause marks timer as paused', async () => {
      const res = await request(app)
        .post('/api/study/pause')
        .set('Cookie', studentACookie);

      assert.equal(res.status, 200);
      assert.equal(res.body.session.status, 'paused');
    });

    it('POST /api/study/resume resumes session and accumulates paused time', async () => {
      const res = await request(app)
        .post('/api/study/resume')
        .set('Cookie', studentACookie);

      assert.equal(res.status, 200);
      assert.equal(res.body.session.status, 'active');
    });

    it('POST /api/study/finish computes authoritative duration and marks completed', async () => {
      const res = await request(app)
        .post('/api/study/finish')
        .set('Cookie', studentACookie);

      assert.equal(res.status, 200);
      assert.equal(res.body.session.status, 'completed');
      assert.ok(typeof res.body.session.durationSeconds === 'number');
    });

    it('GET /api/study/history reports aggregated study analytics', async () => {
      const res = await request(app)
        .get('/api/study/history')
        .set('Cookie', studentACookie);

      assert.equal(res.status, 200);
      assert.equal(res.body.summary.totalSessions, 1);
      assert.equal(res.body.data.length, 1);
    });
  });
});
