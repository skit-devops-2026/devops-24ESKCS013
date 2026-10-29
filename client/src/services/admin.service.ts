const API_BASE = '/api';

export interface AdminStats {
  students: {
    total: number;
    active: number;
    suspended: number;
  };
  resources: {
    total: number;
    published: number;
    drafts: number;
  };
  announcements: {
    total: number;
    published: number;
    drafts: number;
  };
  attendance: {
    thresholdPercentage: number;
    overallProfileDefaultersCount: number;
    lowAttendanceSubjectRecordsCount: number;
    uniqueSubjectDefaultersCount: number;
    uniqueAffectedStudentsCount: number;
  };
}

export interface StudentListItem {
  id: string;
  name: string;
  email: string;
  role: 'student' | 'admin';
  status: 'active' | 'suspended';
  createdAt: string;
  profile: {
    rollNumber: string;
    department: string;
    semester: number;
    currentGpa: number;
    attendancePercentage: number;
  } | null;
}

export interface StudentDetailData {
  student: {
    id: string;
    name: string;
    email: string;
    role: string;
    status: 'active' | 'suspended';
    createdAt: string;
    updatedAt: string;
  };
  profile: {
    rollNumber: string;
    department: string;
    semester: number;
    currentGpa: number;
    attendancePercentage: number;
  } | null;
  subjects: Array<{
    id: string;
    code: string;
    name: string;
    credits: number;
    facultyName: string;
    attendancePercentage: number;
    syllabusProgress: number;
  }>;
  taskStats: {
    total: number;
    pending: number;
    in_progress: number;
    completed: number;
  };
}

export interface AnnouncementItem {
  _id: string;
  title: string;
  content: string;
  priority: 'normal' | 'urgent';
  targetAudience: 'all' | 'students' | 'faculty';
  status: 'draft' | 'published';
  authorId?: {
    _id: string;
    name: string;
    email: string;
    role: string;
  };
  publishedAt?: string;
  expiresAt?: string | null;
  createdAt: string;
}

export interface ResourceItem {
  _id: string;
  title: string;
  description: string;
  resourceType: 'notes' | 'syllabus' | 'question_paper' | 'lab_manual' | 'reference';
  url: string;
  subjectId?: {
    _id: string;
    code: string;
    name: string;
  } | null;
  department?: string | null;
  semester?: number | null;
  status: 'draft' | 'published';
  uploadedBy?: {
    _id: string;
    name: string;
    email: string;
  };
  createdAt: string;
}

export interface PaginatedResult<T> {
  data: T[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

// 1. System Statistics
export async function getAdminStats(threshold = 75): Promise<AdminStats> {
  const res = await fetch(`${API_BASE}/admin/stats?threshold=${threshold}`, {
    credentials: 'include',
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Failed to fetch admin stats');
  return data.data;
}

// 2. Student Directory
export async function getAdminStudents(params: {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
  department?: string;
  semester?: number;
}): Promise<PaginatedResult<StudentListItem>> {
  const query = new URLSearchParams();
  if (params.page) query.set('page', String(params.page));
  if (params.limit) query.set('limit', String(params.limit));
  if (params.search) query.set('search', params.search);
  if (params.status) query.set('status', params.status);
  if (params.department) query.set('department', params.department);
  if (params.semester) query.set('semester', String(params.semester));

  const res = await fetch(`${API_BASE}/admin/students?${query.toString()}`, {
    credentials: 'include',
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Failed to fetch student directory');
  return data;
}

export async function getAdminStudentDetails(id: string): Promise<StudentDetailData> {
  const res = await fetch(`${API_BASE}/admin/students/${id}`, {
    credentials: 'include',
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Failed to fetch student details');
  return data.data;
}

export async function updateStudentStatus(
  id: string,
  status: 'active' | 'suspended'
): Promise<void> {
  const res = await fetch(`${API_BASE}/admin/students/${id}/status`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ status }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Failed to update student status');
}

// 3. Announcements
export async function getAnnouncements(params?: {
  status?: string;
  priority?: string;
  targetAudience?: string;
  page?: number;
  limit?: number;
}): Promise<PaginatedResult<AnnouncementItem>> {
  const query = new URLSearchParams();
  if (params?.status) query.set('status', params.status);
  if (params?.priority) query.set('priority', params.priority);
  if (params?.targetAudience) query.set('targetAudience', params.targetAudience);
  if (params?.page) query.set('page', String(params.page));
  if (params?.limit) query.set('limit', String(params.limit));

  const res = await fetch(`${API_BASE}/announcements?${query.toString()}`, {
    credentials: 'include',
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Failed to fetch announcements');
  return data;
}

export async function createAnnouncement(payload: {
  title: string;
  content: string;
  priority?: 'normal' | 'urgent';
  targetAudience?: 'all' | 'students' | 'faculty';
  status?: 'draft' | 'published';
  expiresAt?: string | null;
}): Promise<AnnouncementItem> {
  const res = await fetch(`${API_BASE}/announcements`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Failed to create announcement');
  return data.data;
}

export async function deleteAnnouncement(id: string): Promise<void> {
  const res = await fetch(`${API_BASE}/announcements/${id}`, {
    method: 'DELETE',
    credentials: 'include',
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Failed to delete announcement');
}

// 4. Resources
export async function getResources(params?: {
  resourceType?: string;
  subjectId?: string;
  search?: string;
  status?: string;
  department?: string;
  semester?: number;
  page?: number;
  limit?: number;
}): Promise<PaginatedResult<ResourceItem>> {
  const query = new URLSearchParams();
  if (params?.resourceType) query.set('resourceType', params.resourceType);
  if (params?.subjectId) query.set('subjectId', params.subjectId);
  if (params?.search) query.set('search', params.search);
  if (params?.status) query.set('status', params.status);
  if (params?.department) query.set('department', params.department);
  if (params?.semester) query.set('semester', String(params.semester));
  if (params?.page) query.set('page', String(params.page));
  if (params?.limit) query.set('limit', String(params.limit));

  const res = await fetch(`${API_BASE}/resources?${query.toString()}`, {
    credentials: 'include',
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Failed to fetch resources');
  return data;
}

export async function createResource(payload: {
  title: string;
  description: string;
  resourceType: string;
  url: string;
  subjectId?: string | null;
  department?: string | null;
  semester?: number | null;
  status?: 'draft' | 'published';
}): Promise<ResourceItem> {
  const res = await fetch(`${API_BASE}/resources`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Failed to publish resource');
  return data.data;
}

export async function deleteResource(id: string): Promise<void> {
  const res = await fetch(`${API_BASE}/resources/${id}`, {
    method: 'DELETE',
    credentials: 'include',
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Failed to delete resource');
}
