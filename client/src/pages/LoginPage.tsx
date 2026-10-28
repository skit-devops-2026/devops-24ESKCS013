import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Destination after successful login
  const from = (location.state as { from?: { pathname?: string } } | null)?.from?.pathname;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email || !password) {
      setErrorMsg('Please enter both email and password.');
      return;
    }

    setSubmitting(true);
    setErrorMsg(null);

    try {
      const loggedUser = await login({ email, password });
      if (from) {
        navigate(from, { replace: true });
      } else if (loggedUser.role === 'admin') {
        navigate('/admin/dashboard', { replace: true });
      } else {
        navigate('/student/dashboard', { replace: true });
      }
    } catch (err: unknown) {
      if (err instanceof Error) {
        setErrorMsg(err.message);
      } else {
        setErrorMsg('Sign in failed. Please check your credentials.');
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="container" style={{ maxWidth: '440px', padding: '3.5rem 1rem' }}>
      <div className="card" style={{ padding: '2.5rem' }}>
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <span className="badge badge-gold" style={{ marginBottom: '0.75rem' }}>
            Portal Authentication
          </span>
          <h1 style={{ fontSize: '1.75rem', color: 'var(--ink)' }}>Sign In to Student Hub</h1>
          <p style={{ color: 'var(--ink-soft)', fontSize: '0.9rem', marginTop: '0.25rem' }}>
            Enter your academic email and credentials
          </p>
        </div>

        {errorMsg && (
          <div
            style={{
              background: 'var(--red-soft)',
              color: 'var(--red)',
              padding: '0.75rem 1rem',
              borderRadius: '6px',
              fontSize: '0.875rem',
              marginBottom: '1.5rem',
              border: '1px solid var(--red-border)',
            }}
          >
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '1.25rem' }}>
            <label
              htmlFor="email"
              style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.35rem' }}
            >
              Email Address
            </label>
            <input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@university.edu"
              style={{
                width: '100%',
                padding: '0.625rem 0.875rem',
                borderRadius: '6px',
                border: '1px solid var(--rule-strong)',
                fontSize: '0.95rem',
                fontFamily: 'inherit',
              }}
            />
          </div>

          <div style={{ marginBottom: '1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.35rem' }}>
              <label
                htmlFor="password"
                style={{ fontSize: '0.875rem', fontWeight: 600 }}
              >
                Password
              </label>
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{ fontSize: '0.8rem', color: 'var(--ink-soft)' }}
              >
                {showPassword ? 'Hide' : 'Show'}
              </button>
            </div>
            <input
              id="password"
              type={showPassword ? 'text' : 'password'}
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              style={{
                width: '100%',
                padding: '0.625rem 0.875rem',
                borderRadius: '6px',
                border: '1px solid var(--rule-strong)',
                fontSize: '0.95rem',
                fontFamily: 'inherit',
              }}
            />
          </div>

          <button
            type="submit"
            className="btn btn-primary"
            disabled={submitting}
            style={{ width: '100%', padding: '0.75rem', fontSize: '0.95rem' }}
          >
            {submitting ? 'Authenticating...' : 'Sign In'}
          </button>
        </form>

        <div style={{ marginTop: '1.5rem', textAlign: 'center', fontSize: '0.875rem', color: 'var(--ink-soft)' }}>
          Don't have an account?{' '}
          <Link to="/register" style={{ color: 'var(--gold-ink)', fontWeight: 600 }}>
            Register as Student
          </Link>
        </div>
      </div>
    </div>
  );
}
