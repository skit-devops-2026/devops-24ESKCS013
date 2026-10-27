import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { createApp } from './app.js';
import { connectDB, disconnectDB } from './config/db.js';
import { Subject } from './models/Subject.js';
import { AttendanceRecord } from './models/AttendanceRecord.js';
import {
  calculateAttendance,
  calculateClassesNeeded,
  calculateSkippableClasses,
  simulateScenario,
  parseErpAttendanceText,
} from './services/attendance-calc.service.js';

let mongod: MongoMemoryServer;
const app = createApp();

let studentACookie: string[];
let studentBCookie: string[];

const REAL_ERP_TSV = `
#\tSubject Code\tSubject\tSubject Type\tPresent\tOD\tMakeup\tAbsent\tPercentage
1\tCSUL501\tDesign and Analysis of Algorithms\tLecture\t26\t1\t0\t11\t71.05
2\tCSUL502\tMachine Learning\tLecture\t26\t2\t0\t9\t75.68
3\tCSUL504\tFull Stack Development\tLecture\t17\t2\t0\t5\t79.17
4\tCSUT530\tIndustrial Training\tTraining\t14\t0\t2\t1\t100.00
`.trim();

const FULL_11_ERP_TSV = `
# University ERP Attendance Report
# Student ERP Aggregate: 80.1% | Overall OD Count: 17
# Event Attendance: Techpravah 2026 (12–15 October 2026) — Present: 8 hrs | Absent: 16 hrs | Total: 24 hrs
# Event Note: Event hours are included in aggregate attendance but are not assigned to individual lectures, labs, or days.
#\tSubject Code\tSubject\tSubject Type\tPresent\tOD\tMakeup\tAbsent\tPercentage
1\tCEUL560.1\tClimate Change Science\tLecture\t30\t3\t0\t3\t91.67
2\tCRT\tCampus Recruitment Training\tLab\t58\t0\t0\t14\t80.56
3\tCSUL501\tDesign and Analysis of Algorithms\tLecture\t26\t1\t0\t11\t71.05
4\tCSUL502\tMachine Learning\tLecture\t26\t2\t0\t9\t75.68
5\tCSUL503\tCryptography and Network Security\tLecture\t32\t0\t0\t8\t80.00
6\tCSUL504\tFull Stack Development\tLecture\t17\t2\t0\t5\t79.17
7\tCSUL511\tDevOps Practices and Principles\tLecture\t30\t3\t1\t7\t85.00
8\tCSUP520\tDesign and Analysis of Algorithms Lab\tLab\t22\t0\t0\t4\t84.62
9\tCSUP521\tMachine Learning Lab\tLab\t22\t0\t0\t2\t91.67
10\tCSUP522\tFull Stack Development Lab\tLab\t18\t6\t0\t2\t92.31
11\tCSUT530\tIndustrial Training\tLab\t14\t0\t2\t1\t100.00
`.trim();

const FULL_11_ERP_PIPE = `
# University ERP Attendance Report
# Student ERP Aggregate: 80.1% | Overall OD Count: 17
# Event Attendance: Techpravah 2026 (12–15 October 2026) — Present: 8 hrs | Absent: 16 hrs | Total: 24 hrs
# Event Note: Event hours are included in aggregate attendance but are not assigned to individual lectures, labs, or days.
# | Subject Code | Subject | Subject Type | Present | OD | Makeup | Absent | Percentage
1 | CEUL560.1 | Climate Change Science | Lecture | 30 | 3 | 0 | 3 | 91.67
2 | CRT | Campus Recruitment Training | Lab | 58 | 0 | 0 | 14 | 80.56
3 | CSUL501 | Design and Analysis of Algorithms | Lecture | 26 | 1 | 0 | 11 | 71.05
4 | CSUL502 | Machine Learning | Lecture | 26 | 2 | 0 | 9 | 75.68
5 | CSUL503 | Cryptography and Network Security | Lecture | 32 | 0 | 0 | 8 | 80.00
6 | CSUL504 | Full Stack Development | Lecture | 17 | 2 | 0 | 5 | 79.17
7 | CSUL511 | DevOps Practices and Principles | Lecture | 30 | 3 | 1 | 7 | 85.00
8 | CSUP520 | Design and Analysis of Algorithms Lab | Lab | 22 | 0 | 0 | 4 | 84.62
9 | CSUP521 | Machine Learning Lab | Lab | 22 | 0 | 0 | 2 | 91.67
10 | CSUP522 | Full Stack Development Lab | Lab | 18 | 6 | 0 | 2 | 92.31
11 | CSUT530 | Industrial Training | Lab | 14 | 0 | 2 | 1 | 100.00
`.trim();

