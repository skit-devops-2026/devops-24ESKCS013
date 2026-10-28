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

/* -------------------------------------------------------------
 * SUBJECTS
 * ------------------------------------------------------------- */
export interface SubjectItem {
  _id: string;
  code: string;
  name: string;
  credits: number;
  semester: number;
  facultyName: string;
  attendancePercentage: number;
  color: string;
  createdAt: string;
  updatedAt: string;
}

export async function getSubjects(): Promise<SubjectItem[]> {
  const res = await requestJson<{ data: SubjectItem[] }>(getApiUrl('/subjects'));
  return res.data;
}

export async function getSubject(id: string): Promise<SubjectItem & { tasks: TaskItem[]; notes: NoteItem[] }> {
  const res = await requestJson<{ data: SubjectItem & { tasks: TaskItem[]; notes: NoteItem[] } }>(
    getApiUrl(`/subjects/${id}`)
  );
  return res.data;
}

export async function createSubject(data: Partial<SubjectItem>): Promise<SubjectItem> {
  const res = await requestJson<{ data: SubjectItem }>(getApiUrl('/subjects'), {
    method: 'POST',
    body: JSON.stringify(data),
  });
  return res.data;
}

export async function deleteSubject(id: string): Promise<void> {
  await requestJson(getApiUrl(`/subjects/${id}`), { method: 'DELETE' });
}

/* -------------------------------------------------------------
 * TASKS
 * ------------------------------------------------------------- */
export interface TaskItem {
  _id: string;
  title: string;
  description: string;
  status: 'pending' | 'in_progress' | 'completed';
  priority: 'low' | 'medium' | 'high';
  dueDate: string;
  subjectId?: string | null;
  subjectCode?: string;
  createdAt: string;
  updatedAt: string;
}

export interface TaskSummary {
  total: number;
  pending: number;
  inProgress: number;
  completed: number;
  overdue: number;
}

export async function getTasks(filters?: { status?: string; priority?: string; subjectId?: string }): Promise<TaskItem[]> {
  const params = new URLSearchParams();
  if (filters?.status && filters.status !== 'all') params.append('status', filters.status);
  if (filters?.priority && filters.priority !== 'all') params.append('priority', filters.priority);
  if (filters?.subjectId) params.append('subjectId', filters.subjectId);

  const queryStr = params.toString() ? `?${params.toString()}` : '';
  const res = await requestJson<{ data: TaskItem[] }>(getApiUrl(`/tasks${queryStr}`));
  return res.data;
}

export async function getTaskSummary(): Promise<TaskSummary> {
  const res = await requestJson<{ data: TaskSummary }>(getApiUrl('/tasks/summary'));
  return res.data;
}

export async function createTask(data: Partial<TaskItem>): Promise<TaskItem> {
  const res = await requestJson<{ data: TaskItem }>(getApiUrl('/tasks'), {
    method: 'POST',
    body: JSON.stringify(data),
  });
  return res.data;
}

export async function updateTask(id: string, updates: Partial<TaskItem>): Promise<TaskItem> {
  const res = await requestJson<{ data: TaskItem }>(getApiUrl(`/tasks/${id}`), {
    method: 'PATCH',
    body: JSON.stringify(updates),
  });
  return res.data;
}

export async function deleteTask(id: string): Promise<void> {
  await requestJson(getApiUrl(`/tasks/${id}`), { method: 'DELETE' });
}

/* -------------------------------------------------------------
 * GOALS
 * ------------------------------------------------------------- */
export interface GoalItem {
  _id: string;
  title: string;
  description: string;
  targetDate: string;
  targetValue: number;
  currentValue: number;
  unit: string;
  category: string;
  subjectId?: string | null;
  subjectCode?: string;
  autoLinkMetric?: 'none' | 'attendance' | 'task_completion' | 'study_hours';
  status: 'active' | 'completed' | 'abandoned';
  createdAt: string;
  updatedAt: string;
}

export interface GoalSummary {
  total: number;
  active: number;
  completed: number;
  abandoned: number;
  averageProgress: number;
}

export async function getGoals(status?: string): Promise<GoalItem[]> {
  const queryStr = status && status !== 'all' ? `?status=${status}` : '';
  const res = await requestJson<{ data: GoalItem[] }>(getApiUrl(`/goals${queryStr}`));
  return res.data;
}

export async function getGoalSummary(): Promise<GoalSummary> {
  const res = await requestJson<{ data: GoalSummary }>(getApiUrl('/goals/summary'));
  return res.data;
}

export async function createGoal(data: Partial<GoalItem>): Promise<GoalItem> {
  const res = await requestJson<{ data: GoalItem }>(getApiUrl('/goals'), {
    method: 'POST',
    body: JSON.stringify(data),
  });
  return res.data;
}

export async function updateGoal(id: string, updates: Partial<GoalItem>): Promise<GoalItem> {
  const res = await requestJson<{ data: GoalItem }>(getApiUrl(`/goals/${id}`), {
    method: 'PATCH',
    body: JSON.stringify(updates),
  });
  return res.data;
}

