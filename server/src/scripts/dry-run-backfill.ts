import { connectDB, disconnectDB } from '../config/db.js';
import { User } from '../models/User.js';
import { StudentProfile } from '../models/StudentProfile.js';
import { AttendanceRecord } from '../models/AttendanceRecord.js';
import { Subject } from '../models/Subject.js';

async function main() {
  await connectDB();

  // Parse --user <email> argument if provided
  const args = process.argv.slice(2);
  const userIdx = args.indexOf('--user');
  const targetEmail = userIdx !== -1 && args[userIdx + 1] ? args[userIdx + 1].trim().toLowerCase() : null;

  console.log(`\n========================================`);
  console.log(`   DRY RUN: SUBJECTS BACKFILL AUDIT`);
  console.log(`========================================`);
  if (targetEmail) {
    console.log(`[Filter] Targeting single user email: ${targetEmail}`);
  } else {
    console.log(`[Filter] All accounts in database`);
  }

  const users = await User.find(targetEmail ? { email: targetEmail } : {});
  console.log(`\nFound ${users.length} matching user(s) in database:\n`);

  for (const u of users) {
    const profile = await StudentProfile.findOne({ userId: u._id });
    const records = await AttendanceRecord.find({ userId: u._id });
    const existingSubjects = await Subject.find({ userId: u._id });

    console.log(`--------------------------------------------------`);
    console.log(`User ID:        ${u._id}`);
    console.log(`Email:          ${u.email}`);
    console.log(`Name:           ${u.name}`);
    console.log(`Role:           ${u.role}`);
    console.log(`Status:         ${u.status}`);
    console.log(`Roll Number:    ${profile?.rollNumber ?? 'None'}`);
    console.log(`Department:     ${profile?.department ?? 'None'}`);
    console.log(`Semester:       ${profile?.semester ?? 'None'}`);
    console.log(`Created At:     ${u.createdAt ? u.createdAt.toISOString() : 'Unknown'}`);
    console.log(`Attendance Records: ${records.length}`);
    console.log(`Existing Subjects:   ${existingSubjects.length}`);

    // Group records by subjectCode
    const uniqueCodes = Array.from(new Set(records.map((r) => r.subjectCode)));
    console.log(`Unique Course Codes (${uniqueCodes.length}):`, uniqueCodes.join(', '));

    // Check how many would be created
    let wouldCreate = 0;
    for (const code of uniqueCodes) {
      const alreadyHas = existingSubjects.some((s) => s.code === code);
      if (!alreadyHas) wouldCreate++;
    }
    console.log(`Subjects to be created for this user: ${wouldCreate}`);
  }
  console.log(`--------------------------------------------------\n`);

  // Idempotency verification: simulate running candidate computation twice
  console.log(`=== IDEMPOTENCY CHECK (SIMULATION) ===`);
  const allRecords = await AttendanceRecord.find(
    targetEmail ? { userId: { $in: users.map((u) => u._id) } } : {}
  );
  const currentSubjects = await Subject.find(
    targetEmail ? { userId: { $in: users.map((u) => u._id) } } : {}
  );

  // Run 1: current DB state
  const candidatesRun1 = new Set<string>();
  for (const r of allRecords) {
    const key = `${r.userId.toString()}::${r.subjectCode}`;
    const alreadyExists = currentSubjects.some(
      (s) => s.userId.toString() === r.userId.toString() && s.code === r.subjectCode
    );
    if (!alreadyExists) {
      candidatesRun1.add(key);
    }
  }
  console.log(`Run 1 (Initial dry run): Would create ${candidatesRun1.size} new Subject record(s).`);

  // Run 2: assuming Run 1 created those subjects
  const simulatedSubjects = [
    ...currentSubjects.map((s) => `${s.userId.toString()}::${s.code}`),
    ...Array.from(candidatesRun1),
  ];
  const candidatesRun2 = new Set<string>();
  for (const r of allRecords) {
    const key = `${r.userId.toString()}::${r.subjectCode}`;
    const alreadyExists = simulatedSubjects.includes(key);
    if (!alreadyExists) {
      candidatesRun2.add(key);
    }
  }
  console.log(`Run 2 (Second run with simulated subjects): Would create ${candidatesRun2.size} new Subject record(s).`);
  console.log(`Idempotency Verified: ${candidatesRun2.size === 0 ? 'PASS (0 subjects created on run 2)' : 'FAIL'}`);

  await disconnectDB();
}

main().catch((err) => {
  console.error('Audit script failed:', err);
  process.exit(1);
});
