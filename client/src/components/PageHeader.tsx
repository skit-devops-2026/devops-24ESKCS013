import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

interface PageHeaderProps {
  badge?: string;
  badgeType?: 'gold' | 'green' | 'blue' | 'red' | 'muted';
  title: string;
  description?: string;
  backTo?: string;
  backLabel?: string;
  actions?: React.ReactNode;
}

export function PageHeader({
  badge,
  badgeType = 'gold',
  title,
  description,
  backTo,
  backLabel = 'Back',
  actions,
}: PageHeaderProps) {
  return (
    <div style={{ marginBottom: '2rem' }}>
      {backTo && (
        <div style={{ marginBottom: '0.75rem' }}>
          <Link
            to={backTo}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.4rem',
              color: 'var(--text-muted)',
              fontSize: '0.85rem',
              fontWeight: 500,
              transition: 'color var(--transition-fast)',
            }}
          >
            <ArrowLeft size={15} />
            <span>{backLabel}</span>
          </Link>
        </div>
      )}

      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          flexWrap: 'wrap',
          gap: '1rem',
        }}
      >
        <div>
          {badge && (
            <span className={`badge badge-${badgeType}`} style={{ marginBottom: '0.4rem' }}>
              {badge}
            </span>
          )}
          <h1
            style={{
              fontSize: '2rem',
              fontWeight: 800,
              letterSpacing: '-0.025em',
              color: 'var(--text-primary)',
              lineHeight: 1.2,
              margin: '0.15rem 0 0.35rem',
            }}
          >
            {title}
          </h1>
          {description && (
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', margin: 0, maxWidth: '680px' }}>
              {description}
            </p>
          )}
        </div>

        {actions && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
            {actions}
          </div>
        )}
      </div>
    </div>
  );
}

