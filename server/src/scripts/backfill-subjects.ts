/**
 * One-Time Migration: Backfill Subjects from Existing Attendance Records
 * Ensures all historical attendance entries have matching Subject records,
 * unifying the Course catalog as a single source of truth across modules.
 *
 * Usage:
 *   npx tsx src/scripts/backfill-subjects.ts
 */

import { connectDB, disconnectDB } from '../config/db.js';
import { AttendanceRecord } from '../models/AttendanceRecord.js';
import { Subject } from '../models/Subject.js';
import { StudentProfile } from '../models/StudentProfile.js';

export async function runBackfill() {
  console.log('[Migration] Starting backfill of Subjects from AttendanceRecords...');
  await connectDB();

  const records = await AttendanceRecord.find({});
  console.log(`[Migration] Found ${records.length} attendance records across all users.`);

  let createdSubjects = 0;
  let linkedRecords = 0;

  for (const record of records) {
    const isLab =
      record.subjectType?.toLowerCase().includes('lab') ||
      record.subjectName.toLowerCase().includes('lab');

    const profile = await StudentProfile.findOne({ userId: record.userId });
    const semester = profile?.semester || 1;

    let subject = await Subject.findOne({
      userId: record.userId,
      code: record.subjectCode,
    });

    if (!subject) {
      subject = await Subject.create({
        userId: record.userId,
        code: record.subjectCode,
        name: record.subjectName,
        credits: isLab ? 2 : 3,
        semester,
        facultyName: '',
        attendancePercentage: record.calculatedPercentage || record.erpPercentage || 85,
        syllabusProgress: 0,
        color: '#D69A2D',
      });
      createdSubjects++;
    } else {
      subject.attendancePercentage = record.calculatedPercentage || record.erpPercentage || subject.attendancePercentage;
      await subject.save();
    }

    if (!record.subjectId || record.subjectId.toString() !== subject._id.toString()) {
      record.subjectId = subject._id;
      await record.save();
      linkedRecords++;
    }
  }

  console.log(`[Migration Complete] Created ${createdSubjects} new subjects, updated/linked ${linkedRecords} attendance records.`);
  await disconnectDB();
}

// Allow direct CLI execution
if (process.argv[1]?.endsWith('backfill-subjects.ts') || process.argv[1]?.endsWith('backfill-subjects.js')) {
  runBackfill()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('[Migration Error]', err);
      process.exit(1);
    });
}
