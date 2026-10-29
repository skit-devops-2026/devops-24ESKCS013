/**
 * One-Time Migration: Backfill Subjects from Existing Attendance Records
 * Ensures all historical attendance entries have matching Subject records,
 * unifying the Course catalog as a single source of truth across modules.
 *
 * Usage:
 *   # Dry run for all users:
 *   npx tsx src/scripts/backfill-subjects.ts --dry-run
 *
 *   # Target a single user by email:
 *   npx tsx src/scripts/backfill-subjects.ts --user b241105@gmail.com
 *
 *   # Dry run for a single user:
 *   npx tsx src/scripts/backfill-subjects.ts --user b241105@gmail.com --dry-run
 *
 *   # Run for all accounts:
 *   npx tsx src/scripts/backfill-subjects.ts
 */

import { connectDB, disconnectDB } from '../config/db.js';
import { User } from '../models/User.js';
import { AttendanceRecord } from '../models/AttendanceRecord.js';
import { Subject } from '../models/Subject.js';
import { StudentProfile } from '../models/StudentProfile.js';

export async function runBackfill() {
  const args = process.argv.slice(2);
  const isDryRun = args.includes('--dry-run');
  const userIdx = args.indexOf('--user');
  const targetEmail =
    userIdx !== -1 && args[userIdx + 1] ? args[userIdx + 1].trim().toLowerCase() : null;

  console.log(`\n======================================================`);
  console.log(`   ACADEMIC REGISTRY BACKFILL: ATTENDANCE -> SUBJECTS`);
  console.log(`======================================================`);
  if (isDryRun) {
    console.log(`[MODE] DRY RUN ONLY (No database writes will occur)`);
  } else {
    console.log(`[MODE] LIVE EXECUTION`);
  }

  await connectDB();

  let targetUserIds: string[] | null = null;
  if (targetEmail) {
    const targetUser = await User.findOne({ email: targetEmail });
    if (!targetUser) {
      console.error(`\n[Error] User with email '${targetEmail}' was not found in the database.`);
      await disconnectDB();
      process.exit(1);
    }
    console.log(
      `[Filter] Targeting single account: ${targetUser.name} (${targetUser.email}) [ID: ${targetUser._id}]`
    );
    targetUserIds = [targetUser._id.toString()];
  } else {
    console.log(`[Filter] Targeting all users in the database.`);
  }

  const query = targetUserIds ? { userId: { $in: targetUserIds } } : {};
  const records = await AttendanceRecord.find(query);
  console.log(`[Found] ${records.length} AttendanceRecord(s) matching filter.`);

  let createdSubjects = 0;
  let skippedExistingSubjects = 0;
  let linkedRecords = 0;

  for (const record of records) {
    const isLab =
      record.subjectType?.toLowerCase().includes('lab') ||
      record.subjectName.toLowerCase().includes('lab');

    const profile = await StudentProfile.findOne({ userId: record.userId });
    const semester = profile?.semester || 1;

    // Strict idempotency: check if (userId, subjectCode) already exists
    let subject = await Subject.findOne({
      userId: record.userId,
      code: record.subjectCode,
    });

    if (!subject) {
      if (!isDryRun) {
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
      }
      createdSubjects++;
      console.log(
        `  ➕ [${isDryRun ? 'WOULD CREATE' : 'CREATED'}] Subject ${record.subjectCode} (${record.subjectName}) for user ${record.userId}`
      );
    } else {
      skippedExistingSubjects++;
      console.log(
        `  ✓ [SKIPPED - ALREADY EXISTS] Subject ${record.subjectCode} (${record.subjectName}) for user ${record.userId}`
      );
      if (!isDryRun) {
        // Keep attendance percentage synced
        const nextPct =
          record.calculatedPercentage || record.erpPercentage || subject.attendancePercentage;
        if (subject.attendancePercentage !== nextPct) {
          subject.attendancePercentage = nextPct;
          await subject.save();
        }
      }
    }

    // Link AttendanceRecord -> Subject if not yet linked
    if (subject) {
      if (!record.subjectId || record.subjectId.toString() !== subject._id.toString()) {
        if (!isDryRun) {
          record.subjectId = subject._id;
          await record.save();
        }
        linkedRecords++;
      }
    }
  }

  console.log(`\n------------------------------------------------------`);
  console.log(`[Summary] Total records evaluated:        ${records.length}`);
  console.log(`[Summary] Subjects created:               ${createdSubjects}`);
  console.log(`[Summary] Subjects already exist (skip):  ${skippedExistingSubjects}`);
  console.log(`[Summary] Attendance records linked:      ${linkedRecords}`);
  console.log(`------------------------------------------------------\n`);

  await disconnectDB();
}

// Allow direct CLI execution
if (
  process.argv[1]?.endsWith('backfill-subjects.ts') ||
  process.argv[1]?.endsWith('backfill-subjects.js')
) {
  runBackfill()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('[Migration Error]', err);
      process.exit(1);
    });
}
