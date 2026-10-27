const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';

function getApiUrl(path: string): string {
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  if (API_BASE_URL.endsWith('/api')) {
    return `${API_BASE_URL}${cleanPath}`;
  }
  return `${API_BASE_URL}/api${cleanPath}`;
}

async function requestJson<T>(url: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      ...options.headers,
    },
    credentials: 'include',
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.message || `Request failed with status ${response.status}`);
  }
  return data;
}

export type AttendancePolicy =
  | 'standard_od'
  | 'makeup_compensatory'
  | 'strict_present'
  | 'erp_direct';

export interface PolicyMetadata {
  name: string;
  description: string;
  formula: string;
}

export const CLIENT_POLICY_METADATA: Record<AttendancePolicy, PolicyMetadata> = {
  standard_od: {
    name: 'Standard (Present + OD)',
    description: 'Counts On Duty (OD) as attended. Total conducted = Present + OD + Makeup + Absent.',
    formula: 'Attended = Present + OD; Conducted = Present + OD + Makeup + Absent',
  },
  makeup_compensatory: {
    name: 'Compensatory Makeup',
    description: 'Makeup classes offset missed sessions (Net Absent = max(0, Absent - Makeup)).',
    formula: 'Attended = Present + OD; Conducted = Attended + max(0, Absent - Makeup)',
  },
  strict_present: {
    name: 'Strict (Present Only)',
    description: 'Only physical presence counts. OD and Makeup classes are excluded.',
    formula: 'Attended = Present; Conducted = Present + Absent',
  },
  erp_direct: {
    name: 'Official ERP Direct',
    description: 'Uses the official ERP reported percentage directly without re-derivation (for Training/Projects).',
    formula: 'Percentage = ERP Reported Percentage',
  },
};

export interface EventAttendance {
  eventName: string;
  eventDates: string;
  presentHours: number;
  absentHours: number;
  totalHours: number;
  remarks: string;
}

export interface AttendanceRecordItem {
  _id: string;
  userId: string;
  subjectCode: string;
  subjectName: string;
  subjectType: string;
  subjectId?: string | null;
  present: number;
  od: number;
  makeup: number;
  absent: number;
  totalConducted: number;
  totalAttended: number;
  erpPercentage: number;
  calculatedPercentage: number;
  policyUsed: AttendancePolicy;
  threshold: number;
  lastImportedAt: string;
  isShortage: boolean;
  classesNeeded: number;
  classesSkippable: number;
  isDiscrepancy: boolean;
  discrepancyDelta?: number;
  discrepancyNote?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AttendanceSummary {
  totalSubjects: number;
  totalAttended: number;
  totalConducted: number;
  overallPercentage: number;
  erpAggregatePercentage?: number;
  overallOdCount?: number;
  eventAttendance?: EventAttendance;
  erpAggregateExplanation?: string;
  shortageCount: number;
  safeCount: number;
  hasShortage: boolean;
  activePolicy: AttendancePolicy;
  policyMeta: PolicyMetadata;
  lastImportedAt: string | null;
}

export interface AttendanceResponse {
  status: string;
  summary: AttendanceSummary;
  shortages: AttendanceRecordItem[];
  records: AttendanceRecordItem[];
}

export interface ParsedRowPreview {
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
  matchedSubjectId?: string | null;
  matchedSubjectName?: string | null;
  isValid: boolean;
  error?: string;
}

export interface ParsePreviewResponse {
  status: string;
  policy: AttendancePolicy;
  policyMeta: PolicyMetadata;
  totalRows: number;
  validRows: number;
  invalidRows: number;
  duplicateRows: number;
  discrepancyCount: number;
  changedRows?: number;
  newRows?: number;
  metadata?: {
    erpAggregatePercentage?: number;
    overallOdCount?: number;
    eventAttendance?: EventAttendance;
  };
  rows: ParsedRowPreview[];
  errors: string[];
}

export interface SimulationResult {
  status: string;
  subjectCode: string;
  subjectName: string;
  current: {
    attended: number;
    conducted: number;
    percentage: number;
  };
  projection: {
    projectedAttended: number;
    projectedConducted: number;
    projectedPercentage: number;
    status: 'safe' | 'shortage';
    classesNeeded: number;
    classesSkippable: number;
  };
  additionalAttended: number;
  additionalMissed: number;
  threshold: number;
}

export async function getAttendance(): Promise<AttendanceResponse> {
  return requestJson<AttendanceResponse>(getApiUrl('/attendance'));
}

export async function parseAttendancePreview(
  rawData: string,
  policy: AttendancePolicy = 'standard_od'
): Promise<ParsePreviewResponse> {
  return requestJson<ParsePreviewResponse>(getApiUrl('/attendance/parse-preview'), {
    method: 'POST',
    body: JSON.stringify({ rawData, policy }),
  });
}

export async function importAttendance(
  records: Array<{
    subjectCode: string;
    subjectName: string;
    subjectType?: string;
    present: number;
    od: number;
    makeup: number;
    absent: number;
    erpPercentage?: number;
    threshold?: number;
    discrepancyNote?: string | null;
  }>,
  policy: AttendancePolicy = 'standard_od',
  metadata?: {
    erpAggregatePercentage?: number;
    overallOdCount?: number;
    eventAttendance?: EventAttendance;
  }
): Promise<{ status: string; count: number; data: AttendanceRecordItem[] }> {
  return requestJson(getApiUrl('/attendance/import'), {
    method: 'POST',
    body: JSON.stringify({
      policy,
      records,
      ...(metadata?.erpAggregatePercentage !== undefined && {
        erpAggregatePercentage: metadata.erpAggregatePercentage,
      }),
      ...(metadata?.overallOdCount !== undefined && {
        overallOdCount: metadata.overallOdCount,
      }),
      ...(metadata?.eventAttendance && {
        eventAttendance: metadata.eventAttendance,
      }),
    }),
  });
}

export async function updateAttendanceRecord(
  id: string,
  updates: Partial<AttendanceRecordItem>
): Promise<{ status: string; data: AttendanceRecordItem }> {
  return requestJson(getApiUrl(`/attendance/${id}`), {
    method: 'PATCH',
    body: JSON.stringify(updates),
  });
}

export async function deleteAttendanceRecord(id: string): Promise<void> {
  await requestJson(getApiUrl(`/attendance/${id}`), {
    method: 'DELETE',
  });
}

export async function simulateAttendance(params: {
  recordId?: string;
  attended?: number;
  conducted?: number;
  additionalAttended?: number;
  additionalMissed?: number;
  threshold?: number;
}): Promise<SimulationResult> {
  return requestJson<SimulationResult>(getApiUrl('/attendance/simulate'), {
    method: 'POST',
    body: JSON.stringify(params),
  });
}
