import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, ExternalLink, Search } from 'lucide-react';
import { getStudentResources, StudentResource } from '../../services/student.service';

export function StudentResourcesPage() {
  const [resources, setResources] = useState<StudentResource[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      setError(null);
      try {
        const data = await getStudentResources(search, typeFilter);
        setResources(data);
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Failed to load resources');
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [search, typeFilter]);

  return (
    <div className="container" style={{ padding: '2.5rem 1rem' }}>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '2rem',
          flexWrap: 'wrap',
          gap: '1rem',
        }}
      >
        <div>
          <span className="badge badge-gold" style={{ marginBottom: '0.5rem' }}>
            Curriculum Materials
          </span>
          <h1 style={{ fontSize: '2.25rem', color: 'var(--ink)' }}>Academic Resource Library</h1>
          <p style={{ color: 'var(--ink-soft)' }}>
            Access verified university syllabi, laboratory manuals, and previous year question
            papers.
          </p>
        </div>
        <Link to="/student/dashboard" className="btn btn-secondary">
          ← Back to Dashboard
        </Link>
      </div>

      {error && (
        <div
          style={{
            background: 'var(--red-light)',
            color: 'var(--red)',
            padding: '1rem',
            borderRadius: '6px',
            marginBottom: '1.5rem',
            border: '1px solid var(--red)',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
          }}
        >
          <AlertTriangle size={16} />
          <span>{error}</span>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="card" style={{ marginBottom: '1.5rem', padding: '1.25rem' }}>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
            gap: '1rem',
          }}
        >
          <div>
            <label
              style={{
                display: 'block',
                fontSize: '0.85rem',
                fontWeight: 600,
                marginBottom: '0.35rem',
              }}
            >
              Search Title or Description
            </label>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="e.g. Networks, Algorithms, DBMS"
              style={{
                width: '100%',
                padding: '0.5rem 0.75rem',
                borderRadius: '4px',
                border: '1px solid var(--rule-strong)',
              }}
            />
          </div>

          <div>
            <label
              style={{
                display: 'block',
                fontSize: '0.85rem',
                fontWeight: 600,
                marginBottom: '0.35rem',
              }}
            >
              Resource Type
            </label>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              style={{
                width: '100%',
                padding: '0.5rem',
                borderRadius: '4px',
                border: '1px solid var(--rule-strong)',
              }}
            >
              <option value="all">All Categories</option>
              <option value="syllabus">Syllabus</option>
              <option value="lab_manual">Lab Manual</option>
              <option value="question_paper">Question Paper</option>
              <option value="notes">Lecture Notes</option>
              <option value="reference">Reference Material</option>
            </select>
          </div>
        </div>
      </div>

      {/* Resources Table / Grid */}
      {loading ? (
        <div
          className="card"
          style={{ padding: '3rem', textAlign: 'center', color: 'var(--ink-soft)' }}
        >
          Loading resources...
        </div>
      ) : resources.length === 0 ? (
        <div className="card" style={{ padding: '3.5rem 2rem', textAlign: 'center' }}>
          <div
            style={{
              width: '56px',
              height: '56px',
              borderRadius: '50%',
              background: 'var(--gold-soft)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 1.25rem',
              color: 'var(--brand-gold)',
            }}
          >
            <Search size={26} />
          </div>
          <h3 style={{ fontSize: '1.25rem', marginBottom: '0.5rem', color: 'var(--ink)' }}>
            No matching materials found
          </h3>
          <p style={{ color: 'var(--ink-soft)', maxWidth: '420px', margin: '0 auto' }}>
            There are no resources published under the selected criteria. Try adjusting your search
            query or category filter.
          </p>
        </div>
      ) : (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
            gap: '1.25rem',
          }}
        >
          {resources.map((res) => (
            <div
              key={res._id}
              className="card"
              style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}
            >
              <div>
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: '0.75rem',
                  }}
                >
                  <span className="badge badge-gold" style={{ textTransform: 'capitalize' }}>
                    {res.resourceType.replace('_', ' ')}
                  </span>
                  <span style={{ fontSize: '0.8rem', color: 'var(--ink-soft)' }}>
                    {res.department
                      ? `${res.department} ${res.semester ? `(Sem ${res.semester})` : ''}`
                      : 'General'}
                  </span>
                </div>
                <h3 style={{ fontSize: '1.15rem', marginBottom: '0.5rem', color: 'var(--ink)' }}>
                  {res.title}
                </h3>
                <p
                  style={{
                    fontSize: '0.875rem',
                    color: 'var(--ink-soft)',
                    lineHeight: 1.5,
                    marginBottom: '1.25rem',
                  }}
                >
                  {res.description}
                </p>
              </div>

              <div style={{ borderTop: '1px solid var(--rule)', paddingTop: '0.85rem' }}>
                <a
                  href={res.url}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="btn btn-primary"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.4rem',
                    width: '100%',
                    textAlign: 'center',
                    fontSize: '0.875rem',
                    textDecoration: 'none',
                  }}
                >
                  <span>Open Official Resource</span>
                  <ExternalLink size={14} />
                </a>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
