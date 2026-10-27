import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getResources, createResource, deleteResource, ResourceItem } from '../../services/admin.service';
import { useToast } from '../../context/ToastContext';

export function AdminResourcesPage() {
  const { toast, confirmModal } = useToast();
  const [resources, setResources] = useState<ResourceItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  // Form modal
  const [showModal, setShowModal] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [resourceType, setResourceType] = useState('syllabus');
  const [url, setUrl] = useState('');
  const [department, setDepartment] = useState('');
  const [semester, setSemester] = useState<number | ''>('');
  const [status, setStatus] = useState<'draft' | 'published'>('published');
  const [submitting, setSubmitting] = useState(false);

  async function loadData() {
    setLoading(true);
    setError(null);
    try {
      const res = await getResources({
        search,
        resourceType: typeFilter,
        status: statusFilter,
      });
      setResources(res.data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load resources');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, [search, typeFilter, statusFilter]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim() || !url.trim()) return;

    if (!/^https?:\/\/.+/i.test(url.trim())) {
      toast.error('Resource URL must begin with http:// or https://');
      return;
    }

    setSubmitting(true);
    try {
      await createResource({
        title,
        description,
        resourceType,
        url: url.trim(),
        department: department.trim() || undefined,
        semester: semester !== '' ? Number(semester) : undefined,
        status,
      });
      setShowModal(false);
      setTitle('');
      setDescription('');
      setUrl('');
      setDepartment('');
      setSemester('');
      toast.success('Curriculum resource published');
      loadData();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to publish resource');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(id: string) {
    const ok = await confirmModal({
      title: 'Delete Resource',
      message: 'Are you sure you want to permanently delete this curriculum resource?',
      confirmText: 'Delete Resource',
      isDestructive: true,
    });
    if (!ok) return;
    try {
      await deleteResource(id);
      setResources((prev) => prev.filter((r) => r._id !== id));
      toast.success('Resource deleted');
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to delete resource');
    }
  }

  return (
    <div className="container" style={{ padding: '2.5rem 1rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <span className="badge badge-gold" style={{ marginBottom: '0.5rem' }}>Curriculum Repository</span>
          <h1 style={{ fontSize: '2.25rem', color: 'var(--ink)' }}>Resource Library</h1>
          <p style={{ color: 'var(--ink-soft)' }}>
            Curate and distribute official syllabi, university question banks, and lab manuals.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <Link to="/admin/dashboard" className="btn btn-secondary">
            ← Dashboard
          </Link>
          <button onClick={() => setShowModal(true)} className="btn btn-primary">
            + Add Resource
          </button>
        </div>
      </div>

      {error && (
        <div style={{ background: 'var(--red-light)', color: 'var(--red)', padding: '1rem', borderRadius: '6px', marginBottom: '1.5rem', border: '1px solid var(--red)' }}>
          ⚠️ {error}
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="card" style={{ marginBottom: '1.5rem', padding: '1.25rem' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.35rem' }}>
              Search Title or Description
            </label>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="e.g. Networks, Algorithms"
              style={{ width: '100%', padding: '0.5rem 0.75rem', borderRadius: '4px', border: '1px solid var(--rule-strong)' }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.35rem' }}>
              Resource Type
            </label>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid var(--rule-strong)' }}
            >
              <option value="">All Resource Types</option>
              <option value="syllabus">Syllabus</option>
              <option value="lab_manual">Lab Manual</option>
              <option value="question_paper">Question Paper</option>
              <option value="notes">Notes</option>
              <option value="reference">Reference Material</option>
            </select>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.35rem' }}>
              Publication Status
            </label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid var(--rule-strong)' }}
            >
              <option value="">All Statuses</option>
              <option value="published">Published Only</option>
              <option value="draft">Drafts Only</option>
            </select>
          </div>
        </div>
      </div>

      {/* Resources Table */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.875rem' }}>
            <thead style={{ background: 'var(--bg-muted)', borderBottom: '1px solid var(--border-strong)' }}>
              <tr>
                <th style={{ padding: '0.875rem 1rem' }}>Title &amp; Description</th>
                <th style={{ padding: '0.875rem 1rem' }}>Type</th>
                <th style={{ padding: '0.875rem 1rem' }}>Audience</th>
                <th style={{ padding: '0.875rem 1rem' }}>Link</th>
                <th style={{ padding: '0.875rem 1rem' }}>Status</th>
                <th style={{ padding: '0.875rem 1rem', textAlign: 'right' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} style={{ padding: '2.5rem', textAlign: 'center', color: 'var(--ink-soft)' }}>
                    Loading resources...
                  </td>
                </tr>
              ) : resources.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ padding: '2.5rem', textAlign: 'center', color: 'var(--ink-soft)' }}>
                    No resources match the selected filters.
                  </td>
                </tr>
              ) : (
                resources.map((item) => (
                  <tr key={item._id} style={{ borderBottom: '1px solid var(--rule)' }}>
                    <td style={{ padding: '0.875rem 1rem', maxWidth: '300px' }}>
                      <strong style={{ display: 'block', color: 'var(--ink)' }}>{item.title}</strong>
                      <span style={{ fontSize: '0.8rem', color: 'var(--ink-soft)' }}>
                        {item.description.length > 70 ? `${item.description.slice(0, 70)}...` : item.description}
                      </span>
                    </td>
                    <td style={{ padding: '0.875rem 1rem' }}>
                      <span className="badge" style={{ background: 'var(--bg-muted)', color: 'var(--text-muted)', textTransform: 'capitalize' }}>
                        {item.resourceType.replace('_', ' ')}
                      </span>
                    </td>
                    <td style={{ padding: '0.875rem 1rem' }}>
                      {item.department ? `${item.department} ${item.semester ? `(Sem ${item.semester})` : ''}` : 'All Campus'}
                    </td>
                    <td style={{ padding: '0.875rem 1rem' }}>
                      <a
                        href={item.url}
                        target="_blank"
                        rel="noreferrer noopener"
                        style={{ color: 'var(--blue)', fontWeight: 600, textDecoration: 'underline' }}
                      >
                        Open Resource ↗
                      </a>
                    </td>
                    <td style={{ padding: '0.875rem 1rem' }}>
                      <span className={`badge ${item.status === 'published' ? 'badge-green' : 'badge-gold'}`}>
                        {item.status.toUpperCase()}
                      </span>
                    </td>
                    <td style={{ padding: '0.875rem 1rem', textAlign: 'right' }}>
                      <button
                        onClick={() => handleDelete(item._id)}
                        className="btn btn-secondary"
                        style={{ padding: '0.35rem 0.65rem', fontSize: '0.8rem', color: 'var(--red)' }}
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Resource Modal */}
      {showModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: '1rem' }}>
          <div className="card" style={{ maxWidth: '500px', width: '100%', padding: '2rem' }}>
            <h3 style={{ fontSize: '1.5rem', marginBottom: '1.25rem' }}>Publish Academic Resource</h3>
            <form onSubmit={handleCreate}>
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.35rem' }}>
                  Resource Title
                </label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Operating Systems Lab Manual 2026"
                  style={{ width: '100%', padding: '0.5rem 0.75rem', borderRadius: '4px', border: '1px solid var(--rule-strong)' }}
                />
              </div>

              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.35rem' }}>
                  Description
                </label>
                <textarea
                  required
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Enter details about this resource..."
                  style={{ width: '100%', padding: '0.5rem 0.75rem', borderRadius: '4px', border: '1px solid var(--rule-strong)', resize: 'vertical' }}
                />
              </div>

              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.35rem' }}>
                  Resource URL (HTTP / HTTPS)
                </label>
                <input
                  type="url"
                  required
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="https://drive.google.com/... or https://college.edu/..."
                  style={{ width: '100%', padding: '0.5rem 0.75rem', borderRadius: '4px', border: '1px solid var(--rule-strong)' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.35rem' }}>
                    Type
                  </label>
                  <select
                    value={resourceType}
                    onChange={(e) => setResourceType(e.target.value)}
                    style={{ width: '100%', padding: '0.45rem', borderRadius: '4px', border: '1px solid var(--rule-strong)' }}
                  >
                    <option value="syllabus">Syllabus</option>
                    <option value="lab_manual">Lab Manual</option>
                    <option value="question_paper">Question Paper</option>
                    <option value="notes">Lecture Notes</option>
                    <option value="reference">Reference Material</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.35rem' }}>
                    Status
                  </label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value as 'draft' | 'published')}
                    style={{ width: '100%', padding: '0.45rem', borderRadius: '4px', border: '1px solid var(--rule-strong)' }}
                  >
                    <option value="published">Published</option>
                    <option value="draft">Draft</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  disabled={submitting}
                  className="btn btn-secondary"
                >
                  Cancel
                </button>
                <button type="submit" disabled={submitting} className="btn btn-primary">
                  {submitting ? 'Publishing...' : 'Save Resource'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
