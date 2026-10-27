import { Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { RootLayout } from './layouts/RootLayout';
import { LandingPage } from './pages/LandingPage';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { StudentDashboardPreview } from './pages/StudentDashboardPreview';
import { NotFoundPage } from './pages/NotFoundPage';
import { ProtectedRoute } from './components/ProtectedRoute';
import { ApiHealthCheck } from './components/ApiHealthCheck';
import { TasksPage } from './pages/student/TasksPage';
import { GoalsPage } from './pages/student/GoalsPage';
import { SubjectsPage } from './pages/student/SubjectsPage';
import { SubjectDetailPage } from './pages/student/SubjectDetailPage';
import { NotesPage } from './pages/student/NotesPage';
import { StudyTimerPage } from './pages/student/StudyTimerPage';
import { StudentAnnouncementsPage } from './pages/student/StudentAnnouncementsPage';
import { StudentResourcesPage } from './pages/student/StudentResourcesPage';
import { AttendanceIntelligencePage } from './pages/student/AttendanceIntelligencePage';
import { AdminDashboardPage } from './pages/admin/AdminDashboardPage';
import { AdminStudentsPage } from './pages/admin/AdminStudentsPage';
import { AdminStudentDetailPage } from './pages/admin/AdminStudentDetailPage';
import { AdminAnnouncementsPage } from './pages/admin/AdminAnnouncementsPage';
import { AdminResourcesPage } from './pages/admin/AdminResourcesPage';

export function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/" element={<RootLayout />}>
          <Route index element={<LandingPage />} />
          <Route path="login" element={<LoginPage />} />
          <Route path="register" element={<RegisterPage />} />
          <Route
            path="health"
            element={
              <div className="container" style={{ padding: '3rem 1rem' }}>
                <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
                  <h1 style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>System Diagnostics</h1>
                  <p style={{ color: 'var(--ink-soft)' }}>Real-time connectivity between React client, Express API, and MongoDB.</p>
                </div>
                <ApiHealthCheck />
              </div>
            }
          />

          {/* Protected Student Routes */}
          <Route
            path="student/dashboard"
            element={
              <ProtectedRoute allowedRole="student">
                <StudentDashboardPreview />
              </ProtectedRoute>
            }
          />
          <Route
            path="student/tasks"
            element={
              <ProtectedRoute allowedRole="student">
                <TasksPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="student/goals"
            element={
              <ProtectedRoute allowedRole="student">
                <GoalsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="student/subjects"
            element={
              <ProtectedRoute allowedRole="student">
                <SubjectsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="student/subjects/:id"
            element={
              <ProtectedRoute allowedRole="student">
                <SubjectDetailPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="student/notes"
            element={
              <ProtectedRoute allowedRole="student">
                <NotesPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="student/study"
            element={
              <ProtectedRoute allowedRole="student">
                <StudyTimerPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="student/announcements"
            element={
              <ProtectedRoute allowedRole="student">
                <StudentAnnouncementsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="student/resources"
            element={
              <ProtectedRoute allowedRole="student">
                <StudentResourcesPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="student/attendance"
            element={
              <ProtectedRoute allowedRole="student">
                <AttendanceIntelligencePage />
              </ProtectedRoute>
            }
          />

          {/* Protected Admin Routes */}
          <Route
            path="admin/dashboard"
            element={
              <ProtectedRoute allowedRole="admin">
                <AdminDashboardPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="admin/students"
            element={
              <ProtectedRoute allowedRole="admin">
                <AdminStudentsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="admin/students/:id"
            element={
              <ProtectedRoute allowedRole="admin">
                <AdminStudentDetailPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="admin/announcements"
            element={
              <ProtectedRoute allowedRole="admin">
                <AdminAnnouncementsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="admin/resources"
            element={
              <ProtectedRoute allowedRole="admin">
                <AdminResourcesPage />
              </ProtectedRoute>
            }
          />

          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Routes>
    </AuthProvider>
  );
}
