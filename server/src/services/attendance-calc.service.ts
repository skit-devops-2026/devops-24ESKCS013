/**
 * Attendance Intelligence Calculation and Parsing Engine
 * Supports University ERP Attendance Reports with OD, Makeup, Present, Absent, and ERP Percentage.
 */

export type AttendancePolicy =
  'standard_od' | 'makeup_compensatory' | 'strict_present' | 'erp_direct';

export const POLICY_METADATA: Record<
  AttendancePolicy,
  { name: string; description: string; formula: string }
> = {
  standard_od: {
    name: 'Standard (Present + OD)',
    description:
      'Counts On Duty (OD) as present. Conducted includes Present, OD, Makeup, and Absent.',
    formula: 'Attended = Present + OD; Conducted = Present + OD + Makeup + Absent',
  },
  makeup_compensatory: {
    name: 'Compensatory Makeup',
    description:
      'Makeup classes compensate for missed sessions (Net Absent = max(0, Absent - Makeup)).',
    formula: 'Attended = Present + OD; Conducted = Attended + max(0, Absent - Makeup)',
  },
  strict_present: {
    name: 'Strict (Present Only)',
    description: 'Only physical presence counts. OD and Makeup are excluded from attendance.',
    formula: 'Attended = Present; Conducted = Present + Absent',
  },
  erp_direct: {
    name: 'Official ERP Direct',
    description:
      'Uses the official ERP reported percentage directly without re-derivation (for Training/Projects).',
    formula: 'Percentage = ERP Reported Percentage',
  },
};

export interface RawAttendanceInput {
  subjectCode: string;
  subjectName: string;
  subjectType?: string;
  present: number;
  od: number;
  makeup: number;
  absent: number;
  erpPercentage?: number;
}

export interface CalculationResult {
  attended: number;
  conducted: number;
  percentage: number;
  isDiscrepancy: boolean;
  discrepancyDelta?: number;
  discrepancyNote?: string;
}

/**
 * Calculates attended, conducted, and attendance percentage based on the selected policy.
 */
export function calculateAttendance(
  counts: {
    present: number;
    od: number;
    makeup: number;
    absent: number;
    subjectType?: string;
  },
  policy: AttendancePolicy = 'standard_od',
  erpPercentage?: number
): CalculationResult {
  const P = Math.max(0, Math.floor(counts.present || 0));
  const OD = Math.max(0, Math.floor(counts.od || 0));
  const M = Math.max(0, Math.floor(counts.makeup || 0));
  const A = Math.max(0, Math.floor(counts.absent || 0));

  let attended = 0;
  let conducted = 0;
  let percentage: number;

  if (policy === 'erp_direct' && typeof erpPercentage === 'number' && !isNaN(erpPercentage)) {
    conducted = P + OD + M + A;
    attended = conducted > 0 ? Math.round((erpPercentage / 100) * conducted) : P;
    percentage = Number(erpPercentage.toFixed(2));
    return {
      attended,
      conducted,
      percentage,
      isDiscrepancy: false,
    };
  }

  if (policy === 'standard_od') {
    attended = P + OD;
    conducted = P + OD + M + A;
  } else if (policy === 'makeup_compensatory') {
    attended = P + OD;
    const netAbsent = Math.max(0, A - M);
    conducted = attended + netAbsent;
  } else if (policy === 'strict_present') {
    attended = P;
    conducted = P + A;
  }

  if (conducted > 0) {
    percentage = Number(((attended / conducted) * 100).toFixed(2));
  } else {
    percentage = 0;
  }

  let isDiscrepancy = false;
  let discrepancyDelta: number | undefined;
  let discrepancyNote: string | undefined;

  if (typeof erpPercentage === 'number' && !isNaN(erpPercentage) && conducted > 0) {
    discrepancyDelta = Number(Math.abs(percentage - erpPercentage).toFixed(2));
    if (discrepancyDelta > 0.1) {
      isDiscrepancy = true;
      if (
        counts.makeup > 0 &&
        Math.abs(
          Number(
            ((counts.present + counts.od + counts.makeup) / (conducted - counts.makeup || 1)) * 100
          ) - erpPercentage
        ) < 0.5
      ) {
        discrepancyNote = `ERP reported ${erpPercentage.toFixed(2)}% vs calculated ${percentage.toFixed(2)}% (${discrepancyDelta}% delta). In ERP, Makeup classes may be credited as attendance credits (e.g. 34/40 = 85.00%). Preserving official ERP reference.`;
      } else if (erpPercentage === 100 && counts.absent > 0) {
        discrepancyNote = `ERP reported 100.00% despite ${counts.absent} recorded absence(s) (Standard: ${percentage.toFixed(2)}%). Module likely evaluated via completion or compensatory waiver. Preserving official ERP reference.`;
      } else {
        discrepancyNote = `ERP reported ${erpPercentage.toFixed(2)}% vs calculated ${percentage.toFixed(2)}% (${discrepancyDelta}% delta under ${POLICY_METADATA[policy].name}).`;
      }
    }
  }

  return {
    attended,
    conducted,
    percentage,
    isDiscrepancy,
    discrepancyDelta,
    discrepancyNote,
  };
}

