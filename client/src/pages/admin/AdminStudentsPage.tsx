import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle } from 'lucide-react';
import {
  getAdminStudents,
  updateStudentStatus,
  StudentListItem,
} from '../../services/admin.service';
import { useToast } from '../../context/ToastContext';

export function AdminStudentsPage() {
  const { toast } = useToast();
  const [students, setStudents] = useState<StudentListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters & Pagination
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);

  // Status Action Modal
  const [selectedStudent, setSelectedStudent] = useState<StudentListItem | null>(null);
  const [updating, setUpdating] = useState(false);

  async function loadData(pageNumber = page) {
    setLoading(true);
    setError(null);
    try {
      const res = await getAdminStudents({
        page: pageNumber,
        limit: 10,
        search,
        status: statusFilter,
      });
      setStudents(res.data);
      setPage(res.pagination.page);
      setTotalPages(res.pagination.totalPages);
      setTotalRecords(res.pagination.total);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load students');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData(1);
  }, [search, statusFilter]);

  async function handleToggleStatus() {
    if (!selectedStudent) return;
    const nextStatus = selectedStudent.status === 'active' ? 'suspended' : 'active';
    setUpdating(true);
    try {
      await updateStudentStatus(selectedStudent.id, nextStatus);
      setSelectedStudent(null);
      toast.success(`Student status updated to ${nextStatus}`);
      loadData(page);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to update student status');
    } finally {
      setUpdating(false);
    }
  }

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
            Student Directory
          </span>
          <h1 style={{ fontSize: '2.25rem', color: 'var(--ink)' }}>Enrolled Students</h1>
          <p style={{ color: 'var(--ink-soft)' }}>
            Search, inspect academic progress, and manage student authorization status. Total:{' '}
            {totalRecords}
          </p>
        </div>
        <Link to="/admin/dashboard" className="btn btn-secondary">
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
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
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
              Search Name or Roll Number
            </label>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="e.g. 24ESKCS013 or Manoj"
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
              Account Status
            </label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              style={{
                width: '100%',
                padding: '0.5rem',
                borderRadius: '4px',
                border: '1px solid var(--rule-strong)',
              }}
            >
              <option value="">All Statuses</option>
              <option value="active">Active Only</option>
              <option value="suspended">Suspended Only</option>
            </select>
          </div>
        </div>
      </div>

      {/* Students Table */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table
            style={{
              width: '100%',
              borderCollapse: 'collapse',
              textAlign: 'left',
              fontSize: '0.875rem',
            }}
          >
            <thead
              style={{
                background: 'var(--bg-muted)',
                borderBottom: '1px solid var(--border-strong)',
              }}
            >
              <tr>
                <th style={{ padding: '0.875rem 1rem' }}>Roll Number</th>
                <th style={{ padding: '0.875rem 1rem' }}>Name</th>
                <th style={{ padding: '0.875rem 1rem' }}>Email</th>
                <th style={{ padding: '0.875rem 1rem' }}>Dept / Sem</th>
                <th style={{ padding: '0.875rem 1rem' }}>Attendance</th>
                <th style={{ padding: '0.875rem 1rem' }}>Status</th>
                <th style={{ padding: '0.875rem 1rem', textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td
                    colSpan={7}
                    style={{ padding: '2.5rem', textAlign: 'center', color: 'var(--ink-soft)' }}
                  >
                    Loading students...
                  </td>
                </tr>
              ) : students.length === 0 ? (
                <tr>
                  <td
                    colSpan={7}
                    style={{ padding: '2.5rem', textAlign: 'center', color: 'var(--ink-soft)' }}
                  >
                    No student records match the given criteria.
                  </td>
                </tr>
              ) : (
                students.map((student) => {
                  const att = student.profile?.attendancePercentage ?? 0;
                  return (
                    <tr key={student.id} style={{ borderBottom: '1px solid var(--rule)' }}>
                      <td style={{ padding: '0.875rem 1rem', fontWeight: 600 }}>
                        {student.profile?.rollNumber ?? 'N/A'}
                      </td>
                      <td style={{ padding: '0.875rem 1rem' }}>{student.name}</td>
                      <td style={{ padding: '0.875rem 1rem', color: 'var(--ink-soft)' }}>
                        {student.email}
                      </td>
                      <td style={{ padding: '0.875rem 1rem' }}>
                        {student.profile
                          ? `${student.profile.department} (Sem ${student.profile.semester})`
                          : '—'}
                      </td>
                      <td style={{ padding: '0.875rem 1rem' }}>
                        <span
                          style={{
                            color: att >= 75 ? 'var(--green)' : 'var(--red)',
                            fontWeight: 600,
                          }}
                        >
                          {att}%
                        </span>
                      </td>
                      <td style={{ padding: '0.875rem 1rem' }}>
                        <span
                          className={`badge ${student.status === 'active' ? 'badge-green' : 'badge-gold'}`}
                        >
                          {student.status.toUpperCase()}
                        </span>
                      </td>
                      <td style={{ padding: '0.875rem 1rem', textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', gap: '0.5rem' }}>
                          <Link
                            to={`/admin/students/${student.id}`}
                            className="btn btn-secondary"
                            style={{ padding: '0.35rem 0.7rem', fontSize: '0.8rem' }}
                          >
                            Details
                          </Link>
                          <button
                            onClick={() => setSelectedStudent(student)}
                            className="btn btn-secondary"
                            style={{
                              padding: '0.35rem 0.7rem',
                              fontSize: '0.8rem',
                              color: student.status === 'active' ? 'var(--red)' : 'var(--green)',
                            }}
                          >
                            {student.status === 'active' ? 'Suspend' : 'Activate'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '1rem',
            borderTop: '1px solid var(--border-strong)',
            background: 'var(--bg-muted)',
          }}
        >
          <span style={{ fontSize: '0.85rem', color: 'var(--ink-soft)' }}>
            Page {page} of {totalPages} ({totalRecords} students total)
          </span>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button
              onClick={() => loadData(page - 1)}
              disabled={page <= 1 || loading}
              className="btn btn-secondary"
              style={{ padding: '0.35rem 0.75rem', fontSize: '0.8rem' }}
            >
              Previous
            </button>
            <button
              onClick={() => loadData(page + 1)}
              disabled={page >= totalPages || loading}
              className="btn btn-secondary"
              style={{ padding: '0.35rem 0.75rem', fontSize: '0.8rem' }}
            >
              Next
            </button>
          </div>
        </div>
      </div>

      {/* Confirmation Modal */}
      {selectedStudent && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 100,
            padding: '1rem',
          }}
        >
          <div className="card" style={{ maxWidth: '440px', width: '100%', padding: '2rem' }}>
            <h3 style={{ fontSize: '1.25rem', marginBottom: '1rem' }}>
              Confirm Account Status Change
            </h3>
            <p style={{ color: 'var(--ink-soft)', lineHeight: 1.5, marginBottom: '1.5rem' }}>
              Are you sure you want to{' '}
              {selectedStudent.status === 'active' ? 'SUSPEND' : 'ACTIVATE'} the account of{' '}
              <strong>{selectedStudent.name}</strong> ({selectedStudent.email})?
              {selectedStudent.status === 'active' &&
                ' Suspended students are immediately blocked from logging in or using active sessions.'}
            </p>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
              <button
                onClick={() => setSelectedStudent(null)}
                disabled={updating}
                className="btn btn-secondary"
              >
                Cancel
              </button>
              <button
                onClick={handleToggleStatus}
                disabled={updating}
                className="btn btn-primary"
                style={{
                  background: selectedStudent.status === 'active' ? 'var(--red)' : 'var(--green)',
                  borderColor: selectedStudent.status === 'active' ? 'var(--red)' : 'var(--green)',
                }}
              >
                {updating
                  ? 'Updating...'
                  : `Confirm ${selectedStudent.status === 'active' ? 'Suspension' : 'Activation'}`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
