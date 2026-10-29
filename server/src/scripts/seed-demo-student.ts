import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { env } from '../config/env.js';
import { User } from '../models/User.js';
import { Subject } from '../models/Subject.js';
import { Task } from '../models/Task.js';
import { Goal } from '../models/Goal.js';
import { Note } from '../models/Note.js';
import { StudySession } from '../models/StudySession.js';
import { AttendanceRecord } from '../models/AttendanceRecord.js';
import { calculateAttendance } from '../services/attendance-calc.service.js';

const DEMO_EMAIL = 'demostudent99@university.edu';

async function seedDemoStudent() {
  console.log(`[Seed] Connecting to MongoDB: ${env.MONGODB_URI}...`);
  await mongoose.connect(env.MONGODB_URI);

  try {
    let demoUser = await User.findOne({ email: DEMO_EMAIL });

    if (!demoUser) {
      console.log(`[Seed] Creating demo user '${DEMO_EMAIL}'...`);
      const passwordHash = await bcrypt.hash('DemoStudent@123', 10);
      demoUser = await User.create({
        email: DEMO_EMAIL,
        passwordHash,
        role: 'student',
        name: 'Demo Student',
        status: 'active',
      });
    }

    // STRICT SAFETY CHECK: Never touch any account other than demo student
    if (demoUser.email !== DEMO_EMAIL) {
      throw new Error(
        `FATAL: Target user email '${demoUser.email}' is NOT the demo account! Aborting.`
      );
    }

    console.log(
      `[Seed] Purging previous demo data for ${demoUser.email} (UserId: ${demoUser._id})...`
    );
    await Task.deleteMany({ userId: demoUser._id });
    await Goal.deleteMany({ userId: demoUser._id });
    await Note.deleteMany({ userId: demoUser._id });
    await StudySession.deleteMany({ userId: demoUser._id });

    // 1. Seed Real ERP Subjects & Attendance Records
    const ERP_COURSES = [
      {
        code: 'CEUL560.1',
        name: 'Climate Change Science',
        type: 'Lecture',
        credits: 3,
        p: 30,
        od: 3,
        m: 0,
        a: 3,
        erp: 91.67,
      },
      {
        code: 'CRT',
        name: 'Campus Recruitment Training',
        type: 'Lab',
        credits: 2,
        p: 58,
        od: 0,
        m: 0,
        a: 14,
        erp: 80.56,
      },
      {
        code: 'CSUL501',
        name: 'Design and Analysis of Algorithms',
        type: 'Lecture',
        credits: 4,
        p: 26,
        od: 1,
        m: 0,
        a: 11,
        erp: 71.05,
      },
      {
        code: 'CSUL502',
        name: 'Machine Learning',
        type: 'Lecture',
        credits: 4,
        p: 26,
        od: 2,
        m: 0,
        a: 9,
        erp: 75.68,
      },
      {
        code: 'CSUL503',
        name: 'Cryptography and Network Security',
        type: 'Lecture',
        credits: 3,
        p: 32,
        od: 0,
        m: 0,
        a: 8,
        erp: 80.0,
      },
      {
        code: 'CSUL504',
        name: 'Full Stack Development',
        type: 'Lecture',
        credits: 3,
        p: 17,
        od: 2,
        m: 0,
        a: 5,
        erp: 79.17,
      },
      {
        code: 'CSUL511',
        name: 'DevOps Practices and Principles',
        type: 'Lecture',
        credits: 3,
        p: 30,
        od: 3,
        m: 1,
        a: 7,
        erp: 85.0,
      },
      {
        code: 'CSUP520',
        name: 'Design and Analysis of Algorithms Lab',
        type: 'Lab',
        credits: 2,
        p: 22,
        od: 0,
        m: 0,
        a: 4,
        erp: 84.62,
      },
      {
        code: 'CSUP521',
        name: 'Machine Learning Lab',
        type: 'Lab',
        credits: 2,
        p: 22,
        od: 0,
        m: 0,
        a: 2,
        erp: 91.67,
      },
      {
        code: 'CSUP522',
        name: 'Full Stack Development Lab',
        type: 'Lab',
        credits: 2,
        p: 18,
        od: 6,
        m: 0,
        a: 2,
        erp: 92.31,
      },
      {
        code: 'CSUT530',
        name: 'Industrial Training',
        type: 'Lab',
        credits: 2,
        p: 14,
        od: 0,
        m: 2,
        a: 1,
        erp: 100.0,
      },
    ];

    console.log(`[Seed] Upserting 11 university courses for demo student...`);
    const subjectMap = new Map<string, mongoose.Types.ObjectId>();

    for (const c of ERP_COURSES) {
      const calc = calculateAttendance(
        { present: c.p, od: c.od, makeup: c.m, absent: c.a, subjectType: c.type },
        'standard_od',
        c.erp
      );

      const subj = await Subject.findOneAndUpdate(
        { userId: demoUser._id, code: c.code },
        {
          $set: {
            name: c.name,
            credits: c.credits,
            semester: 5,
            attendancePercentage: calc.percentage,
          },
        },
        { upsert: true, returnDocument: 'after' }
      );

      subjectMap.set(c.code, subj._id);

      await AttendanceRecord.findOneAndUpdate(
        { userId: demoUser._id, subjectCode: c.code },
        {
          $set: {
            subjectName: c.name,
            subjectType: c.type,
            present: c.p,
            od: c.od,
            makeup: c.m,
            absent: c.a,
            totalAttended: calc.attended,
            totalConducted: calc.conducted,
            calculatedPercentage: calc.percentage,
            erpReportedPercentage: c.erp,
            isDiscrepancy: calc.isDiscrepancy,
            discrepancyNote: calc.discrepancyNote || '',
            threshold: 75,
            policyUsed: 'standard_od',
          },
        },
        { upsert: true }
      );
    }

    // 2. Seed Tasks Across All 3 Kanban Stages
    console.log(`[Seed] Creating Kanban tasks...`);
    await Task.create([
      {
        userId: demoUser._id,
        title: 'Complete Dynamic Programming Problem Set',
        description:
          'Implement bottom-up DP solution for 0/1 Knapsack and Matrix Chain Multiplication in C++.',
        priority: 'high',
        status: 'pending',
        dueDate: new Date(Date.now() + 2 * 86400000),
        subjectId: subjectMap.get('CSUL501'),
        subjectCode: 'CSUL501',
      },
      {
        userId: demoUser._id,
        title: 'Review Dockerfile & Kubernetes Manifests',
        description:
          'Configure multi-stage Docker build and Helm chart for microservices assignment.',
        priority: 'medium',
        status: 'pending',
        dueDate: new Date(Date.now() + 5 * 86400000),
        subjectId: subjectMap.get('CSUL511'),
        subjectCode: 'CSUL511',
      },
      {
        userId: demoUser._id,
        title: 'Train CNN Model on CIFAR-10',
        description:
          'Fine-tune ResNet-18 with data augmentation techniques to hit 88% test accuracy.',
        priority: 'high',
        status: 'in_progress',
        dueDate: new Date(Date.now() + 3 * 86400000),
        subjectId: subjectMap.get('CSUL502'),
        subjectCode: 'CSUL502',
      },
      {
        userId: demoUser._id,
        title: 'Implement RSA Key Exchange Prototype',
        description: 'Verify Euler totient math, modular exponentiation, and prime generation.',
        priority: 'medium',
        status: 'in_progress',
        dueDate: new Date(Date.now() + 7 * 86400000),
        subjectId: subjectMap.get('CSUL503'),
        subjectCode: 'CSUL503',
      },
      {
        userId: demoUser._id,
        title: 'Submit Full Stack Sprint 1 Deliverable',
        description: 'Push REST API endpoints with JWT authentication and test coverage report.',
        priority: 'low',
        status: 'completed',
        dueDate: new Date(Date.now() - 2 * 86400000),
        subjectId: subjectMap.get('CSUL504'),
        subjectCode: 'CSUL504',
      },
      {
        userId: demoUser._id,
        title: 'Past Due: Algorithm Midsem Review',
        description: 'Review master theorem cases and divide & conquer recurrence relations.',
        priority: 'high',
        status: 'pending',
        dueDate: new Date(Date.now() - 1 * 86400000), // Overdue task to verify red badge
        subjectId: subjectMap.get('CSUL501'),
        subjectCode: 'CSUL501',
      },
    ]);

    // 3. Seed Auto-Linked & Manual Goals
    console.log(`[Seed] Creating academic goals with auto-linking...`);
    await Goal.create([
      {
        userId: demoUser._id,
        title: 'Restore CSUL501 Attendance above 75%',
        description:
          'Auto-tracking Algorithm course attendance to resolve exam eligibility shortfall.',
        targetValue: 75,
        currentValue: 71.05,
        unit: '%',
        category: 'Attendance',
        subjectId: subjectMap.get('CSUL501'),
        subjectCode: 'CSUL501',
        autoLinkMetric: 'attendance',
        status: 'active',
        targetDate: new Date(Date.now() + 25 * 86400000),
      },
      {
        userId: demoUser._id,
        title: 'Log 25 Focus Study Hours',
        description: 'Accumulate concentrated Pomodoro focus time across core computing subjects.',
        targetValue: 25,
        currentValue: 14.5,
        unit: 'hrs',
        category: 'Academic',
        autoLinkMetric: 'study_hours',
        status: 'active',
        targetDate: new Date(Date.now() + 20 * 86400000),
      },
      {
        userId: demoUser._id,
        title: 'Complete 15 Academic Course Tasks',
        description: 'Complete problem sets, laboratory worksheets, and coding assignments.',
        targetValue: 15,
        currentValue: 1,
        unit: 'tasks',
        category: 'Academic',
        autoLinkMetric: 'task_completion',
        status: 'active',
        targetDate: new Date(Date.now() + 30 * 86400000),
      },
      {
        userId: demoUser._id,
        title: 'Achieve 8.8+ SGPA in Semester 5',
        description:
          'Target grades: A+ in Algorithms and Machine Learning, A in Full Stack and DevOps.',
        targetValue: 9,
        currentValue: 8.5,
        unit: 'SGPA',
        category: 'Academic',
        autoLinkMetric: 'none',
        status: 'active',
        targetDate: new Date(Date.now() + 60 * 86400000),
      },
    ]);

    // 4. Seed Markdown Lecture Notes with Sanitized Content & Tags
    console.log(`[Seed] Creating markdown lecture notes...`);
    await Note.create([
      {
        userId: demoUser._id,
        title: 'Dynamic Programming: Memoization vs Tabulation',
        content: `# Dynamic Programming Framework

Dynamic programming applies to problems with **optimal substructure** and **overlapping subproblems**.

## Top-Down (Memoization)
Recursion with an auxiliary cache table to store subproblem evaluations:
\`\`\`typescript
const memo: Record<number, number> = {};
function fib(n: number): number {
  if (n <= 1) return n;
  if (memo[n]) return memo[n];
  return memo[n] = fib(n - 1) + fib(n - 2);
}
\`\`\`

## Bottom-Up (Tabulation)
Iterative evaluation filling an array from base cases:
- Space optimization: Keep only previous 2 states ($O(1)$ space).
- Time complexity: $O(N)$.

## Core Problems for Exam
- 0/1 Knapsack
- Longest Common Subsequence (LCS)
- Matrix Chain Multiplication (MCM)`,
        subjectId: subjectMap.get('CSUL501'),
        subjectCode: 'CSUL501',
        tags: ['algorithms', 'dp', 'midsem', 'csul501'],
        isPinned: true,
      },
      {
        userId: demoUser._id,
        title: 'Kubernetes Pod Lifecycle & Probes',
        content: `### K8s Health Check Mechanisms

1. **Liveness Probe**: Determines if the container needs to be restarted.
2. **Readiness Probe**: Determines if a container is ready to accept incoming traffic.
3. **Startup Probe**: Knows when a legacy container has finished starting up.

> Tip: Set \`initialDelaySeconds\` properly for Java or heavy Node.js runtimes.`,
        subjectId: subjectMap.get('CSUL511'),
        subjectCode: 'CSUL511',
        tags: ['devops', 'kubernetes', 'containers'],
        isPinned: false,
      },
      {
        userId: demoUser._id,
        title: 'Asymmetric Cryptography: RSA Mathematical Foundations',
        content: `### RSA Math Checklist
- Choose two distinct large primes: $p$ and $q$
- Compute modulus: $n = p \\times q$
- Compute Euler's totient: $\\phi(n) = (p - 1)(q - 1)$
- Public exponent $e$: $1 < e < \\phi(n)$ and $\\gcd(e, \\phi(n)) = 1$
- Private exponent $d$: $d \\times e \\equiv 1 \\pmod{\\phi(n)}$`,
        subjectId: subjectMap.get('CSUL503'),
        subjectCode: 'CSUL503',
        tags: ['cryptography', 'rsa', 'security'],
        isPinned: false,
      },
    ]);

    // 5. Seed Authoritative Study Sessions for Weekly Chart
    console.log(`[Seed] Creating focus study sessions...`);
    const now = Date.now();
    const sessions = [
      { title: 'Algorithms DP Review', code: 'CSUL501', mins: 45, daysAgo: 6 },
      { title: 'Machine Learning Lab Work', code: 'CSUP521', mins: 60, daysAgo: 5 },
      { title: 'DevOps CI/CD Pipeline Setup', code: 'CSUL511', mins: 50, daysAgo: 4 },
      { title: 'FSD React Component Architecture', code: 'CSUL504', mins: 90, daysAgo: 3 },
      { title: 'Algorithm Amortized Analysis', code: 'CSUL501', mins: 75, daysAgo: 2 },
      { title: 'Cryptography Problem Sheet', code: 'CSUL503', mins: 40, daysAgo: 1 },
      { title: 'Morning Deep Work: Algorithms', code: 'CSUL501', mins: 60, daysAgo: 0 },
      { title: 'Afternoon Focus: Full Stack Lab', code: 'CSUP522', mins: 45, daysAgo: 0 },
    ];

    for (const s of sessions) {
      const endTime = new Date(now - s.daysAgo * 86400000 - 3600000);
      const startTime = new Date(endTime.getTime() - s.mins * 60000);
      const durationSeconds = s.mins * 60;

      await StudySession.create({
        userId: demoUser._id,
        title: s.title,
        subjectId: subjectMap.get(s.code),
        subjectCode: s.code,
        status: 'completed',
        startTime,
        endTime,
        pausedSeconds: 0,
        durationSeconds,
      });
    }

    console.log(`[Seed] Demo student '${DEMO_EMAIL}' successfully populated!`);
  } finally {
    await mongoose.disconnect();
    console.log('[Seed] Disconnected from MongoDB.');
  }
}

seedDemoStudent().catch((err) => {
  console.error('[Seed Error]:', err);
  process.exit(1);
});