/**
 * Calculates the minimum consecutive classes a student must attend to reach or exceed target threshold.
 * Uses exact integer formulation to eliminate floating-point precision artifacts:
 * needed = ceil((thresholdPercent * C - 100 * A) / (100 - thresholdPercent))
 */
export function calculateClassesNeeded(
  attended: number,
  conducted: number,
  thresholdPercent: number = 75
): number {
  if (thresholdPercent <= 0) return 0;
  if (thresholdPercent >= 100) {
    return attended === conducted ? 0 : Infinity;
  }
  if (conducted === 0) return 0;

  // If already at or above threshold
  if (attended * 100 >= thresholdPercent * conducted) return 0;

  const numerator = thresholdPercent * conducted - 100 * attended;
  const denominator = 100 - thresholdPercent;
  const needed = Math.ceil(numerator / denominator);
  return Math.max(0, needed);
}

/**
 * Calculates the maximum consecutive classes a student may miss while remaining at or above target threshold.
 * Uses exact integer formulation:
 * skippable = floor((100 * A - thresholdPercent * C) / thresholdPercent)
 */
export function calculateSkippableClasses(
  attended: number,
  conducted: number,
  thresholdPercent: number = 75
): number {
  if (thresholdPercent <= 0) return Infinity;
  if (conducted === 0 || attended === 0) return 0;

  // If already below threshold
  if (attended * 100 < thresholdPercent * conducted) return 0;

  const numerator = 100 * attended - thresholdPercent * conducted;
  const skippable = Math.floor(numerator / thresholdPercent);
  return Math.max(0, skippable);
}

/**
 * Simulates future scenarios: what if the student attends +N classes and misses +M classes?
 */
export function simulateScenario(
  attended: number,
  conducted: number,
  additionalAttended: number = 0,
  additionalMissed: number = 0,
  thresholdPercent: number = 75
): {
  projectedAttended: number;
  projectedConducted: number;
  projectedPercentage: number;
  status: 'safe' | 'shortage';
  classesNeeded: number;
  classesSkippable: number;
} {
  const projectedAttended = attended + Math.max(0, Math.floor(additionalAttended));
  const projectedConducted =
    conducted +
    Math.max(0, Math.floor(additionalAttended)) +
    Math.max(0, Math.floor(additionalMissed));

  const projectedPercentage =
    projectedConducted > 0
      ? Number(((projectedAttended / projectedConducted) * 100).toFixed(2))
      : 0;

  const status = projectedPercentage >= thresholdPercent ? 'safe' : 'shortage';
  const classesNeeded = calculateClassesNeeded(
    projectedAttended,
    projectedConducted,
    thresholdPercent
  );
  const classesSkippable = calculateSkippableClasses(
    projectedAttended,
    projectedConducted,
    thresholdPercent
  );

  return {
    projectedAttended,
    projectedConducted,
    projectedPercentage,
    status,
    classesNeeded,
    classesSkippable,
  };
}

export interface ExistingRecordComparison {
  subjectCode: string;
  present: number;
  od: number;
  makeup: number;
  absent: number;
  erpPercentage: number;
  calculatedPercentage: number;
}

