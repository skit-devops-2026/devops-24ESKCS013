import { Router, Response } from 'express';
import { z } from 'zod';
import { Types } from 'mongoose';
import { AttendanceRecord } from '../models/AttendanceRecord.js';
import { AttendanceOverview } from '../models/AttendanceOverview.js';
import { Subject } from '../models/Subject.js';
import { StudentProfile } from '../models/StudentProfile.js';
import { requireAuth, AuthenticatedRequest } from '../middleware/auth.middleware.js';
import {
  AttendancePolicy,
  POLICY_METADATA,
  calculateAttendance,
  calculateClassesNeeded,
  calculateSkippableClasses,
  simulateScenario,
  parseErpAttendanceText,
} from '../services/attendance-calc.service.js';

export const attendanceRouter = Router();

attendanceRouter.use(requireAuth);

const policyEnum = z.enum(['standard_od', 'makeup_compensatory', 'strict_present', 'erp_direct']);

const importRecordItemSchema = z.object({
  subjectCode: z.string().min(1, 'Subject code is required').trim().toUpperCase(),
  subjectName: z.string().min(1, 'Subject name is required').trim(),
  subjectType: z.string().optional().default('Lecture'),
  present: z.coerce.number().int().min(0, 'Present cannot be negative'),
  od: z.coerce.number().int().min(0, 'OD cannot be negative').optional().default(0),
  makeup: z.coerce.number().int().min(0, 'Makeup cannot be negative').optional().default(0),
  absent: z.coerce.number().int().min(0, 'Absent cannot be negative'),
  erpPercentage: z.coerce.number().min(0).max(100).optional(),
  threshold: z.coerce.number().min(1).max(100).optional().default(75),
  discrepancyNote: z.string().nullable().optional(),
});

const eventAttendanceSchema = z
  .object({
    eventName: z.string().default('Techpravah 2026'),
    eventDates: z.string().default('12–15 October 2026'),
    presentHours: z.coerce.number().min(0).default(8),
    absentHours: z.coerce.number().min(0).default(16),
    totalHours: z.coerce.number().min(0).default(24),
    remarks: z
      .string()
      .default(
        'Event hours are included in aggregate attendance but are not assigned to individual lectures, labs, or days.'
      ),
  })
  .optional();

const importPayloadSchema = z.object({
  policy: policyEnum.optional().default('standard_od'),
  records: z.array(importRecordItemSchema).min(1, 'At least one record is required for import'),
  erpAggregatePercentage: z.coerce.number().min(0).max(100).optional(),
  overallOdCount: z.coerce.number().min(0).optional(),
  eventAttendance: eventAttendanceSchema,
});

const parsePreviewSchema = z.object({
  rawData: z.string().min(1, 'Raw attendance data is required'),
  policy: policyEnum.optional().default('standard_od'),
});

const updateRecordSchema = z.object({
  present: z.coerce.number().int().min(0).optional(),
  od: z.coerce.number().int().min(0).optional(),
  makeup: z.coerce.number().int().min(0).optional(),
  absent: z.coerce.number().int().min(0).optional(),
  erpPercentage: z.coerce.number().min(0).max(100).optional(),
  threshold: z.coerce.number().min(1).max(100).optional(),
  policyUsed: policyEnum.optional(),
});

const simulateSchema = z.object({
  recordId: z.string().optional(),
  attended: z.coerce.number().int().min(0).optional(),
  conducted: z.coerce.number().int().min(0).optional(),
  additionalAttended: z.coerce.number().int().min(0).default(0),
  additionalMissed: z.coerce.number().int().min(0).default(0),
  threshold: z.coerce.number().min(1).max(100).optional().default(75),
});

/**
 * POST /api/attendance/parse-preview
 * Parses pasted TSV or uploaded CSV and returns validation & discrepancy preview without saving
 */
