import { Link } from 'react-router-dom';

export function NotFoundPage() {
  return (
    <div className="container" style={{ textAlign: 'center', padding: '6rem 1rem' }}>
      <span className="badge badge-red" style={{ marginBottom: '1rem' }}>
        404 Error
      </span>
      <h1 style={{ fontSize: '2.5rem', marginBottom: '1rem', color: 'var(--ink)' }}>
        Page Not Found
      </h1>
      <p style={{ color: 'var(--ink-soft)', maxWidth: '480px', margin: '0 auto 2rem' }}>
        The route you are looking for does not exist in the Student Hub application or is currently
        being migrated in subsequent phases.
      </p>
      <Link to="/" className="btn btn-primary">
        Return to Home
      </Link>
    </div>
  );
}