const FULL_11_ERP_NO_HEADER = `
1\tCEUL560.1\tClimate Change Science\tLecture\t30\t3\t0\t3\t91.67
2\tCRT\tCampus Recruitment Training\tLab\t58\t0\t0\t14\t80.56
3\tCSUL501\tDesign and Analysis of Algorithms\tLecture\t26\t1\t0\t11\t71.05
4\tCSUL502\tMachine Learning\tLecture\t26\t2\t0\t9\t75.68
5\tCSUL503\tCryptography and Network Security\tLecture\t32\t0\t0\t8\t80.00
6\tCSUL504\tFull Stack Development\tLecture\t17\t2\t0\t5\t79.17
7\tCSUL511\tDevOps Practices and Principles\tLecture\t30\t3\t1\t7\t85.00
8\tCSUP520\tDesign and Analysis of Algorithms Lab\tLab\t22\t0\t0\t4\t84.62
9\tCSUP521\tMachine Learning Lab\tLab\t22\t0\t0\t2\t91.67
10\tCSUP522\tFull Stack Development Lab\tLab\t18\t6\t0\t2\t92.31
11\tCSUT530\tIndustrial Training\tLab\t14\t0\t2\t1\t100.00
`.trim();

describe('Attendance Intelligence Unit & Integration Tests', () => {
  before(async () => {
    mongod = await MongoMemoryServer.create();
    await connectDB(mongod.getUri());

    // Register Student A
    const resA = await request(app)
      .post('/api/auth/register')
      .send({
        name: 'Attendance Student Alice',
        email: 'alice.attendance@test.edu',
        password: 'Password123!',
        rollNumber: 'CS_ATT_01',
        department: 'CS',
        semester: 5,
      });
    studentACookie = resA.headers['set-cookie'] as unknown as string[];

    // Register Student B (for cross-user isolation tests)
    const resB = await request(app)
      .post('/api/auth/register')
      .send({
        name: 'Attendance Student Bob',
        email: 'bob.attendance@test.edu',
        password: 'Password123!',
        rollNumber: 'CS_ATT_02',
        department: 'CS',
        semester: 5,
      });
    studentBCookie = resB.headers['set-cookie'] as unknown as string[];

    // Seed existing subject for Alice to test catalog linking
    await request(app)
      .post('/api/subjects')
      .set('Cookie', studentACookie)
      .send({
        code: 'CSUL501',
        name: 'Design and Analysis of Algorithms',
        credits: 4,
        semester: 5,
        attendancePercentage: 0,
      });
  });

  after(async () => {
    await disconnectDB();
    if (mongod) {
      await mongod.stop();
    }
  });

  /* -------------------------------------------------------------
   * 1. MATHEMATICAL VERIFICATION & FIXTURE TESTS
   * ------------------------------------------------------------- */
  describe('Mathematical Calculation Engine & Real ERP Fixtures', () => {
    it('CSUL501: calculates 27/38 = 71.05% and proves exactly 6 classes needed for 75%', () => {
      const calc = calculateAttendance(
        { present: 26, od: 1, makeup: 0, absent: 11 },
        'standard_od',
        71.05
      );
      assert.equal(calc.attended, 27);
      assert.equal(calc.conducted, 38);
      assert.equal(calc.percentage, 71.05);
      assert.equal(calc.isDiscrepancy, false);

      // Verify consecutive classes needed for 75%
      const needed = calculateClassesNeeded(calc.attended, calc.conducted, 75);
      assert.equal(needed, 6);

      // Proof: Attending 6 consecutive classes reaches exactly 75%
      const sim6 = simulateScenario(calc.attended, calc.conducted, 6, 0, 75);
      assert.equal(sim6.projectedAttended, 33);
      assert.equal(sim6.projectedConducted, 44);
      assert.equal(sim6.projectedPercentage, 75.0);
      assert.equal(sim6.status, 'safe');

      // Proof: Attending only 5 classes leaves student at 74.42% (still shortage)
      const sim5 = simulateScenario(calc.attended, calc.conducted, 5, 0, 75);
      assert.equal(sim5.projectedPercentage, 74.42);
      assert.equal(sim5.status, 'shortage');
    });

    it('CSUL502: calculates 28/37 = 75.68% from latest ERP counts and proves 0 classes can be safely missed', () => {
      const calc = calculateAttendance(
        { present: 26, od: 2, makeup: 0, absent: 9 },
        'standard_od',
        75.68
      );
      assert.equal(calc.attended, 28);
      assert.equal(calc.conducted, 37);
      assert.equal(calc.percentage, 75.68);
      assert.equal(calc.isDiscrepancy, false);

      const skippable = calculateSkippableClasses(calc.attended, calc.conducted, 75);
      assert.equal(skippable, 0); // At 75.68%, even 1 missed class drops to 73.68%

      // Missing 1 class drops below 75% (28/38 = 73.68% - Shortage)
      const sim1 = simulateScenario(calc.attended, calc.conducted, 0, 1, 75);
      assert.equal(sim1.projectedAttended, 28);
      assert.equal(sim1.projectedConducted, 38);
      assert.equal(sim1.projectedPercentage, 73.68);
      assert.equal(sim1.status, 'shortage');

      // Attending 1 class improves to 29/38 = 76.32% (Safe)
      const simAttend1 = simulateScenario(calc.attended, calc.conducted, 1, 0, 75);
      assert.equal(simAttend1.projectedAttended, 29);
      assert.equal(simAttend1.projectedConducted, 38);
      assert.equal(simAttend1.projectedPercentage, 76.32);
      assert.equal(simAttend1.status, 'safe');
    });

    it('CSUL504: calculates 19/24 = 79.17% and proves 1 class can be safely missed', () => {
      const calc = calculateAttendance(
        { present: 17, od: 2, makeup: 0, absent: 5 },
        'standard_od',
        79.17
      );
      assert.equal(calc.attended, 19);
      assert.equal(calc.conducted, 24);
      assert.equal(calc.percentage, 79.17);
      assert.equal(calc.isDiscrepancy, false);

      const skippable = calculateSkippableClasses(calc.attended, calc.conducted, 75);
      assert.equal(skippable, 1);

      // Missing 1 class results in 19/25 (76.00% - Safe)
      const sim1 = simulateScenario(calc.attended, calc.conducted, 0, 1, 75);
      assert.equal(sim1.projectedAttended, 19);
      assert.equal(sim1.projectedConducted, 25);
      assert.equal(sim1.projectedPercentage, 76.0);
      assert.equal(sim1.status, 'safe');
    });

    it('CSUT530: flags standard policy discrepancy vs ERP 100%, and proves compensatory match', () => {
      // Under Standard Policy: 14/17 = 82.35%, flagged as discrepancy vs 100%
      const standardCalc = calculateAttendance(
        { present: 14, od: 0, makeup: 2, absent: 1, subjectType: 'Training' },
        'standard_od',
        100.0
      );
      assert.equal(standardCalc.attended, 14);
      assert.equal(standardCalc.conducted, 17);
      assert.equal(standardCalc.percentage, 82.35);
      assert.equal(standardCalc.isDiscrepancy, true);
      assert.ok(standardCalc.discrepancyDelta! > 17);

      // Under Compensatory Makeup: Makeup offsets Absent -> 14/14 = 100.00%
      const compCalc = calculateAttendance(
        { present: 14, od: 0, makeup: 2, absent: 1, subjectType: 'Training' },
        'makeup_compensatory',
        100.0
      );
      assert.equal(compCalc.attended, 14);
      assert.equal(compCalc.conducted, 14);
      assert.equal(compCalc.percentage, 100.0);
      assert.equal(compCalc.isDiscrepancy, false);

      // Under ERP Direct: Preserves ERP 100% directly
      const directCalc = calculateAttendance(
        { present: 14, od: 0, makeup: 2, absent: 1, subjectType: 'Training' },
        'erp_direct',
        100.0
      );
      assert.equal(directCalc.percentage, 100.0);
      assert.equal(directCalc.isDiscrepancy, false);
    });

    it('CSUL511: DevOps calculates 33/41 = 80.49% under standard policy and flags ERP 85.00% discrepancy', () => {
      // Present: 30, OD: 3, Makeup: 1, Absent: 7, ERP: 85.00%
      const calc = calculateAttendance(
        { present: 30, od: 3, makeup: 1, absent: 7, subjectType: 'Lecture' },
        'standard_od',
        85.0
      );
      assert.equal(calc.attended, 33);
      assert.equal(calc.conducted, 41);
      assert.equal(calc.percentage, 80.49);
      assert.equal(calc.isDiscrepancy, true);
      assert.equal(calc.discrepancyDelta, 4.51);
      assert.ok(calc.discrepancyNote?.includes('Makeup'));

      // If Makeup is credited as present without being added to conducted (34/40 = 85.00%)
      const simulatedErpNumerator = 30 + 3 + 1;
      const simulatedErpDenominator = 30 + 3 + 7;
      assert.equal(Number(((simulatedErpNumerator / simulatedErpDenominator) * 100).toFixed(2)), 85.0);
    });

    it('handles threshold boundary calculations across 60%, 65%, 70%, 75%, 80%, 85%', () => {
      const attended = 27;
      const conducted = 38; // Current 71.05%

      assert.equal(calculateClassesNeeded(attended, conducted, 60), 0);
      assert.equal(calculateClassesNeeded(attended, conducted, 70), 0);
      assert.equal(calculateClassesNeeded(attended, conducted, 75), 6);
      assert.equal(calculateClassesNeeded(attended, conducted, 80), 17); // (0.8*38 - 27)/(0.2) = 3.4/0.2 = 17
      assert.equal(calculateClassesNeeded(attended, conducted, 85), 36); // ceil((0.85*38 - 27)/(0.15)) = ceil(5.3/0.15) = 36
    });

    it('handles edge cases: zero conducted, 100% attendance, zero attendance', () => {
      assert.equal(calculateClassesNeeded(0, 0, 75), 0);
      assert.equal(calculateSkippableClasses(0, 0, 75), 0);

      // Zero attendance in 10 classes
      assert.equal(calculateClassesNeeded(0, 10, 75), 30); // (0.75*10 - 0)/0.25 = 30
      assert.equal(calculateSkippableClasses(0, 10, 75), 0);

      // 100% attendance in 20 classes
      assert.equal(calculateClassesNeeded(20, 20, 75), 0);
      assert.equal(calculateSkippableClasses(20, 20, 75), 6); // floor(20/0.75 - 20) = 6
    });
  });

  /* -------------------------------------------------------------
   * 2. PARSER SPECIFICATION TESTS
   * ------------------------------------------------------------- */
  describe('ERP Text & CSV Parser Module', () => {
    it('parses real ERP tab-separated text with 4 valid rows and detects CSUT530 discrepancy', () => {
      const parsed = parseErpAttendanceText(REAL_ERP_TSV, 'standard_od');
      assert.equal(parsed.success, true);
      assert.equal(parsed.rows.length, 4);
      assert.equal(parsed.rows.every((r) => r.isValid), true);

      const daa = parsed.rows.find((r) => r.subjectCode === 'CSUL501');
      assert.ok(daa);
      assert.equal(daa.present, 26);
      assert.equal(daa.od, 1);
      assert.equal(daa.makeup, 0);
      assert.equal(daa.absent, 11);
      assert.equal(daa.erpPercentage, 71.05);
      assert.equal(daa.calculatedPercentage, 71.05);
      assert.equal(daa.isDiscrepancy, false);

      const training = parsed.rows.find((r) => r.subjectCode === 'CSUT530');
      assert.ok(training);
      assert.equal(training.erpPercentage, 100.0);
      assert.equal(training.calculatedPercentage, 82.35);
      assert.equal(training.isDiscrepancy, true);
    });

    it('parses ALL 11 real ERP subjects from TSV paste without losing any rows', () => {
      const parsed = parseErpAttendanceText(FULL_11_ERP_TSV, 'standard_od');
      assert.equal(parsed.success, true);
      assert.equal(parsed.totalRows, 11);
      assert.equal(parsed.validRows, 11);
      assert.equal(parsed.invalidRows, 0);

      // Verify CEUL560.1 dot code
      const climate = parsed.rows.find((r) => r.subjectCode === 'CEUL560.1');
      assert.ok(climate);
      assert.equal(climate.subjectName, 'Climate Change Science');
      assert.equal(climate.present, 30);
      assert.equal(climate.od, 3);
      assert.equal(climate.absent, 3);
      assert.equal(climate.calculatedPercentage, 91.67);

      // Verify CRT
      const crt = parsed.rows.find((r) => r.subjectCode === 'CRT');
      assert.ok(crt);
      assert.equal(crt.present, 58);
      assert.equal(crt.calculatedPercentage, 80.56);

      // Verify CSUL501 shortage
      const daa = parsed.rows.find((r) => r.subjectCode === 'CSUL501');
      assert.ok(daa);
      assert.equal(daa.calculatedPercentage, 71.05);

      // Verify CSUL511 discrepancy
      const devops = parsed.rows.find((r) => r.subjectCode === 'CSUL511');
      assert.ok(devops);
      assert.equal(devops.isDiscrepancy, true);
      assert.equal(devops.calculatedPercentage, 80.49);
      assert.equal(devops.erpPercentage, 85.0);

      // Verify CSUT530 discrepancy
      const training = parsed.rows.find((r) => r.subjectCode === 'CSUT530');
      assert.ok(training);
      assert.equal(training.isDiscrepancy, true);
      assert.equal(training.erpPercentage, 100.0);
      assert.equal(training.calculatedPercentage, 82.35);
    });

    it('parses ALL 11 real ERP subjects from pipe-delimited format (|)', () => {
      const parsed = parseErpAttendanceText(FULL_11_ERP_PIPE, 'standard_od');
      assert.equal(parsed.success, true);
      assert.equal(parsed.validRows, 11);
      assert.equal(parsed.rows.length, 11);
      assert.equal(parsed.rows[0].subjectCode, 'CEUL560.1');
      assert.equal(parsed.rows[10].subjectCode, 'CSUT530');
    });

    it('parses ALL 11 real ERP subjects when header row is completely omitted', () => {
      const parsed = parseErpAttendanceText(FULL_11_ERP_NO_HEADER, 'standard_od');
      assert.equal(parsed.success, true);
      assert.equal(parsed.validRows, 11);
      assert.equal(parsed.rows.length, 11);
      assert.equal(parsed.rows[0].subjectCode, 'CEUL560.1');
      assert.equal(parsed.rows[0].present, 30);
      assert.equal(parsed.rows[0].od, 3);
      assert.equal(parsed.rows[0].absent, 3);
      assert.equal(parsed.rows[10].subjectCode, 'CSUT530');
      assert.equal(parsed.rows[10].present, 14);
    });

    it('parses comma-separated CSV with quotes and custom header aliases', () => {
      const csv = `
"Course Code","Course Name","Category","Attended","Duty","Make-up","Missed","Attendance %"
"CS501","Data Structures","Lecture","30","2","0","8","80.00"
      `.trim();

      const parsed = parseErpAttendanceText(csv, 'standard_od');
      assert.equal(parsed.success, true);
      assert.equal(parsed.rows.length, 1);
      assert.equal(parsed.rows[0].subjectCode, 'CS501');
      assert.equal(parsed.rows[0].present, 30);
      assert.equal(parsed.rows[0].od, 2);
      assert.equal(parsed.rows[0].absent, 8);
      assert.equal(parsed.rows[0].calculatedPercentage, 80.0);
    });

    it('rejects empty inputs and malformed rows', () => {
      const emptyRes = parseErpAttendanceText('', 'standard_od');
      assert.equal(emptyRes.success, false);
      assert.ok(emptyRes.errors.length > 0);

      const invalidCsv = `
Code,Subject,Present,Absent
,Unnamed,10,2
CS101,Valid,10,2
CS101,Duplicate,-5,2
      `.trim();

      const res = parseErpAttendanceText(invalidCsv, 'standard_od');
      assert.equal(res.rows.length, 3);
      assert.equal(res.rows[0].isValid, false); // Missing code
      assert.equal(res.rows[1].isValid, true);
      assert.equal(res.rows[2].isValid, false); // Duplicate code + negative count
    });
  });

  /* -------------------------------------------------------------
   * 3. REST API ENDPOINTS & WORKFLOW INTEGRATION
   * ------------------------------------------------------------- */
  let createdRecordId: string;

  describe('Attendance REST API & Multi-Tenancy Isolation', () => {
    it('POST /api/attendance/parse-preview returns preview with matched subjects without persisting', async () => {
      const res = await request(app)
        .post('/api/attendance/parse-preview')
        .set('Cookie', studentACookie)
        .send({
          rawData: REAL_ERP_TSV,
          policy: 'standard_od',
        });

      assert.equal(res.status, 200);
      assert.equal(res.body.status, 'ok');
      assert.equal(res.body.totalRows, 4);
      assert.equal(res.body.validRows, 4);

      // Verify CSUL501 was matched with existing subject in database
      const daa = res.body.rows.find((r: { subjectCode: string }) => r.subjectCode === 'CSUL501');
      assert.ok(daa);
      assert.ok(daa.matchedSubjectId);

      // Verify nothing was persisted to database yet
      const count = await AttendanceRecord.countDocuments({ subjectCode: 'CSUL501' });
      assert.equal(count, 0);
    });

    it('POST /api/attendance/import persists records and syncs linked Subject attendance', async () => {
      const res = await request(app)
        .post('/api/attendance/import')
        .set('Cookie', studentACookie)
        .send({
          policy: 'standard_od',
          records: [
            {
              subjectCode: 'CSUL501',
              subjectName: 'Design and Analysis of Algorithms',
              subjectType: 'Lecture',
              present: 26,
              od: 1,
              makeup: 0,
              absent: 11,
              erpPercentage: 71.05,
              threshold: 75,
            },
            {
              subjectCode: 'CSUL502',
              subjectName: 'Machine Learning',
              subjectType: 'Lecture',
              present: 26,
              od: 2,
              makeup: 0,
              absent: 9,
              erpPercentage: 75.68,
              threshold: 75,
            },
            {
              subjectCode: 'CSUT530',
              subjectName: 'Industrial Training',
              subjectType: 'Training',
              present: 14,
              od: 0,
              makeup: 2,
              absent: 1,
              erpPercentage: 100.0,
              threshold: 75,
            },
          ],
        });

      assert.equal(res.status, 201);
      assert.equal(res.body.status, 'ok');
      assert.equal(res.body.count, 3);

      const daaRecord = res.body.data.find((r: { subjectCode: string }) => r.subjectCode === 'CSUL501');
      assert.ok(daaRecord);
      assert.equal(daaRecord.calculatedPercentage, 71.05);
      createdRecordId = daaRecord._id;

      // Verify linked Subject in database had its attendance updated
      const linkedSubject = await Subject.findOne({ code: 'CSUL501' });
      assert.ok(linkedSubject);
      assert.equal(linkedSubject.attendancePercentage, 71.05);
    });

    it('POST /api/attendance/import supports repeatable imports without duplicate records (upsert)', async () => {
      // Re-importing CSUL501 with 1 additional present class
      const res = await request(app)
        .post('/api/attendance/import')
        .set('Cookie', studentACookie)
        .send({
          policy: 'standard_od',
          records: [
            {
              subjectCode: 'CSUL501',
              subjectName: 'Design and Analysis of Algorithms',
              subjectType: 'Lecture',
              present: 27, // Increased by 1
              od: 1,
              makeup: 0,
              absent: 11,
              erpPercentage: 71.79,
            },
          ],
        });

      assert.equal(res.status, 201);
      // Total count in database for Alice should still be 3 records, not 4
      const count = await AttendanceRecord.countDocuments({ subjectCode: 'CSUL501' });
      assert.equal(count, 1);
    });

    it('GET /api/attendance returns semester summary and prioritizes CSUL501 shortage at top', async () => {
      const res = await request(app)
        .get('/api/attendance')
        .set('Cookie', studentACookie);

      assert.equal(res.status, 200);
      assert.equal(res.body.status, 'ok');
      assert.equal(res.body.summary.totalSubjects, 3);
      assert.equal(res.body.summary.hasShortage, true);
      assert.equal(res.body.summary.shortageCount, 1);

      // Verify CSUL501 is the top record in shortages list
      assert.equal(res.body.shortages.length, 1);
      assert.equal(res.body.shortages[0].subjectCode, 'CSUL501');
      assert.equal(res.body.shortages[0].isShortage, true);
      assert.ok(res.body.shortages[0].classesNeeded > 0);
    });

    it('imports all 11 real ERP subjects and confirms persistence, idempotency, and summary math', async () => {
      // 1. Parse preview for 11 subjects
      const previewRes = await request(app)
        .post('/api/attendance/parse-preview')
        .set('Cookie', studentACookie)
        .send({ rawData: FULL_11_ERP_TSV, policy: 'standard_od' });
      assert.equal(previewRes.status, 200);
      assert.equal(previewRes.body.validRows, 11);

      // 2. Import all 11 subjects
      const importRes = await request(app)
        .post('/api/attendance/import')
        .set('Cookie', studentACookie)
        .send({
          policy: 'standard_od',
          records: previewRes.body.rows.map((r: {
            subjectCode: string;
            subjectName: string;
            subjectType: string;
            present: number;
            od: number;
            makeup: number;
            absent: number;
            erpPercentage: number;
            discrepancyNote?: string;
          }) => ({
            subjectCode: r.subjectCode,
            subjectName: r.subjectName,
            subjectType: r.subjectType,
            present: r.present,
            od: r.od,
            makeup: r.makeup,
            absent: r.absent,
            erpPercentage: r.erpPercentage,
            threshold: 75,
            discrepancyNote: r.discrepancyNote,
          })),
        });
      assert.equal(importRes.status, 201);
      assert.equal(importRes.body.count, 11);

      // 3. Re-import all 11 subjects (idempotency check: no duplicate records)
      const reimportRes = await request(app)
        .post('/api/attendance/import')
        .set('Cookie', studentACookie)
        .send({
          policy: 'standard_od',
          records: previewRes.body.rows.map((r: {
            subjectCode: string;
            subjectName: string;
            subjectType: string;
            present: number;
            od: number;
            makeup: number;
            absent: number;
            erpPercentage: number;
          }) => ({
            subjectCode: r.subjectCode,
            subjectName: r.subjectName,
            subjectType: r.subjectType,
            present: r.present,
            od: r.od,
            makeup: r.makeup,
            absent: r.absent,
            erpPercentage: r.erpPercentage,
            threshold: 75,
          })),
        });
      assert.equal(reimportRes.status, 201);
      assert.equal(reimportRes.body.count, 11);

      // 4. GET /api/attendance: verify exact totals and sorted shortages
      const listRes = await request(app)
        .get('/api/attendance')
        .set('Cookie', studentACookie);
      assert.equal(listRes.status, 200);
      assert.equal(listRes.body.summary.totalSubjects, 11);
      assert.equal(listRes.body.summary.totalAttended, 312);
      assert.equal(listRes.body.summary.totalConducted, 381);
      assert.equal(listRes.body.summary.overallPercentage, 81.89);
      assert.equal(listRes.body.summary.erpAggregatePercentage, 80.1);
      assert.equal(listRes.body.summary.overallOdCount, 17);
      assert.ok(listRes.body.summary.eventAttendance);
      assert.equal(listRes.body.summary.eventAttendance.eventName, 'Techpravah 2026');
      assert.equal(listRes.body.summary.eventAttendance.presentHours, 8);
      assert.equal(listRes.body.summary.eventAttendance.absentHours, 16);
      assert.equal(listRes.body.summary.eventAttendance.totalHours, 24);
      assert.ok(listRes.body.summary.erpAggregateExplanation.includes('Techpravah 2026'));
      assert.equal(listRes.body.summary.shortageCount, 1);
      assert.equal(listRes.body.summary.safeCount, 10);
      assert.equal(listRes.body.shortages[0].subjectCode, 'CSUL501');

      // Verify CSUL502 updated counts and zero discrepancy
      const csul502 = listRes.body.records.find((r: { subjectCode: string }) => r.subjectCode === 'CSUL502');
      assert.ok(csul502);
      assert.equal(csul502.absent, 9);
      assert.equal(csul502.erpPercentage, 75.68);
      assert.equal(csul502.calculatedPercentage, 75.68);
      assert.equal(csul502.isDiscrepancy, false);

      // Verify CSUT530 and CSUL511 discrepancies
      const csut530 = listRes.body.records.find((r: { subjectCode: string }) => r.subjectCode === 'CSUT530');
      assert.ok(csut530);
      assert.equal(csut530.isDiscrepancy, true);
      assert.equal(csut530.erpPercentage, 100.0);
      assert.equal(csut530.calculatedPercentage, 82.35);

      const csul511 = listRes.body.records.find((r: { subjectCode: string }) => r.subjectCode === 'CSUL511');
      assert.ok(csul511);
      assert.equal(csul511.isDiscrepancy, true);
      assert.equal(csul511.erpPercentage, 85.0);
      assert.equal(csul511.calculatedPercentage, 80.49);
    });

    it('detects changed records and old vs new values when parsing a newer ERP report', async () => {
      // Simulate newer report where CSUL504 has 1 more absent class (absent: 6 instead of 5)
      const UPDATED_REPORT = `
# University ERP Attendance Report
# Student ERP Aggregate: 80.1% | Overall OD Count: 17
# Event Attendance: Techpravah 2026 (12–15 October 2026) — Present: 8 hrs | Absent: 16 hrs | Total: 24 hrs
# | Subject Code | Subject | Subject Type | Present | OD | Makeup | Absent | Percentage
1 | CSUL504 | Full Stack Development | Lecture | 17 | 2 | 0 | 6 | 76.00
      `.trim();

      const previewRes = await request(app)
        .post('/api/attendance/parse-preview')
        .set('Cookie', studentACookie)
        .send({ rawData: UPDATED_REPORT, policy: 'standard_od' });

      assert.equal(previewRes.status, 200);
      assert.equal(previewRes.body.totalRows, 1);
      assert.equal(previewRes.body.changedRows, 1);
      const row = previewRes.body.rows[0];
      assert.equal(row.isChanged, true);
      assert.equal(row.absent, 6);
      assert.ok(row.oldValues);
      assert.equal(row.oldValues.absent, 5);
      assert.equal(row.oldValues.erpPercentage, 79.17);
    });

    it('PUT /api/attendance/overview updates ERP aggregate and event hours metadata', async () => {
      const res = await request(app)
        .put('/api/attendance/overview')
        .set('Cookie', studentACookie)
        .send({
          erpAggregatePercentage: 80.5,
          overallOdCount: 18,
          eventAttendance: {
            eventName: 'Techpravah 2026',
            eventDates: '12–15 October 2026',
            presentHours: 10,
            absentHours: 14,
            totalHours: 24,
            remarks: 'Event hours included in university aggregate attendance.',
          },
        });

      assert.equal(res.status, 200);
      assert.equal(res.body.data.erpAggregatePercentage, 80.5);
      assert.equal(res.body.data.overallOdCount, 18);
      assert.equal(res.body.data.eventAttendance.presentHours, 10);

      // Verify Bob cannot see Alice's overview
      const bobRes = await request(app)
        .get('/api/attendance')
        .set('Cookie', studentBCookie);
      assert.equal(bobRes.status, 200);
      // Bob gets defaults, not Alice's updated 80.5% or 10 present hours
      assert.notEqual(bobRes.body.summary.erpAggregatePercentage, 80.5);
    });

    it('POST /api/attendance/simulate calculates hypothetical projections', async () => {
      const res = await request(app)
        .post('/api/attendance/simulate')
        .set('Cookie', studentACookie)
        .send({
          recordId: createdRecordId,
          additionalAttended: 5,
          additionalMissed: 0,
          threshold: 75,
        });

      assert.equal(res.status, 200);
      assert.equal(res.body.status, 'ok');
      assert.equal(res.body.subjectCode, 'CSUL501');
      assert.ok(res.body.projection.projectedPercentage > 71.05);
    });

    it('enforces cross-user isolation: Bob cannot view, update, simulate, or delete Alice record', async () => {
      // Bob tries to GET Alice's records
      const bobList = await request(app)
        .get('/api/attendance')
        .set('Cookie', studentBCookie);
      assert.equal(bobList.status, 200);
      assert.equal(bobList.body.summary.totalSubjects, 0); // Bob sees 0 subjects

      // Bob tries to PATCH Alice's record
      const bobPatch = await request(app)
        .patch(`/api/attendance/${createdRecordId}`)
        .set('Cookie', studentBCookie)
        .send({ present: 50 });
      assert.equal(bobPatch.status, 404);

      // Bob tries to simulate Alice's record
      const bobSim = await request(app)
        .post('/api/attendance/simulate')
        .set('Cookie', studentBCookie)
        .send({ recordId: createdRecordId, additionalAttended: 5 });
      assert.equal(bobSim.status, 404);

      // Bob tries to DELETE Alice's record
      const bobDel = await request(app)
        .delete(`/api/attendance/${createdRecordId}`)
        .set('Cookie', studentBCookie);
      assert.equal(bobDel.status, 404);
    });

    it('PATCH /api/attendance/:id updates record counts and recalculates values', async () => {
      const res = await request(app)
        .patch(`/api/attendance/${createdRecordId}`)
        .set('Cookie', studentACookie)
        .send({
          present: 30,
          absent: 5,
        });

      assert.equal(res.status, 200);
      assert.equal(res.body.data.present, 30);
      assert.equal(res.body.data.absent, 5);
      assert.ok(res.body.data.calculatedPercentage > 75);
    });

    it('DELETE /api/attendance/:id removes the attendance record', async () => {
      const res = await request(app)
        .delete(`/api/attendance/${createdRecordId}`)
        .set('Cookie', studentACookie);

      assert.equal(res.status, 200);
      assert.equal(res.body.status, 'ok');

      // Verify gone
      const check = await AttendanceRecord.findById(createdRecordId);
      assert.equal(check, null);
    });
  });
});