export async function deleteGoal(id: string): Promise<void> {
  await requestJson(getApiUrl(`/goals/${id}`), { method: 'DELETE' });
}

/* -------------------------------------------------------------
 * NOTES
 * ------------------------------------------------------------- */
export interface NoteItem {
  _id: string;
  title: string;
  content: string;
  subjectId?: string | null;
  subjectCode?: string;
  tags: string[];
  isPinned: boolean;
  createdAt: string;
  updatedAt: string;
}

export async function getNotes(search?: string, tag?: string): Promise<NoteItem[]> {
  const params = new URLSearchParams();
  if (search) params.append('q', search);
  if (tag) params.append('tag', tag);
  const queryStr = params.toString() ? `?${params.toString()}` : '';
  const res = await requestJson<{ data: NoteItem[] }>(getApiUrl(`/notes${queryStr}`));
  return res.data;
}

export async function createNote(data: Partial<NoteItem>): Promise<NoteItem> {
  const res = await requestJson<{ data: NoteItem }>(getApiUrl('/notes'), {
    method: 'POST',
    body: JSON.stringify(data),
  });
  return res.data;
}

export async function updateNote(id: string, updates: Partial<NoteItem>): Promise<NoteItem> {
  const res = await requestJson<{ data: NoteItem }>(getApiUrl(`/notes/${id}`), {
    method: 'PATCH',
    body: JSON.stringify(updates),
  });
  return res.data;
}

export async function deleteNote(id: string): Promise<void> {
  await requestJson(getApiUrl(`/notes/${id}`), { method: 'DELETE' });
}

/* -------------------------------------------------------------
 * STUDY TIMER
 * ------------------------------------------------------------- */
export interface CurrentStudySessionResponse {
  status: string;
  active: boolean;
  session: {
    _id: string;
    title: string;
    status: 'active' | 'paused' | 'completed';
    startTime: string;
    subjectId?: string;
    subjectCode?: string;
    pausedSeconds: number;
    elapsedSeconds: number;
  } | null;
}

export interface StudyHistoryResponse {
  summary: {
    totalSessions: number;
    totalSeconds: number;
    totalMinutes: number;
    totalHoursFormatted: string;
  };
  count: number;
  data: Array<{
    _id: string;
    title: string;
    subjectCode?: string;
    durationSeconds: number;
    endTime: string;
    createdAt: string;
  }>;
}

export async function getCurrentStudySession(): Promise<CurrentStudySessionResponse> {
  return requestJson<CurrentStudySessionResponse>(getApiUrl('/study/current'));
}

export async function startStudySession(subjectId?: string, title?: string): Promise<CurrentStudySessionResponse> {
  return requestJson<CurrentStudySessionResponse>(getApiUrl('/study/start'), {
    method: 'POST',
    body: JSON.stringify({ subjectId, title }),
  });
}

export async function pauseStudySession(): Promise<CurrentStudySessionResponse> {
  return requestJson<CurrentStudySessionResponse>(getApiUrl('/study/pause'), { method: 'POST' });
}

export async function resumeStudySession(): Promise<CurrentStudySessionResponse> {
  return requestJson<CurrentStudySessionResponse>(getApiUrl('/study/resume'), { method: 'POST' });
}

export async function finishStudySession(): Promise<{ status: string; message: string }> {
  return requestJson(getApiUrl('/study/finish'), { method: 'POST' });
}

export async function cancelStudySession(): Promise<{ status: string; message: string }> {
  return requestJson(getApiUrl('/study/cancel'), { method: 'POST' });
}

export async function getStudyHistory(): Promise<StudyHistoryResponse> {
  return requestJson<StudyHistoryResponse>(getApiUrl('/study/history'));
}

/* -------------------------------------------------------------
 * STUDENT INSTITUTIONAL BULLETINS & RESOURCES
 * ------------------------------------------------------------- */
export interface StudentAnnouncement {
  _id: string;
  title: string;
  content: string;
  priority: 'normal' | 'urgent';
  targetAudience: 'all' | 'students' | 'faculty';
  status: 'published';
  authorId?: {
    name: string;
    email: string;
  };
  publishedAt?: string;
  createdAt: string;
}

export interface StudentResource {
  _id: string;
  title: string;
  description: string;
  resourceType: 'notes' | 'syllabus' | 'question_paper' | 'lab_manual' | 'reference';
  url: string;
  department?: string | null;
  semester?: number | null;
  subjectId?: {
    code: string;
    name: string;
  } | null;
  createdAt: string;
}

export async function getStudentAnnouncements(): Promise<StudentAnnouncement[]> {
  const res = await requestJson<{ data: StudentAnnouncement[] }>(getApiUrl('/announcements'));
  return res.data;
}

export async function getStudentResources(search?: string, type?: string): Promise<StudentResource[]> {
  const params = new URLSearchParams();
  if (search) params.append('search', search);
  if (type && type !== 'all') params.append('resourceType', type);
  const queryStr = params.toString() ? `?${params.toString()}` : '';
  const res = await requestJson<{ data: StudentResource[] }>(getApiUrl(`/resources${queryStr}`));
  return res.data;
}
