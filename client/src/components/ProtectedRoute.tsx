import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ReactNode } from 'react';

interface ProtectedRouteProps {
  children: ReactNode;
  allowedRole?: 'student' | 'admin';
}

export function ProtectedRoute({ children, allowedRole }: ProtectedRouteProps) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="container" style={{ textAlign: 'center', padding: '6rem 1rem' }}>
        <p style={{ color: 'var(--ink-soft)', fontSize: '1.1rem' }}>Restoring secure session...</p>
      </div>
    );
  }

  if (!user) {
    // Redirect to login while saving the intended location
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (allowedRole && user.role !== allowedRole) {
    return (
      <div className="container" style={{ textAlign: 'center', padding: '5rem 1rem' }}>
        <span className="badge badge-red" style={{ marginBottom: '1rem' }}>
          Access Denied (403)
        </span>
        <h1 style={{ fontSize: '2rem', marginBottom: '1rem' }}>Unauthorized Role Access</h1>
        <p style={{ color: 'var(--ink-soft)', maxWidth: '480px', margin: '0 auto 1.5rem' }}>
          Your account has the role <strong>{user.role.toUpperCase()}</strong>, but this portal
          section requires <strong>{allowedRole.toUpperCase()}</strong> permissions.
        </p>
        <a
          href={user.role === 'admin' ? '/admin/dashboard' : '/student/dashboard'}
          className="btn btn-primary"
        >
          Return to My Dashboard
        </a>
      </div>
    );
  }

  return <>{children}</>;
}