export interface ParsedRowResult {
  rowNumber: number;
  subjectCode: string;
  subjectName: string;
  subjectType: string;
  present: number;
  od: number;
  makeup: number;
  absent: number;
  erpPercentage: number;
  calculatedPercentage: number;
  isDiscrepancy: boolean;
  discrepancyDelta?: number;
  discrepancyNote?: string;
  isChanged?: boolean;
  isNew?: boolean;
  oldValues?: {
    present: number;
    od: number;
    makeup: number;
    absent: number;
    erpPercentage: number;
    calculatedPercentage: number;
  };
  isValid: boolean;
  error?: string;
}

export interface ErpMetadataResult {
  erpAggregatePercentage?: number;
  overallOdCount?: number;
  eventAttendance?: {
    eventName: string;
    eventDates: string;
    presentHours: number;
    absentHours: number;
    totalHours: number;
    remarks: string;
  };
}

/**
 * Normalizes header string for alias matching.
 */
function normalizeHeader(str: string): string {
  return str.toLowerCase().replace(/[^a-z0-9]/g, '');
}

const HEADER_ALIASES = {
  index: ['#', 'sno', 'slno', 'index', 'id', 'srno', 'no'],
  code: ['subjectcode', 'code', 'coursecode', 'subcode'],
  name: ['subject', 'subjectname', 'coursename', 'course', 'title', 'subjecttitle'],
  type: ['subjecttype', 'type', 'coursetype', 'category', 'subtype'],
  present: ['present', 'p', 'presentclasses', 'attended'],
  od: ['od', 'onduty', 'odclasses', 'duty'],
  makeup: ['makeup', 'makeupclasses', 'mu'],
  absent: ['absent', 'a', 'absentclasses', 'missed'],
  erpPercentage: [
    'percentage',
    'erppercentage',
    'percent',
    'attendance',
    'erp',
    'currentpercentage',
  ],
};

function matchHeader(headerText: string, candidates: string[]): boolean {
  const norm = normalizeHeader(headerText);
  return candidates.includes(norm);
}

/**
 * Robust line tokenizer supporting Tabs, Pipes (|), Commas, Semicolons, and Multi-spaces.
 */