attendanceRouter.post('/parse-preview', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const parseResult = parsePreviewSchema.safeParse(req.body);
  if (!parseResult.success) {
    res.status(400).json({
      status: 'error',
      statusCode: 400,
      message: parseResult.error.issues.map((i) => i.message).join('. '),
    });
    return;
  }

  const { rawData, policy } = parseResult.data;
  const userId = req.user!._id;

  // Retrieve student's existing attendance records for change/diff detection
  const existingRecords = await AttendanceRecord.find({ userId });
  const parsed = parseErpAttendanceText(rawData, policy, existingRecords);

  if (!parsed.success && parsed.rows.length === 0) {
    res.status(400).json({
      status: 'error',
      statusCode: 400,
      message: parsed.errors.join(' ') || 'Failed to parse attendance data.',
      errors: parsed.errors,
    });
    return;
  }

  // Cross-reference parsed rows with existing student subjects
  const studentSubjects = await Subject.find({ userId }).select('_id code name');
  const subjectMap = new Map(studentSubjects.map((s) => [s.code.toUpperCase(), s]));

  // Retrieve student's existing overview metadata if available
  const existingOverview = await AttendanceOverview.findOne({ userId });

  const metadata = {
    erpAggregatePercentage:
      parsed.metadata?.erpAggregatePercentage ?? existingOverview?.erpAggregatePercentage ?? 80.1,
    overallOdCount: parsed.metadata?.overallOdCount ?? existingOverview?.overallOdCount ?? 17,
    eventAttendance: parsed.metadata?.eventAttendance ?? existingOverview?.eventAttendance ?? {
      eventName: 'Techpravah 2026',
      eventDates: '12–15 October 2026',
      presentHours: 8,
      absentHours: 16,
      totalHours: 24,
      remarks:
        'Event hours are included in aggregate attendance but are not assigned to individual lectures, labs, or days.',
    },
  };

  const enrichedRows = parsed.rows.map((row) => {
    const matched = subjectMap.get(row.subjectCode);
    return {
      ...row,
      matchedSubjectId: matched ? matched._id.toString() : null,
      matchedSubjectName: matched ? matched.name : null,
    };
  });

  res.status(200).json({
    status: 'ok',
    policy,
    policyMeta: POLICY_METADATA[policy],
    totalRows: enrichedRows.length,
    validRows: enrichedRows.filter((r) => r.isValid).length,
    invalidRows: enrichedRows.filter((r) => !r.isValid).length,
    duplicateRows: enrichedRows.filter((r) => r.error?.includes('Duplicate')).length,
    discrepancyCount: enrichedRows.filter((r) => r.isDiscrepancy).length,
    changedRows: enrichedRows.filter((r) => r.isChanged).length,
    newRows: enrichedRows.filter((r) => r.isNew).length,
    metadata,
    rows: enrichedRows,
    errors: parsed.errors,
  });
});

/**
 * POST /api/attendance/import
 * Persists validated attendance records with the confirmed counting policy.
 * Repeatable import: upserts based on { userId, subjectCode }.
 */
