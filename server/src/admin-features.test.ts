import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { createApp } from './app.js';
import { User } from './models/User.js';
import { StudentProfile } from './models/StudentProfile.js';
import { Subject } from './models/Subject.js';

let mongod: MongoMemoryServer;
let app: ReturnType<typeof createApp>;

let adminCookie: string;
let studentCookie: string;
let studentId: string;
let adminId: string;

describe('Admin Subsystem & Institutional Management Integration Tests', () => {
  before(async () => {
    mongod = await MongoMemoryServer.create();
    const uri = mongod.getUri();
    await mongoose.connect(uri);
    app = createApp();

    // 1. Create Administrator account
    const adminPasswordHash = await User.hashPassword('AdminPass123!');
    const adminUser = await User.create({
      email: 'admin@college.edu',
      passwordHash: adminPasswordHash,
      name: 'Dean of Academics',
      role: 'admin',
      status: 'active',
    });
    adminId = adminUser._id.toString();

    const adminLoginRes = await request(app)
      .post('/api/auth/login')
      .send({ email: 'admin@college.edu', password: 'AdminPass123!' });
    const rawAdminCookie = adminLoginRes.headers['set-cookie'];
    adminCookie = (Array.isArray(rawAdminCookie) ? rawAdminCookie : [String(rawAdminCookie)]).find(
      (c) => c.startsWith('student_hub_token=')
    )!;

    // 2. Register Student account (John Doe)
    const regRes = await request(app).post('/api/auth/register').send({
      name: 'John Doe',
      email: 'john.doe@college.edu',
      password: 'Password123!',
      rollNumber: '24ESKCS099',
      department: 'Computer Science',
      semester: 3,
    });
    studentId = regRes.body.user.id;
    // Set John's profile attendance to compliant 85%
    await StudentProfile.findOneAndUpdate(
      { userId: studentId },
      { $set: { attendancePercentage: 85 } }
    );
    const rawStudentCookie = regRes.headers['set-cookie'];
    studentCookie = (
      Array.isArray(rawStudentCookie) ? rawStudentCookie : [String(rawStudentCookie)]
    ).find((c) => c.startsWith('student_hub_token='))!;

    // 3. Register second student (Jane Smith) with low attendance
    const janeReg = await request(app).post('/api/auth/register').send({
      name: 'Jane Smith',
      email: 'jane.smith@college.edu',
      password: 'Password123!',
      rollNumber: '24ESKCS100',
      department: 'Electronics',
      semester: 4,
    });
    // Set Jane's profile attendance to 65% (< 75%)
    await StudentProfile.findOneAndUpdate(
      { userId: janeReg.body.user.id },
      { $set: { attendancePercentage: 65 } }
    );

    // Create a subject for Jane with 60% attendance
    await Subject.create({
      userId: janeReg.body.user.id,
      name: 'Digital Circuits',
      code: 'EC301',
      credits: 4,
      facultyName: 'Prof. Sharma',
      attendancePercentage: 60,
      syllabusProgress: 50,
    });
  });

  after(async () => {
    await mongoose.connection.close();
    if (mongod) {
      await mongod.stop();
    }
  });

  // ==========================================
  // SECTION 1: Authorization & RBAC Checks
  // ==========================================
  describe('RBAC & Endpoint Authorization', () => {
    it('rejects unauthenticated requests to admin endpoints with 401', async () => {
      const res = await request(app).get('/api/admin/students');
      assert.equal(res.status, 401);
      assert.equal(res.body.status, 'error');
    });

    it('denies student access to admin student directory with 403', async () => {
      const res = await request(app).get('/api/admin/students').set('Cookie', studentCookie);
      assert.equal(res.status, 403);
      assert.match(res.body.message, /Forbidden/i);
    });

    it('denies student access to admin system stats with 403', async () => {
      const res = await request(app).get('/api/admin/stats').set('Cookie', studentCookie);
      assert.equal(res.status, 403);
    });

    it('denies student from modifying user status with 403', async () => {
      const res = await request(app)
        .patch(`/api/admin/students/${studentId}/status`)
        .set('Cookie', studentCookie)
        .send({ status: 'suspended' });
      assert.equal(res.status, 403);
    });

    it('denies student from publishing announcements with 403', async () => {
      const res = await request(app).post('/api/announcements').set('Cookie', studentCookie).send({
        title: 'Unauthorized announcement',
        content: 'This should be blocked.',
      });
      assert.equal(res.status, 403);
    });

    it('denies student from creating institutional resources with 403', async () => {
      const res = await request(app).post('/api/resources').set('Cookie', studentCookie).send({
        title: 'Unauthorized resource',
        description: 'This should fail.',
        resourceType: 'syllabus',
        url: 'https://college.edu/syllabus.pdf',
      });
      assert.equal(res.status, 403);
    });
  });

  // ==========================================
  // SECTION 2: Student Directory
  // ==========================================
  describe('Student Directory & Inspection', () => {
    it('allows admin to list paginated students with profile data', async () => {
      const res = await request(app)
        .get('/api/admin/students?page=1&limit=10')
        .set('Cookie', adminCookie);

      assert.equal(res.status, 200);
      assert.equal(res.body.status, 'ok');
      assert.ok(Array.isArray(res.body.data));
      assert.ok(res.body.data.length >= 2);
      assert.ok(res.body.pagination);

      // Verify safe serialization (passwordHash must NEVER be exposed)
      for (const student of res.body.data) {
        assert.equal(student.passwordHash, undefined);
        assert.ok(student.id);
        assert.ok(student.name);
        assert.ok(student.email);
        assert.ok(student.profile);
        assert.ok(student.profile.rollNumber);
      }
    });

    it('supports searching students by name or roll number', async () => {
      const res = await request(app)
        .get('/api/admin/students?search=24ESKCS099')
        .set('Cookie', adminCookie);

      assert.equal(res.status, 200);
      assert.equal(res.body.data.length, 1);
      assert.equal(res.body.data[0].profile.rollNumber, '24ESKCS099');
      assert.equal(res.body.data[0].name, 'John Doe');
    });

    it('returns student deep inspection data with enrolled subjects', async () => {
      const res = await request(app)
        .get(`/api/admin/students/${studentId}`)
        .set('Cookie', adminCookie);

      assert.equal(res.status, 200);
      assert.equal(res.body.data.student.id, studentId);
      assert.equal(res.body.data.profile.rollNumber, '24ESKCS099');
      assert.ok(Array.isArray(res.body.data.subjects));
      assert.ok(res.body.data.taskStats);
    });

    it('rejects invalid ObjectId for student inspection with 400', async () => {
      const res = await request(app)
        .get('/api/admin/students/not-a-valid-id')
        .set('Cookie', adminCookie);

      assert.equal(res.status, 400);
      assert.match(res.body.message, /Invalid student ID format/i);
    });

    it('returns 404 when student record is not found', async () => {
      const fakeId = new mongoose.Types.ObjectId().toString();
      const res = await request(app)
        .get(`/api/admin/students/${fakeId}`)
        .set('Cookie', adminCookie);

      assert.equal(res.status, 404);
    });
  });

  // ==========================================
  // SECTION 3: Account Status Transitions & Security
  // ==========================================
  describe('Account Status Management & Suspension Enforcement', () => {
    it('prevents administrator from suspending their own account', async () => {
      const res = await request(app)
        .patch(`/api/admin/students/${adminId}/status`)
        .set('Cookie', adminCookie)
        .send({ status: 'suspended' });

      assert.equal(res.status, 400);
      assert.match(res.body.message, /cannot alter their own account status/i);
    });

    it('allows admin to suspend a student account', async () => {
      const res = await request(app)
        .patch(`/api/admin/students/${studentId}/status`)
        .set('Cookie', adminCookie)
        .send({ status: 'suspended' });

      assert.equal(res.status, 200);
      assert.equal(res.body.data.status, 'suspended');

      // Verify suspended student is rejected when attempting to login
      const loginRes = await request(app)
        .post('/api/auth/login')
        .send({ email: 'john.doe@college.edu', password: 'Password123!' });

      assert.equal(loginRes.status, 403);
      assert.match(loginRes.body.message, /suspended/i);

      // Verify suspended student existing cookie is rejected on authenticated routes
      const protectedRes = await request(app).get('/api/auth/me').set('Cookie', studentCookie);

      assert.equal(protectedRes.status, 403);
      assert.match(protectedRes.body.message, /suspended/i);
    });

    it('allows admin to re-activate a suspended student account', async () => {
      const res = await request(app)
        .patch(`/api/admin/students/${studentId}/status`)
        .set('Cookie', adminCookie)
        .send({ status: 'active' });

      assert.equal(res.status, 200);
      assert.equal(res.body.data.status, 'active');

      // Login succeeds again
      const loginRes = await request(app)
        .post('/api/auth/login')
        .send({ email: 'john.doe@college.edu', password: 'Password123!' });

      assert.equal(loginRes.status, 200);
    });
  });

  // ==========================================
  // SECTION 4: Announcements Subsystem
  // ==========================================
  describe('Institutional Announcements', () => {
    let publishedId: string;
    let draftId: string;

    it('allows admin to create a published announcement', async () => {
      const res = await request(app).post('/api/announcements').set('Cookie', adminCookie).send({
        title: 'Midterm Examination Schedule 2026',
        content: 'Midterm exams will commence from November 15, 2026.',
        priority: 'urgent',
        targetAudience: 'all',
        status: 'published',
      });

      assert.equal(res.status, 201);
      assert.equal(res.body.data.title, 'Midterm Examination Schedule 2026');
      assert.equal(res.body.data.status, 'published');
      publishedId = res.body.data._id;
    });

    it('allows admin to create a draft announcement', async () => {
      const res = await request(app).post('/api/announcements').set('Cookie', adminCookie).send({
        title: 'Draft Campus Renovation Notice',
        content: 'Library third floor renovation plan details.',
        priority: 'normal',
        targetAudience: 'students',
        status: 'draft',
      });

      assert.equal(res.status, 201);
      assert.equal(res.body.data.status, 'draft');
      draftId = res.body.data._id;
    });

    it('allows student to see only published announcements and hides drafts', async () => {
      const res = await request(app).get('/api/announcements').set('Cookie', studentCookie);

      assert.equal(res.status, 200);
      const items = res.body.data;
      const foundPublished = items.some((a: { _id: string }) => a._id === publishedId);
      const foundDraft = items.some((a: { _id: string }) => a._id === draftId);

      assert.equal(foundPublished, true, 'Student should see published announcement');
      assert.equal(foundDraft, false, 'Student must NEVER see draft announcement');
    });

    it('allows admin to view all announcements including drafts', async () => {
      const res = await request(app).get('/api/announcements').set('Cookie', adminCookie);

      assert.equal(res.status, 200);
      const items = res.body.data;
      const foundDraft = items.some((a: { _id: string }) => a._id === draftId);
      assert.equal(foundDraft, true);
    });

    it('allows admin to delete an announcement', async () => {
      const res = await request(app)
        .delete(`/api/announcements/${draftId}`)
        .set('Cookie', adminCookie);

      assert.equal(res.status, 200);
      assert.match(res.body.message, /deleted successfully/i);

      // Verify deletion
      const checkRes = await request(app)
        .delete(`/api/announcements/${draftId}`)
        .set('Cookie', adminCookie);
      assert.equal(checkRes.status, 404);
    });
  });

  // ==========================================
  // SECTION 5: Resource Library Subsystem
  // ==========================================
  describe('Resource Library Management', () => {
    let resourceId: string;

    it('rejects dangerous and unsafe URL schemes in resources', async () => {
      const res = await request(app).post('/api/resources').set('Cookie', adminCookie).send({
        title: 'Unsafe Resource',
        description: 'XSS or file protocol injection',
        resourceType: 'syllabus',
        url: 'javascript:alert(1)',
      });

      assert.equal(res.status, 400);
      assert.match(res.body.message, /valid http:\/\/ or https:\/\//i);
    });

    it('allows admin to publish a valid resource with https URL', async () => {
      const res = await request(app).post('/api/resources').set('Cookie', adminCookie).send({
        title: 'Computer Networks Lab Manual 2026',
        description: 'Official university lab manual with socket programming examples.',
        resourceType: 'lab_manual',
        url: 'https://college.edu/academics/cs/cn-lab-manual.pdf',
        department: 'Computer Science',
        semester: 5,
        status: 'published',
      });

      assert.equal(res.status, 201);
      assert.equal(res.body.data.title, 'Computer Networks Lab Manual 2026');
      resourceId = res.body.data._id;
    });

    it('allows students to query published resources with search and filter', async () => {
      const res = await request(app)
        .get('/api/resources?search=Networks')
        .set('Cookie', studentCookie);

      assert.equal(res.status, 200);
      assert.equal(res.body.data.length, 1);
      assert.equal(res.body.data[0]._id, resourceId);
    });

    it('allows admin to delete an institutional resource', async () => {
      const res = await request(app)
        .delete(`/api/resources/${resourceId}`)
        .set('Cookie', adminCookie);

      assert.equal(res.status, 200);
      assert.match(res.body.message, /deleted successfully/i);
    });
  });

  // ==========================================
  // SECTION 6: System Statistics & Analytics
  // ==========================================
  describe('System Statistics & Attendance Defaulter Calculations', () => {
    it('returns calculated metrics with accurate attendance defaulters separation', async () => {
      const res = await request(app)
        .get('/api/admin/stats?threshold=75')
        .set('Cookie', adminCookie);

      assert.equal(res.status, 200);
      const stats = res.body.data;

      // Verify student metrics
      assert.ok(stats.students.total >= 2);
      assert.ok(stats.students.active >= 2);
      assert.equal(stats.students.suspended, 0);

      // Verify attendance breakdown fulfills user requirement:
      // Unique affected students separated from low-attendance subject records
      assert.equal(stats.attendance.thresholdPercentage, 75);
      assert.equal(stats.attendance.overallProfileDefaultersCount, 1, 'Jane has 65% in profile');
      assert.equal(stats.attendance.lowAttendanceSubjectRecordsCount, 1, 'EC301 has 60%');
      assert.equal(stats.attendance.uniqueSubjectDefaultersCount, 1);
      assert.equal(
        stats.attendance.uniqueAffectedStudentsCount,
        1,
        'Jane is the unique affected student'
      );
    });
  });
});
