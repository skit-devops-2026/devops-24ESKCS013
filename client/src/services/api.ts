export interface StudentProfileData {
  rollNumber: string;
  department: string;
  semester: number;
  currentGpa: number;
  attendancePercentage: number;
}

export interface UserData {
  id: string;
  name: string;
  email: string;
  role: 'student' | 'admin';
  status?: 'active' | 'suspended';
  profile: StudentProfileData | null;
}

export interface AuthResponse {
  status: 'ok' | 'error';
  message?: string;
  user: UserData;
}

export interface HealthResponse {
  status: string;
  service: string;
  environment: string;
  uptime: number;
  timestamp: string;
}

export interface DbHealthResponse {
  status: string;
  database: {
    connected: boolean;
    state: string;
    driver: string;
    host?: string;
    name?: string;
  };
  timestamp: string;
}

const rawBase = (import.meta.env.VITE_API_BASE_URL || '/api').trim();
const API_BASE_URL = rawBase.endsWith('/') ? rawBase.slice(0, -1) : rawBase;

function getApiUrl(path: string): string {
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  if (API_BASE_URL === '/api' || API_BASE_URL.endsWith('/api')) {
    return `${API_BASE_URL}${cleanPath}`;
  }
  return `${API_BASE_URL}/api${cleanPath}`;
}

export async function fetchHealth(): Promise<HealthResponse> {
  const response = await fetch(getApiUrl('/health'), {
    headers: { Accept: 'application/json' },
    credentials: 'include',
  });

  if (!response.ok) {
    throw new Error(`Health check failed (${response.status})`);
  }

  return response.json();
}

export async function fetchDbHealth(): Promise<DbHealthResponse> {
  const response = await fetch(getApiUrl('/health/db'), {
    headers: { Accept: 'application/json' },
    credentials: 'include',
  });

  return response.json();
}

export async function apiRegister(payload: {
  name: string;
  email: string;
  password: string;
  rollNumber: string;
  department: string;
  semester?: number;
}): Promise<AuthResponse> {
  const response = await fetch(getApiUrl('/auth/register'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    credentials: 'include', // Ensures session cookie is saved
    body: JSON.stringify(payload),
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.message || 'Registration failed');
  }

  return data;
}

export async function apiLogin(credentials: {
  email: string;
  password: string;
}): Promise<AuthResponse> {
  const response = await fetch(getApiUrl('/auth/login'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    credentials: 'include', // Ensures session cookie is saved
    body: JSON.stringify(credentials),
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.message || 'Authentication failed');
  }

  return data;
}

export async function apiLogout(): Promise<void> {
  await fetch(getApiUrl('/auth/logout'), {
    method: 'POST',
    headers: { Accept: 'application/json' },
    credentials: 'include', // Clears session cookie
  });
}

export async function apiGetMe(): Promise<AuthResponse> {
  const response = await fetch(getApiUrl('/auth/me'), {
    headers: { Accept: 'application/json' },
    credentials: 'include', // Sends session cookie
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.message || 'Session invalid or unauthenticated');
  }

  return data;
}