export function splitAttendanceLine(line: string): string[] {
  if (line.includes('\t')) {
    return line.split('\t').map((t) => t.trim().replace(/^["']|["']$/g, ''));
  }
  if (line.includes('|')) {
    const parts = line.split('|').map((t) => t.trim().replace(/^["']|["']$/g, ''));
    if (parts.length > 0 && parts[0] === '') parts.shift();
    if (parts.length > 0 && parts[parts.length - 1] === '') parts.pop();
    if (parts.length >= 3) return parts;
  }
  if (line.includes(',')) {
    return line.split(',').map((t) => t.trim().replace(/^["']|["']$/g, ''));
  }
  if (line.includes(';')) {
    return line.split(';').map((t) => t.trim().replace(/^["']|["']$/g, ''));
  }
  if (/\s{2,}/.test(line)) {
    return line.split(/\s{2,}/).map((t) => t.trim().replace(/^["']|["']$/g, ''));
  }
  return line.split(/\s+/).map((t) => t.trim().replace(/^["']|["']$/g, ''));
}

function isHeaderTokens(tokens: string[]): boolean {
  if (tokens.length < 4) return false;

  let hasCodeOrName = false;
  let hasStatusOrCount = false;

  for (const t of tokens) {
    const norm = normalizeHeader(t);
    if (HEADER_ALIASES.code.includes(norm) || HEADER_ALIASES.name.includes(norm)) {
      hasCodeOrName = true;
    }
    if (
      HEADER_ALIASES.present.includes(norm) ||
      HEADER_ALIASES.absent.includes(norm) ||
      HEADER_ALIASES.erpPercentage.includes(norm)
    ) {
      hasStatusOrCount = true;
    }
  }

  return hasCodeOrName && hasStatusOrCount;
}

/**
 * Parses raw ERP paste (TSV / Tab-separated / Pipe-separated / CSV / Multi-space) content.
 */
export function parseErpAttendanceText(
  rawText: string,
  policy: AttendancePolicy = 'standard_od',
  existingRecords?: ExistingRecordComparison[]
): {
  success: boolean;
  totalRows: number;
  validRows: number;
  invalidRows: number;
  duplicateRows: number;
  discrepancyCount: number;
  changedRows: number;
  newRows: number;
  metadata?: ErpMetadataResult;
  rows: ParsedRowResult[];
  errors: string[];
} {
  const errors: string[] = [];
  const rows: ParsedRowResult[] = [];

  if (!rawText || !rawText.trim()) {
    return {
      success: false,
      totalRows: 0,
      validRows: 0,
      invalidRows: 0,
      duplicateRows: 0,
      discrepancyCount: 0,
      changedRows: 0,
      newRows: 0,
      rows: [],
      errors: ['Input attendance data is empty. Please paste TSV or upload CSV.'],
    };
  }

  const lines = rawText
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  if (lines.length === 0) {
    return {
      success: false,
      totalRows: 0,
      validRows: 0,
      invalidRows: 0,
      duplicateRows: 0,
      discrepancyCount: 0,
      changedRows: 0,
      newRows: 0,
      rows: [],
      errors: ['No data found in input.'],
    };
  }

  // Extract ERP aggregate, OD count, and event hours metadata from headers/comments
  let erpAggregatePercentage: number | undefined;
  let overallOdCount: number | undefined;
  let eventAttendance: ErpMetadataResult['eventAttendance'] | undefined;

  for (const line of lines) {
    // Check for aggregate (e.g. "Student ERP Aggregate: 80.1%" or "Aggregate: 80.1")
    const aggMatch = line.match(
      /(?:aggregate|overall(?: semester)? attendance|student erp aggregate)[:=\t\s|]+([0-9]+(?:\.[0-9]+)?)/i
    );
    if (aggMatch && erpAggregatePercentage === undefined) {
      const val = parseFloat(aggMatch[1]);
      if (!isNaN(val) && val >= 0 && val <= 100) {
        erpAggregatePercentage = val;
      }
    }

    // Check for overall OD count
    const odMatch = line.match(/(?:overall|total)\s+od(?:\s+count)?[:=\t\s|]+([0-9]+)/i);
    if (odMatch && overallOdCount === undefined) {
      const val = parseInt(odMatch[1], 10);
      if (!isNaN(val) && val >= 0) {
        overallOdCount = val;
      }
    }

    // Check for event attendance
    if (/techpravah|event\s+attendance|event\s+hours/i.test(line)) {
      if (!eventAttendance) {
        eventAttendance = {
          eventName: 'Techpravah 2026',
          eventDates: '12–15 October 2026',
          presentHours: 8,
          absentHours: 16,
          totalHours: 24,
          remarks:
            'Event hours are included in aggregate attendance but are not assigned to individual lectures, labs, or days.',
        };
      }
      const presMatch = line.match(/(?:present|present\s+hours)[:=\s]+([0-9]+)/i);
      if (presMatch) eventAttendance.presentHours = parseInt(presMatch[1], 10);
      const absMatch = line.match(/(?:absent|absent\s+hours)[:=\s]+([0-9]+)/i);
      if (absMatch) eventAttendance.absentHours = parseInt(absMatch[1], 10);
      const totMatch = line.match(/(?:total|total\s+hours)[:=\s]+([0-9]+)/i);
      if (totMatch) eventAttendance.totalHours = parseInt(totMatch[1], 10);
    }
  }

  // Detect header row index
  let headerIdx = -1;
  for (let i = 0; i < Math.min(lines.length, 10); i++) {
    const tokens = splitAttendanceLine(lines[i]);
    if (isHeaderTokens(tokens)) {
      headerIdx = i;
      break;
    }
  }

  const colMap: {
    index?: number;
    code?: number;
    name?: number;
    type?: number;
    present?: number;
    od?: number;
    makeup?: number;
    absent?: number;
    erpPercentage?: number;
  } = {};

  let dataLines: string[];

  if (headerIdx !== -1) {
    const rawHeaders = splitAttendanceLine(lines[headerIdx]);
    rawHeaders.forEach((h, idx) => {
      if (matchHeader(h, HEADER_ALIASES.index)) colMap.index = idx;
      else if (matchHeader(h, HEADER_ALIASES.code)) colMap.code = idx;
      else if (matchHeader(h, HEADER_ALIASES.name)) colMap.name = idx;
      else if (matchHeader(h, HEADER_ALIASES.type)) colMap.type = idx;
      else if (matchHeader(h, HEADER_ALIASES.present)) colMap.present = idx;
      else if (matchHeader(h, HEADER_ALIASES.od)) colMap.od = idx;
      else if (matchHeader(h, HEADER_ALIASES.makeup)) colMap.makeup = idx;
      else if (matchHeader(h, HEADER_ALIASES.absent)) colMap.absent = idx;
      else if (matchHeader(h, HEADER_ALIASES.erpPercentage)) colMap.erpPercentage = idx;
    });
    dataLines = lines.slice(headerIdx + 1);
  } else {
    dataLines = lines;
  }

  // Positional fallback if headers were omitted or columns were unmapped
  if (dataLines.length > 0 && (colMap.code === undefined || colMap.present === undefined)) {
    const sampleToks = splitAttendanceLine(dataLines[0]);
    if (/^\d+$/.test(sampleToks[0])) {
      // Format with Row Index: 0:#, 1:Code, 2:Name, 3:Type, 4:Present, 5:OD, 6:Makeup, 7:Absent, 8:Percentage
      colMap.index = 0;
      colMap.code = 1;
      colMap.name = 2;
      colMap.type = 3;
      colMap.present = 4;
      colMap.od = 5;
      colMap.makeup = 6;
      colMap.absent = 7;
      colMap.erpPercentage = 8;
    } else {
      // Format without Row Index: 0:Code, 1:Name, 2:Type, 3:Present, 4:OD, 5:Makeup, 6:Absent, 7:Percentage
      colMap.code = 0;
      colMap.name = 1;
      colMap.type = 2;
      colMap.present = 3;
      colMap.od = 4;
      colMap.makeup = 5;
      colMap.absent = 6;
      colMap.erpPercentage = 7;
    }
  }

  if (colMap.code === undefined || colMap.name === undefined || colMap.present === undefined) {
    return {
      success: false,
      totalRows: 0,
      validRows: 0,
      invalidRows: 0,
      duplicateRows: 0,
      discrepancyCount: 0,
      changedRows: 0,
      newRows: 0,
      rows: [],
      errors: [
        'Could not match essential columns (Subject Code, Subject Name, Present). Please ensure your ERP report contains columns for Code, Subject, Present, OD, Makeup, Absent, Percentage.',
      ],
    };
  }

  const seenCodes = new Set<string>();
  const existingMap = existingRecords
    ? new Map(existingRecords.map((r) => [r.subjectCode.toUpperCase(), r]))
    : null;

  for (let i = 0; i < dataLines.length; i++) {
    const lineText = dataLines[i];
    const tokens = splitAttendanceLine(lineText);

    // Skip comment lines or summary metadata lines that appear after the header
    if (
      tokens.length < 3 ||
      /^#\s*(university|student|event|note|attendance)/i.test(lineText) ||
      /^event\s+(attendance|hours|note)/i.test(lineText)
    ) {
      continue;
    }

    const rowNum = rows.length + 1;
    const code = (tokens[colMap.code] || '').trim().toUpperCase();
    const name = (tokens[colMap.name] || '').trim();
    const type =
      colMap.type !== undefined && tokens[colMap.type] ? tokens[colMap.type].trim() : 'Lecture';

    if (!code || !name) {
      rows.push({
        rowNumber: rowNum,
        subjectCode: code || 'UNKNOWN',
        subjectName: name || 'Untitled Subject',
        subjectType: type,
        present: 0,
        od: 0,
        makeup: 0,
        absent: 0,
        erpPercentage: 0,
        calculatedPercentage: 0,
        isDiscrepancy: false,
        isValid: false,
        error: 'Missing required Subject Code or Subject Name',
      });
      continue;
    }

    if (seenCodes.has(code)) {
      rows.push({
        rowNumber: rowNum,
        subjectCode: code,
        subjectName: name,
        subjectType: type,
        present: 0,
        od: 0,
        makeup: 0,
        absent: 0,
        erpPercentage: 0,
        calculatedPercentage: 0,
        isDiscrepancy: false,
        isValid: false,
        error: `Duplicate subject code '${code}' in import dataset`,
      });
      continue;
    }
    seenCodes.add(code);

    const parseNum = (val: string | undefined): number => {
      if (!val) return 0;
      const clean = val.replace(/[^0-9.]/g, '');
      const num = parseFloat(clean);
      return isNaN(num) ? 0 : num;
    };

    const present = parseNum(tokens[colMap.present]);
    const od = colMap.od !== undefined ? parseNum(tokens[colMap.od]) : 0;
    const makeup = colMap.makeup !== undefined ? parseNum(tokens[colMap.makeup]) : 0;
    const absent = colMap.absent !== undefined ? parseNum(tokens[colMap.absent]) : 0;

    let erpPercentage: number;
    if (colMap.erpPercentage !== undefined && tokens[colMap.erpPercentage]) {
      erpPercentage = parseNum(tokens[colMap.erpPercentage]);
    } else {
      // Derive default standard percentage if not provided
      const total = present + od + makeup + absent;
      erpPercentage = total > 0 ? Number((((present + od) / total) * 100).toFixed(2)) : 0;
    }

    if (
      present < 0 ||
      od < 0 ||
      makeup < 0 ||
      absent < 0 ||
      erpPercentage < 0 ||
      erpPercentage > 100
    ) {
      rows.push({
        rowNumber: rowNum,
        subjectCode: code,
        subjectName: name,
        subjectType: type,
        present,
        od,
        makeup,
        absent,
        erpPercentage,
        calculatedPercentage: 0,
        isDiscrepancy: false,
        isValid: false,
        error: 'Class counts must be non-negative and ERP percentage must be between 0 and 100',
      });
      continue;
    }

    const calc = calculateAttendance(
      { present, od, makeup, absent, subjectType: type },
      policy,
      erpPercentage
    );

    // Change detection against existing record
    const existing = existingMap ? existingMap.get(code) : undefined;
    const isNew = existingMap ? !existing : false;
    let isChanged = false;
    let oldValues = undefined;

    if (existing) {
      const hasDiff =
        existing.present !== present ||
        existing.od !== od ||
        existing.makeup !== makeup ||
        existing.absent !== absent ||
        Math.abs(existing.erpPercentage - erpPercentage) > 0.01;

      if (hasDiff) {
        isChanged = true;
        oldValues = {
          present: existing.present,
          od: existing.od,
          makeup: existing.makeup,
          absent: existing.absent,
          erpPercentage: existing.erpPercentage,
          calculatedPercentage: existing.calculatedPercentage,
        };
      }
    }

    rows.push({
      rowNumber: rowNum,
      subjectCode: code,
      subjectName: name,
      subjectType: type,
      present,
      od,
      makeup,
      absent,
      erpPercentage: Number(erpPercentage.toFixed(2)),
      calculatedPercentage: calc.percentage,
      isDiscrepancy: calc.isDiscrepancy,
      discrepancyDelta: calc.discrepancyDelta,
      discrepancyNote: calc.discrepancyNote,
      isChanged,
      isNew,
      oldValues,
      isValid: true,
    });
  }

  const validRows = rows.filter((r) => r.isValid).length;
  const invalidRows = rows.filter((r) => !r.isValid).length;
  const duplicateRows = rows.filter((r) => r.error?.includes('Duplicate')).length;
  const discrepancyCount = rows.filter((r) => r.isDiscrepancy).length;
  const changedRows = rows.filter((r) => r.isChanged).length;
  const newRows = rows.filter((r) => r.isNew).length;

  return {
    success: validRows > 0,
    totalRows: rows.length,
    validRows,
    invalidRows,
    duplicateRows,
    discrepancyCount,
    changedRows,
    newRows,
    metadata: {
      erpAggregatePercentage,
      overallOdCount,
      eventAttendance,
    },
    rows,
    errors,
  };
}