attendanceRouter.post('/import', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const parseResult = importPayloadSchema.safeParse(req.body);
  if (!parseResult.success) {
    res.status(400).json({
      status: 'error',
      statusCode: 400,
      message: parseResult.error.issues.map((i) => i.message).join('. '),
    });
    return;
  }

  const { policy, records, erpAggregatePercentage, overallOdCount, eventAttendance } = parseResult.data;
  const userId = req.user!._id;

  // Retrieve student profile for default semester
  const studentProfile = await StudentProfile.findOne({ userId });
  const defaultSemester = studentProfile?.semester || 1;

  // Retrieve student's existing subjects for linking
  const studentSubjects = await Subject.find({ userId });
  const subjectMap = new Map(studentSubjects.map((s) => [s.code.toUpperCase(), s]));

  const savedRecords = [];

  for (const item of records) {
    const calc = calculateAttendance(
      {
        present: item.present,
        od: item.od,
        makeup: item.makeup,
        absent: item.absent,
        subjectType: item.subjectType,
      },
      policy,
      item.erpPercentage
    );

    // Auto-upsert Subject so Attendance and Subject always share a single source of truth
    let subject = subjectMap.get(item.subjectCode);
    const isLab = item.subjectType?.toLowerCase().includes('lab') || item.subjectName.toLowerCase().includes('lab');

    if (!subject) {
      subject = await Subject.findOneAndUpdate(
        { userId, code: item.subjectCode },
        {
          $setOnInsert: {
            credits: isLab ? 2 : 3,
            semester: defaultSemester,
            facultyName: '',
            syllabusProgress: 0,
            color: '#D69A2D',
          },
          $set: {
            name: item.subjectName,
            attendancePercentage: calc.percentage,
          },
        },
        { upsert: true, returnDocument: 'after', runValidators: true }
      );
      if (subject) {
        subjectMap.set(item.subjectCode, subject);
      }
    } else {
      subject.name = item.subjectName;
      subject.attendancePercentage = calc.percentage;
      await subject.save();
    }

    const subjectId = subject ? subject._id : null;

    // Upsert attendance record
    const record = await AttendanceRecord.findOneAndUpdate(
      { userId, subjectCode: item.subjectCode },
      {
        $set: {
          subjectName: item.subjectName,
          subjectType: item.subjectType,
          subjectId,
          present: item.present,
          od: item.od,
          makeup: item.makeup,
          absent: item.absent,
          totalConducted: calc.conducted,
          totalAttended: calc.attended,
          erpPercentage: item.erpPercentage !== undefined ? item.erpPercentage : calc.percentage,
          calculatedPercentage: calc.percentage,
          policyUsed: policy,
          threshold: item.threshold || 75,
          discrepancyNote: calc.discrepancyNote || item.discrepancyNote || null,
          lastImportedAt: new Date(),
        },
      },
      { upsert: true, returnDocument: 'after', runValidators: true }
    );

    savedRecords.push(record);
  }

  // Upsert AttendanceOverview metadata
  await AttendanceOverview.findOneAndUpdate(
    { userId },
    {
      $set: {
        ...(erpAggregatePercentage !== undefined && { erpAggregatePercentage }),
        ...(overallOdCount !== undefined && { overallOdCount }),
        ...(eventAttendance && { eventAttendance }),
        lastReportDate: new Date(),
      },
    },
    { upsert: true, returnDocument: 'after' }
  );

  res.status(201).json({
    status: 'ok',
    message: `Successfully imported ${savedRecords.length} attendance records.`,
    policy,
    policyMeta: POLICY_METADATA[policy],
    count: savedRecords.length,
    data: savedRecords,
  });
});

/**
 * GET /api/attendance
 * Retrieves student's attendance records with shortage prioritization,
 * projected recovery calculations, and overall aggregate statistics.
 */
