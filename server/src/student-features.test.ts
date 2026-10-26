import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { createApp } from './app.js';
import { connectDB, disconnectDB } from './config/db.js';
import { User } from './models/User.js';
import { Announcement } from './models/Announcement.js';
import { Resource } from './models/Resource.js';
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

    // Seed test published announcement and resource
    const adminUser = await User.create({
      name: 'Faculty Admin',
      email: 'admin-student-test@test.edu',
      passwordHash: 'dummyhash123',
      role: 'admin',
    });

    await Announcement.create({
      title: 'Midterm Examination Schedule',
      content: 'Examinations begin next Monday. Hall tickets available on portal.',
      priority: 'urgent',
      targetAudience: 'students',
      status: 'published',
      authorId: adminUser._id,
    });

    await Resource.create({
      title: 'DBMS Lecture Slides Complete',
      description: 'Full semester slide deck for CS301',
      resourceType: 'notes',
      url: 'https://cdn.university.edu/resources/dbms-slides.pdf',
      uploadedBy: adminUser._id,
      status: 'published',
    });
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

    it('GET /api/tasks lists tasks with query filters', async () => {
      const res = await request(app)
        .get('/api/tasks?status=completed')
        .set('Cookie', studentACookie);

      assert.equal(res.status, 200);
      assert.ok(Array.isArray(res.body.data));
      assert.equal(res.body.data.length, 1);
      assert.equal(res.body.data[0]._id, createdTaskId);
      assert.equal(res.body.data[0].status, 'completed');
    });

    it('DELETE /api/tasks/:id deletes task and updates task summary', async () => {
      const createRes = await request(app)
        .post('/api/tasks')
        .set('Cookie', studentACookie)
        .send({
          title: 'Disposable Task',
          dueDate: new Date(Date.now() + 86400000).toISOString(),
        });
      const disposableId = createRes.body.data._id;

      const delRes = await request(app)
        .delete(`/api/tasks/${disposableId}`)
        .set('Cookie', studentACookie);
      assert.equal(delRes.status, 200);

      const fetchRes = await request(app)
        .get(`/api/tasks/${disposableId}`)
        .set('Cookie', studentACookie);
      assert.equal(fetchRes.status, 404);
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

    it('GET /api/goals lists goals with status filter', async () => {
      const res = await request(app)
        .get('/api/goals?status=completed')
        .set('Cookie', studentACookie);

      assert.equal(res.status, 200);
      assert.equal(res.body.count, 1);
      assert.equal(res.body.data[0]._id, createdGoalId);
    });

    it('DELETE /api/goals/:id deletes goal and updates summary', async () => {
      const createRes = await request(app)
        .post('/api/goals')
        .set('Cookie', studentACookie)
        .send({
          title: 'Disposable Goal',
          targetValue: 10,
          currentValue: 0,
          targetDate: new Date(Date.now() + 86400000).toISOString(),
        });
      const disposableId = createRes.body.data._id;

      const delRes = await request(app)
        .delete(`/api/goals/${disposableId}`)
        .set('Cookie', studentACookie);
      assert.equal(delRes.status, 200);

      const fetchRes = await request(app)
        .get(`/api/goals/${disposableId}`)
        .set('Cookie', studentACookie);
      assert.equal(fetchRes.status, 404);
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

    it('PATCH /api/notes/:id updates note content and toggles isPinned', async () => {
      const res = await request(app)
        .patch(`/api/notes/${createdNoteId}`)
        .set('Cookie', studentACookie)
        .send({
          title: 'Updated Relational Algebra Notes',
          isPinned: true,
        });

      assert.equal(res.status, 200);
      assert.equal(res.body.data.title, 'Updated Relational Algebra Notes');
      assert.equal(res.body.data.isPinned, true);
    });

    it('GET /api/notes?tag= filters notes by tag', async () => {
      const res = await request(app)
        .get('/api/notes?tag=DBMS')
        .set('Cookie', studentACookie);

      assert.equal(res.status, 200);
      assert.equal(res.body.count, 1);
      assert.equal(res.body.data[0]._id, createdNoteId);
    });

    it('DELETE /api/notes/:id deletes note', async () => {
      const createRes = await request(app)
        .post('/api/notes')
        .set('Cookie', studentACookie)
        .send({
          title: 'Scratch Note',
          content: 'Temporary content',
        });
      const scratchId = createRes.body.data._id;

      const delRes = await request(app)
        .delete(`/api/notes/${scratchId}`)
        .set('Cookie', studentACookie);
      assert.equal(delRes.status, 200);

      const fetchRes = await request(app)
        .get(`/api/notes/${scratchId}`)
        .set('Cookie', studentACookie);
      assert.equal(fetchRes.status, 404);
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
   * 5. SUBJECT DETAILS & DELETION DISASSOCIATION
   * ------------------------------------------------------------- */
  describe('Subject Details & Deletion Safety', () => {
    it('GET /api/subjects/:id returns deep subject info with linked tasks and notes', async () => {
      const res = await request(app)
        .get(`/api/subjects/${createdSubjectId}`)
        .set('Cookie', studentACookie);

      assert.equal(res.status, 200);
      assert.equal(res.body.status, 'ok');
      assert.equal(res.body.data.code, 'CS301');
      assert.ok(Array.isArray(res.body.data.tasks));
      assert.ok(Array.isArray(res.body.data.notes));
      assert.ok(res.body.data.tasks.length >= 1);
      assert.ok(res.body.data.notes.length >= 1);
    });

    it('DELETE /api/subjects/:id deletes a subject and safely clears associations', async () => {
      // Create a temporary subject to delete
      const subRes = await request(app)
        .post('/api/subjects')
        .set('Cookie', studentACookie)
        .send({
          code: 'TEMP101',
          name: 'Temporary Subject',
          credits: 2,
        });
      const tempSubId = subRes.body.data._id;

      // Link a task to this temporary subject
      const taskRes = await request(app)
        .post('/api/tasks')
        .set('Cookie', studentACookie)
        .send({
          title: 'Temporary Task',
          dueDate: new Date(Date.now() + 86400000).toISOString(),
          subjectId: tempSubId,
        });
      const tempTaskId = taskRes.body.data._id;
      assert.equal(taskRes.body.data.subjectCode, 'TEMP101');

      // Delete the temporary subject
      const delRes = await request(app)
        .delete(`/api/subjects/${tempSubId}`)
        .set('Cookie', studentACookie);
      assert.equal(delRes.status, 200);

      // Verify the task still exists but has subject cleared
      const checkTask = await request(app)
        .get(`/api/tasks/${tempTaskId}`)
        .set('Cookie', studentACookie);
      assert.equal(checkTask.status, 200);
      assert.equal(checkTask.body.data.subjectId, null);
      assert.equal(checkTask.body.data.subjectCode, '');

      // Clean up the temporary task
      await request(app)
        .delete(`/api/tasks/${tempTaskId}`)
        .set('Cookie', studentACookie);
    });
  });

  /* -------------------------------------------------------------
   * 6. STUDY TIMER TESTS
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

    it('POST /api/study/cancel cancels an active study session', async () => {
      const startRes = await request(app)
        .post('/api/study/start')
        .set('Cookie', studentACookie)
        .send({ title: 'Session to Cancel' });
      assert.equal(startRes.status, 201);

      const cancelRes = await request(app)
        .post('/api/study/cancel')
        .set('Cookie', studentACookie);
      assert.equal(cancelRes.status, 200);
      assert.equal(cancelRes.body.status, 'ok');

      const currentRes = await request(app)
        .get('/api/study/current')
        .set('Cookie', studentACookie);
      assert.equal(currentRes.status, 200);
      assert.equal(currentRes.body.active, false);
      assert.equal(currentRes.body.session, null);
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

  /* -------------------------------------------------------------
   * 7. INSTITUTIONAL BULLETINS & RESOURCE LIBRARY VISIBILITY
   * ------------------------------------------------------------- */
  describe('Institutional Bulletins & Resource Library Visibility', () => {
    it('GET /api/announcements allows student to view published announcements', async () => {
      const res = await request(app)
        .get('/api/announcements')
        .set('Cookie', studentACookie);

      assert.equal(res.status, 200);
      assert.ok(Array.isArray(res.body.data));
      assert.ok(res.body.data.length >= 1);
      assert.equal(res.body.data[0].title, 'Midterm Examination Schedule');
    });

    it('GET /api/resources allows student to search and view published resources', async () => {
      const res = await request(app)
        .get('/api/resources')
        .set('Cookie', studentACookie);

      assert.equal(res.status, 200);
      assert.ok(Array.isArray(res.body.data));
      assert.ok(res.body.data.length >= 1);
      assert.equal(res.body.data[0].title, 'DBMS Lecture Slides Complete');
    });
  });

  /* -------------------------------------------------------------
   * 8. DASHBOARD METRICS CONSISTENCY
   * ------------------------------------------------------------- */
  describe('Dashboard Metrics Consistency', () => {
    it('verifies task summary metrics match actual database counts', async () => {
      const res = await request(app)
        .get('/api/tasks/summary')
        .set('Cookie', studentACookie);

      assert.equal(res.status, 200);
      assert.equal(res.body.data.total, 1);
      assert.equal(res.body.data.completed, 1);
      assert.equal(res.body.data.pending, 0);
    });

    it('verifies goal summary metrics match actual goal progress', async () => {
      const res = await request(app)
        .get('/api/goals/summary')
        .set('Cookie', studentACookie);

      assert.equal(res.status, 200);
      assert.equal(res.body.data.total, 1);
      assert.equal(res.body.data.completed, 1);
      assert.equal(res.body.data.averageProgress, 100);
    });
  });
});
