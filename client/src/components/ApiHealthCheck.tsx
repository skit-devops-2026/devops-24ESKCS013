import { useState, useEffect } from 'react';
import { fetchHealth, fetchDbHealth, HealthResponse, DbHealthResponse } from '../services/api';

export function ApiHealthCheck() {
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [dbHealth, setDbHealth] = useState<DbHealthResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  async function checkServices() {
    setLoading(true);
    setError(null);
    try {
      const [hData, dbData] = await Promise.all([fetchHealth(), fetchDbHealth()]);
      setHealth(hData);
      setDbHealth(dbData);
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Unable to connect to the backend API.');
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    checkServices();
  }, []);

  return (
    <div className="card" style={{ maxWidth: '640px', margin: '2rem auto' }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '1rem',
        }}
      >
        <h3 style={{ fontSize: '1.25rem', fontWeight: 600 }}>System Health & API Connection</h3>
        <button
          className="btn btn-secondary"
          onClick={checkServices}
          disabled={loading}
          style={{ fontSize: '0.8rem', padding: '0.4rem 0.8rem' }}
        >
          {loading ? 'Pinging...' : 'Refresh'}
        </button>
      </div>

      {loading && (
        <p style={{ color: 'var(--ink-soft)' }}>
          Connecting to backend service at{' '}
          <code>{import.meta.env.VITE_API_BASE_URL || '/api'}</code>...
        </p>
      )}

      {error && (
        <div
          style={{
            background: 'var(--red-soft)',
            color: 'var(--red)',
            padding: '1rem',
            borderRadius: '6px',
            fontSize: '0.9rem',
          }}
        >
          <strong>Connection Failed:</strong> {error}
          <div style={{ marginTop: '0.5rem', fontSize: '0.8rem', color: 'var(--ink-soft)' }}>
            Ensure the Express backend is running on port 5000: <code>npm run dev</code> inside{' '}
            <code>server/</code>.
          </div>
        </div>
      )}

      {!loading && !error && health && (
        <div
          style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', fontSize: '0.9rem' }}
        >
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              borderBottom: '1px solid var(--rule)',
              paddingBottom: '0.5rem',
            }}
          >
            <span style={{ color: 'var(--ink-soft)' }}>API Status:</span>
            <span className="badge badge-green">Connected ({health.status})</span>
          </div>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              borderBottom: '1px solid var(--rule)',
              paddingBottom: '0.5rem',
            }}
          >
            <span style={{ color: 'var(--ink-soft)' }}>Service:</span>
            <strong>{health.service}</strong>
          </div>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              borderBottom: '1px solid var(--rule)',
              paddingBottom: '0.5rem',
            }}
          >
            <span style={{ color: 'var(--ink-soft)' }}>Environment:</span>
            <code>{health.environment}</code>
          </div>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              borderBottom: '1px solid var(--rule)',
              paddingBottom: '0.5rem',
            }}
          >
            <span style={{ color: 'var(--ink-soft)' }}>Database Layer:</span>
            <span className="badge badge-green">
              {dbHealth?.database.driver.toUpperCase()} (Connected)
            </span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ color: 'var(--ink-soft)' }}>Uptime:</span>
            <span>{Math.floor(health.uptime)} seconds</span>
          </div>
        </div>
      )}
    </div>
  );
}