attendanceRouter.get('/', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const userId = req.user!._id;
  const records = await AttendanceRecord.find({ userId }).sort({ subjectCode: 1 });
  const overview = await AttendanceOverview.findOne({ userId });

  let totalAttended = 0;
  let totalConducted = 0;

  const enriched = records.map((r) => {
    totalAttended += r.totalAttended;
    totalConducted += r.totalConducted;

    const threshold = r.threshold || 75;
    const isShortage = r.calculatedPercentage < threshold;
    const classesNeeded = isShortage
      ? calculateClassesNeeded(r.totalAttended, r.totalConducted, threshold)
      : 0;
    const classesSkippable = !isShortage
      ? calculateSkippableClasses(r.totalAttended, r.totalConducted, threshold)
      : 0;

    const isDiscrepancy = Math.abs(r.calculatedPercentage - r.erpPercentage) > 0.1;
    const discrepancyDelta = Number(Math.abs(r.calculatedPercentage - r.erpPercentage).toFixed(2));
    let discrepancyNote = r.discrepancyNote;
    if (isDiscrepancy && !discrepancyNote) {
      if (r.makeup > 0 && Math.abs(Number(((r.present + r.od + r.makeup) / ((r.totalConducted - r.makeup) || 1)) * 100) - r.erpPercentage) < 0.5) {
        discrepancyNote = `ERP reported ${r.erpPercentage}% vs calculated ${r.calculatedPercentage}% (${discrepancyDelta}% delta). In ERP, Makeup classes may be credited as attendance credits (34/40 = 85.00%). Preserving official ERP reference.`;
      } else if (r.erpPercentage === 100 && r.absent > 0) {
        discrepancyNote = `ERP reported 100.00% despite ${r.absent} recorded absence(s) (Standard: ${r.calculatedPercentage}%). Module likely evaluated via completion or compensatory waiver. Preserving official ERP reference.`;
      } else {
        discrepancyNote = `ERP reported ${r.erpPercentage}% vs calculated ${r.calculatedPercentage}% (${discrepancyDelta}% delta).`;
      }
    }

    return {
      ...r.toObject(),
      isShortage,
      classesNeeded,
      classesSkippable,
      isDiscrepancy,
      discrepancyDelta,
      discrepancyNote,
    };
  });

  // Prioritize subjects below threshold at the top (e.g. CSUL501 DAA)
  enriched.sort((a, b) => {
    if (a.isShortage && !b.isShortage) return -1;
    if (!a.isShortage && b.isShortage) return 1;
    return a.calculatedPercentage - b.calculatedPercentage;
  });

  const overallPercentage =
    totalConducted > 0 ? Number(((totalAttended / totalConducted) * 100).toFixed(2)) : 0;

  const shortages = enriched.filter((r) => r.isShortage);
  const safe = enriched.filter((r) => !r.isShortage);

  res.status(200).json({
    status: 'ok',
    summary: {
      totalSubjects: enriched.length,
      totalAttended,
      totalConducted,
      overallPercentage,
      erpAggregatePercentage: overview?.erpAggregatePercentage ?? 80.1,
      overallOdCount: overview?.overallOdCount ?? 17,
      eventAttendance: overview?.eventAttendance ?? {
        eventName: 'Techpravah 2026',
        eventDates: '12–15 October 2026',
        presentHours: 8,
        absentHours: 16,
        totalHours: 24,
        remarks:
          'Event hours are included in aggregate attendance but are not assigned to individual lectures, labs, or days.',
      },
      erpAggregateExplanation:
        'The ERP reports an aggregate attendance of 80.1%. This aggregate incorporates 24 event hours from Techpravah 2026 (8 Present hrs, 16 Absent hrs) and college-level OD credit calculations that are not assigned to individual lecture/lab slots. Course-level statistics below calculate lecture/lab sessions strictly.',
      shortageCount: shortages.length,
      safeCount: safe.length,
      hasShortage: shortages.length > 0,
      activePolicy: records[0]?.policyUsed || 'standard_od',
      policyMeta: POLICY_METADATA[records[0]?.policyUsed || 'standard_od'],
      lastImportedAt: records[0]?.lastImportedAt || null,
    },
    shortages,
    records: enriched,
  });
});

/**
 * PUT /api/attendance/overview
 * Directly updates student's ERP aggregate percentage, overall OD count, or event hours metadata
 */
attendanceRouter.put('/overview', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const userId = req.user!._id;
  const updateOverviewSchema = z.object({
    erpAggregatePercentage: z.coerce.number().min(0).max(100).optional(),
    overallOdCount: z.coerce.number().min(0).optional(),
    eventAttendance: eventAttendanceSchema,
  });

  const parseResult = updateOverviewSchema.safeParse(req.body);
  if (!parseResult.success) {
    res.status(400).json({
      status: 'error',
      statusCode: 400,
      message: parseResult.error.issues.map((i) => i.message).join('. '),
    });
    return;
  }

  const overview = await AttendanceOverview.findOneAndUpdate(
    { userId },
    {
      $set: {
        ...(parseResult.data.erpAggregatePercentage !== undefined && {
          erpAggregatePercentage: parseResult.data.erpAggregatePercentage,
        }),
        ...(parseResult.data.overallOdCount !== undefined && {
          overallOdCount: parseResult.data.overallOdCount,
        }),
        ...(parseResult.data.eventAttendance && {
          eventAttendance: parseResult.data.eventAttendance,
        }),
        lastReportDate: new Date(),
      },
    },
    { upsert: true, returnDocument: 'after' }
  );

  res.status(200).json({ status: 'ok', data: overview });
});

/**
 * PATCH /api/attendance/:id
 * Updates counts or threshold for a specific attendance record (server ownership enforced)
 */
