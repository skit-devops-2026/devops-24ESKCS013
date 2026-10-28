import { connectDB, disconnectDB } from '../config/db.js';
import { AttendanceRecord } from '../models/AttendanceRecord.js';
import { Subject } from '../models/Subject.js';

async function main() {
  await connectDB();
  const records = await AttendanceRecord.find({});
  const existingSubjects = await Subject.find({});

  console.log(`\n=== DRY RUN: SUBJECTS BACKFILL ===`);
  console.log(`Attendance Records count: ${records.length}`);
  console.log(`Current Subjects count: ${existingSubjects.length}`);

  const candidates = new Map<string, { userId: string; code: string; name: string; pct: number }>();
  for (const r of records) {
    const key = `${r.userId.toString()}_${r.subjectCode}`;
    if (!candidates.has(key)) {
      candidates.set(key, {
        userId: r.userId.toString(),
        code: r.subjectCode,
        name: r.subjectName,
        pct: r.calculatedPercentage || r.erpPercentage || 0,
      });
    }
  }

  let wouldCreate = 0;
  console.log('\nSubject Candidate Status:');
  for (const [, c] of candidates) {
    const exists = existingSubjects.some(
      (s) => s.userId.toString() === c.userId && s.code === c.code
    );
    if (!exists) {
      wouldCreate++;
      console.log(`  ➕ WOULD CREATE: ${c.code.padEnd(10)} — ${c.name} (${c.pct}%)`);
    } else {
      console.log(`  ✓ ALREADY EXISTS: ${c.code.padEnd(10)} — ${c.name}`);
    }
  }

  console.log(`\nResult: Backfill would create ${wouldCreate} new Subject record(s).`);
  await disconnectDB();
}

main().catch((err) => {
  console.error('Dry run error:', err);
  process.exit(1);
});