attendanceRouter.patch('/:id', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  if (!Types.ObjectId.isValid(req.params.id)) {
    res.status(400).json({ status: 'error', statusCode: 400, message: 'Invalid attendance record ID' });
    return;
  }

  const parseResult = updateRecordSchema.safeParse(req.body);
  if (!parseResult.success) {
    res.status(400).json({
      status: 'error',
      statusCode: 400,
      message: parseResult.error.issues.map((i) => i.message).join('. '),
    });
    return;
  }

  const existing = await AttendanceRecord.findOne({
    _id: req.params.id,
    userId: req.user!._id,
  });

  if (!existing) {
    res.status(404).json({ status: 'error', statusCode: 404, message: 'Attendance record not found' });
    return;
  }

  const updates = parseResult.data;
  const present = updates.present !== undefined ? updates.present : existing.present;
  const od = updates.od !== undefined ? updates.od : existing.od;
  const makeup = updates.makeup !== undefined ? updates.makeup : existing.makeup;
  const absent = updates.absent !== undefined ? updates.absent : existing.absent;
  const erpPercentage =
    updates.erpPercentage !== undefined ? updates.erpPercentage : existing.erpPercentage;
  const policyUsed = updates.policyUsed || existing.policyUsed;
  const threshold = updates.threshold || existing.threshold;

  const calc = calculateAttendance(
    { present, od, makeup, absent, subjectType: existing.subjectType },
    policyUsed,
    erpPercentage
  );

  existing.present = present;
  existing.od = od;
  existing.makeup = makeup;
  existing.absent = absent;
  existing.erpPercentage = erpPercentage;
  existing.totalAttended = calc.attended;
  existing.totalConducted = calc.conducted;
  existing.calculatedPercentage = calc.percentage;
  existing.policyUsed = policyUsed;
  existing.threshold = threshold;

  await existing.save();

  // Sync with Subject if linked
  if (existing.subjectId) {
    await Subject.updateOne(
      { _id: existing.subjectId, userId: req.user!._id },
      { $set: { attendancePercentage: calc.percentage } }
    );
  }

  res.status(200).json({ status: 'ok', data: existing });
});

/**
 * DELETE /api/attendance/:id
 * Deletes attendance record (server ownership enforced)
 */
attendanceRouter.delete('/:id', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  if (!Types.ObjectId.isValid(req.params.id)) {
    res.status(400).json({ status: 'error', statusCode: 400, message: 'Invalid attendance record ID' });
    return;
  }

  const deleted = await AttendanceRecord.findOneAndDelete({
    _id: req.params.id,
    userId: req.user!._id,
  });

  if (!deleted) {
    res.status(404).json({ status: 'error', statusCode: 404, message: 'Attendance record not found' });
    return;
  }

  res.status(200).json({ status: 'ok', message: 'Attendance record deleted successfully' });
});

/**
 * POST /api/attendance/simulate
 * Simulates future scenarios (+N attended, +M missed)
 */
attendanceRouter.post('/simulate', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const parseResult = simulateSchema.safeParse(req.body);
  if (!parseResult.success) {
    res.status(400).json({
      status: 'error',
      statusCode: 400,
      message: parseResult.error.issues.map((i) => i.message).join('. '),
    });
    return;
  }

  const { recordId, attended, conducted, additionalAttended, additionalMissed, threshold } =
    parseResult.data;

  let baseAttended = attended || 0;
  let baseConducted = conducted || 0;
  let subjectCode = 'SCENARIO';
  let subjectName = 'Custom Scenario';

  if (recordId) {
    if (!Types.ObjectId.isValid(recordId)) {
      res.status(400).json({ status: 'error', statusCode: 400, message: 'Invalid record ID' });
      return;
    }
    const record = await AttendanceRecord.findOne({ _id: recordId, userId: req.user!._id });
    if (!record) {
      res.status(404).json({ status: 'error', statusCode: 404, message: 'Attendance record not found' });
      return;
    }
    baseAttended = record.totalAttended;
    baseConducted = record.totalConducted;
    subjectCode = record.subjectCode;
    subjectName = record.subjectName;
  }

  const projection = simulateScenario(
    baseAttended,
    baseConducted,
    additionalAttended,
    additionalMissed,
    threshold
  );

  res.status(200).json({
    status: 'ok',
    subjectCode,
    subjectName,
    current: {
      attended: baseAttended,
      conducted: baseConducted,
      percentage: baseConducted > 0 ? Number(((baseAttended / baseConducted) * 100).toFixed(2)) : 0,
    },
    projection,
    additionalAttended,
    additionalMissed,
    threshold,
  });
});
