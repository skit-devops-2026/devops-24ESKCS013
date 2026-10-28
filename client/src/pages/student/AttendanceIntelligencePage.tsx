import { useState, useEffect } from 'react';
import { LayoutGrid, Table as TableIcon } from 'lucide-react';
import { useToast } from '../../context/ToastContext';
import {
  getAttendance,
  parseAttendancePreview,
  importAttendance,
  updateAttendanceRecord,
  deleteAttendanceRecord,
  simulateAttendance,
  AttendanceRecordItem,
  AttendanceSummary,
  ParsedRowPreview,
  AttendancePolicy,
  CLIENT_POLICY_METADATA,
  SimulationResult,
} from '../../services/attendance.service';

const SAMPLE_ERP_DATA = `# University ERP Attendance Report
# Student ERP Aggregate: 80.1% | Overall OD Count: 17
# Event Attendance: Techpravah 2026 (12–15 October 2026) — Present: 8 hrs | Absent: 16 hrs | Total: 24 hrs
# Event Note: Event hours are included in aggregate attendance but are not assigned to individual lectures, labs, or days.
#\tSubject Code\tSubject\tSubject Type\tPresent\tOD\tMakeup\tAbsent\tPercentage
1\tCEUL560.1\tClimate Change Science\tLecture\t30\t3\t0\t3\t91.67
2\tCRT\tCampus Recruitment Training\tLab\t58\t0\t0\t14\t80.56
3\tCSUL501\tDesign and Analysis of Algorithms\tLecture\t26\t1\t0\t11\t71.05
4\tCSUL502\tMachine Learning\tLecture\t26\t2\t0\t9\t75.68
5\tCSUL503\tCryptography and Network Security\tLecture\t32\t0\t0\t8\t80.00
6\tCSUL504\tFull Stack Development\tLecture\t17\t2\t0\t5\t79.17
7\tCSUL511\tDevOps Practices and Principles\tLecture\t30\t3\t1\t7\t85.00
8\tCSUP520\tDesign and Analysis of Algorithms Lab\tLab\t22\t0\t0\t4\t84.62
9\tCSUP521\tMachine Learning Lab\tLab\t22\t0\t0\t2\t91.67
10\tCSUP522\tFull Stack Development Lab\tLab\t18\t6\t0\t2\t92.31
11\tCSUT530\tIndustrial Training\tLab\t14\t0\t2\t1\t100.00`;

export function AttendanceIntelligencePage() {
  const { toast, confirmModal } = useToast();
  const [summary, setSummary] = useState<AttendanceSummary | null>(null);
  const [records, setRecords] = useState<AttendanceRecordItem[]>([]);
  const [shortages, setShortages] = useState<AttendanceRecordItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<'all' | 'shortages' | 'safe' | 'discrepancy'>('all');
  const [sortBy, setSortBy] = useState<'shortage_first' | 'percentage_asc' | 'percentage_desc' | 'code'>('shortage_first');
  const [viewMode, setViewMode] = useState<'cards' | 'table'>('cards');

  // Detail View Modal State
  const [selectedSubjectDetail, setSelectedSubjectDetail] = useState<AttendanceRecordItem | null>(null);

  // Import Modal State
  const [showImportModal, setShowImportModal] = useState(false);
  const [rawText, setRawText] = useState('');
  const [selectedPolicy, setSelectedPolicy] = useState<AttendancePolicy>('standard_od');
  const [previewRows, setPreviewRows] = useState<ParsedRowPreview[] | null>(null);
  const [previewStats, setPreviewStats] = useState<{
    totalRows: number;
    validRows: number;
    invalidRows: number;
    duplicateRows: number;
    discrepancyCount: number;
    changedRows: number;
    newRows: number;
  } | null>(null);
  const [previewMetadata, setPreviewMetadata] = useState<{
    erpAggregatePercentage?: number;
    overallOdCount?: number;
    eventAttendance?: {
      eventName: string;
      eventDates: string;
      presentHours: number;
      absentHours: number;
      totalHours: number;
      remarks: string;
    };
  } | null>(null);
  const [previewErrors, setPreviewErrors] = useState<string[]>([]);
  const [parsing, setParsing] = useState(false);
  const [importing, setImporting] = useState(false);

  // Scenario Simulator State
  const [selectedRecordForSim, setSelectedRecordForSim] = useState<AttendanceRecordItem | null>(null);
  const [simAttended, setSimAttended] = useState(0);
  const [simMissed, setSimMissed] = useState(0);
  const [simThreshold, setSimThreshold] = useState(75);
  const [simulationResult, setSimulationResult] = useState<SimulationResult | null>(null);
  const [simulating, setSimulating] = useState(false);

  // Edit Row State
  const [editingRecord, setEditingRecord] = useState<AttendanceRecordItem | null>(null);
  const [editForm, setEditForm] = useState({
    present: 0,
    od: 0,
    makeup: 0,
    absent: 0,
    threshold: 75,
  });

  async function loadData() {
    setLoading(true);
    setError(null);
    try {
      const res = await getAttendance();
      setSummary(res.summary);
      setRecords(res.records);
      setShortages(res.shortages);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load attendance data');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  // Handle parsing preview
  async function handleGeneratePreview() {
    if (!rawText.trim()) {
      toast.error('Please paste ERP text or upload a CSV first.');
      return;
    }
    setParsing(true);
    setPreviewErrors([]);
    try {
      const res = await parseAttendancePreview(rawText, selectedPolicy);
      setPreviewRows(res.rows);
      setPreviewStats({
        totalRows: res.totalRows,
        validRows: res.validRows,
        invalidRows: res.invalidRows,
        duplicateRows: res.duplicateRows || 0,
        discrepancyCount: res.discrepancyCount,
        changedRows: res.changedRows || 0,
        newRows: res.newRows || 0,
      });
      if (res.metadata) {
        setPreviewMetadata(res.metadata);
      }
      setPreviewErrors(res.errors || []);
      toast.info(`Parsed ${res.validRows} valid attendance course rows.`);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Parsing failed.');
    } finally {
      setParsing(false);
    }
  }

  // Handle CSV file upload
  function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      if (text) {
        setRawText(text);
      }
    };
    reader.readAsText(file);
  }

  // Handle confirmation and persistence of preview rows
  async function handleConfirmImport() {
    if (!previewRows || previewRows.length === 0) return;

    const validRows = previewRows.filter((r) => r.isValid);
    if (validRows.length === 0) {
      toast.error('No valid rows available to import.');
      return;
    }

    setImporting(true);
    try {
      await importAttendance(
        validRows.map((r) => ({
          subjectCode: r.subjectCode,
          subjectName: r.subjectName,
          subjectType: r.subjectType,
          present: r.present,
          od: r.od,
          makeup: r.makeup,
          absent: r.absent,
          erpPercentage: r.erpPercentage,
          discrepancyNote: r.discrepancyNote,
        })),
        selectedPolicy,
        previewMetadata || undefined
      );

      setShowImportModal(false);
      setPreviewRows(null);
      setPreviewStats(null);
      setPreviewMetadata(null);
      setRawText('');
      toast.success('Attendance records imported and synchronized successfully');
      loadData();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Import failed');
    } finally {
      setImporting(false);
    }
  }

  // Inline edit in preview table before saving with live re-calculation
  function handlePreviewCellChange(index: number, field: keyof ParsedRowPreview, val: unknown) {
    if (!previewRows) return;
    const updated = [...previewRows];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (updated[index] as any)[field] = val;

    // Recalculate preview row metrics on edit
    const p = Math.max(0, updated[index].present || 0);
    const od = Math.max(0, updated[index].od || 0);
    const m = Math.max(0, updated[index].makeup || 0);
    const a = Math.max(0, updated[index].absent || 0);
    let attended = p + od;
    let conducted = p + od + m + a;
    if (selectedPolicy === 'strict_present') {
      attended = p;
      conducted = p + a;
    } else if (selectedPolicy === 'makeup_compensatory') {
      conducted = attended + Math.max(0, a - m);
    }
    const calcPct = conducted > 0 ? Number(((attended / conducted) * 100).toFixed(2)) : 0;
    updated[index].calculatedPercentage = calcPct;
    if (updated[index].erpPercentage !== undefined) {
      const delta = Number(Math.abs(calcPct - updated[index].erpPercentage).toFixed(2));
      updated[index].isDiscrepancy = delta > 0.1;
      updated[index].discrepancyDelta = delta;
    }

    setPreviewRows(updated);
  }

  // Delete attendance record
  async function handleDelete(id: string, code: string) {
    const ok = await confirmModal({
      title: 'Delete Attendance Record',
      message: `Are you sure you want to delete attendance records for ${code}? This cannot be undone.`,
      confirmText: 'Delete Record',
      isDestructive: true,
    });
    if (!ok) return;
    try {
      await deleteAttendanceRecord(id);
      toast.success(`Deleted attendance for ${code}`);
      loadData();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to delete record');
    }
  }

  // Trigger Scenario Simulator for a given subject
  async function handleOpenSimulator(record: AttendanceRecordItem) {
    setSelectedRecordForSim(record);
    setSimAttended(0);
    setSimMissed(0);
    setSimThreshold(record.threshold || 75);
    runSimulation(record, 0, 0, record.threshold || 75);
  }

  async function runSimulation(record: AttendanceRecordItem, addAttended: number, addMissed: number, threshold?: number) {
    setSimulating(true);
    const targetThreshold = threshold ?? simThreshold ?? record.threshold ?? 75;
    try {
      const res = await simulateAttendance({
        recordId: record._id,
        additionalAttended: addAttended,
        additionalMissed: addMissed,
        threshold: targetThreshold,
      });
      setSimulationResult(res);
    } catch (err: unknown) {
      console.error(err);
    } finally {
      setSimulating(false);
    }
  }

  // Edit existing record
  function handleStartEdit(record: AttendanceRecordItem) {
    setEditingRecord(record);
    setEditForm({
      present: record.present,
      od: record.od,
      makeup: record.makeup,
      absent: record.absent,
      threshold: record.threshold || 75,
    });
  }

  async function handleSaveEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!editingRecord) return;
    try {
      await updateAttendanceRecord(editingRecord._id, editForm);
      setEditingRecord(null);
      toast.success('Attendance record updated successfully');
      loadData();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Update failed');
    }
  }

  const primaryShortage = shortages.length > 0 ? shortages[0] : null;

  // Filter & sort records
  const filteredAndSortedRecords = records
    .filter((r) => {
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matches =
          r.subjectCode.toLowerCase().includes(q) ||
          r.subjectName.toLowerCase().includes(q) ||
          (r.subjectType && r.subjectType.toLowerCase().includes(q));
        if (!matches) return false;
      }
      if (activeFilter === 'shortages') return r.isShortage;
      if (activeFilter === 'safe') return !r.isShortage;
      if (activeFilter === 'discrepancy') return r.isDiscrepancy;
      return true;
    })
    .sort((a, b) => {
      if (sortBy === 'shortage_first') {
        if (a.isShortage && !b.isShortage) return -1;
        if (!a.isShortage && b.isShortage) return 1;
        return a.calculatedPercentage - b.calculatedPercentage;
      }
      if (sortBy === 'percentage_asc') {
        return a.calculatedPercentage - b.calculatedPercentage;
      }
      if (sortBy === 'percentage_desc') {
        return b.calculatedPercentage - a.calculatedPercentage;
      }
      if (sortBy === 'code') {
        return a.subjectCode.localeCompare(b.subjectCode);
      }
      return 0;
    });

  return (
    <div className="container" style={{ padding: '2.5rem 1rem' }}>
      {/* Page Header */}
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
            Flagship Academic Feature
          </span>
          <h1 style={{ fontSize: '2.25rem', color: 'var(--ink)' }}>Attendance Intelligence</h1>
          <p style={{ color: 'var(--ink-soft)' }}>
            Real ERP report ingestion, transparent policy assumptions, and consecutive recovery math.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          <button
            onClick={() => {
              setShowImportModal(true);
              setPreviewRows(null);
            }}
            className="btn btn-primary"
          >
            📥 Import ERP Attendance
          </button>
        </div>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '4rem 1rem' }}>
          <p style={{ color: 'var(--ink-soft)' }}>Loading attendance intelligence records...</p>
        </div>
      ) : error ? (
        <div className="card" style={{ borderLeft: '4px solid var(--crimson)', padding: '1.5rem', marginBottom: '2rem' }}>
          <h3 style={{ color: 'var(--crimson)', marginBottom: '0.5rem' }}>Error Loading Attendance</h3>
          <p style={{ color: 'var(--ink-soft)' }}>{error}</p>
          <button onClick={loadData} className="btn btn-secondary" style={{ marginTop: '1rem' }}>
            Retry
          </button>
        </div>
      ) : records.length === 0 ? (
        /* Empty State */
        <div className="card" style={{ textAlign: 'center', padding: '4rem 2rem' }}>
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📊</div>
          <h2 style={{ fontSize: '1.5rem', marginBottom: '0.5rem', color: 'var(--ink)' }}>
            No ERP Attendance Records Imported Yet
          </h2>
          <p style={{ color: 'var(--ink-soft)', maxWidth: '540px', margin: '0 auto 1.5rem' }}>
            Import your college ERP attendance report (TSV copy-paste or CSV file) to calculate shortfall
            projections, safe absences, and consecutive classes required for exam eligibility.
          </p>
          <button
            onClick={() => {
              setShowImportModal(true);
              setRawText(SAMPLE_ERP_DATA);
            }}
            className="btn btn-primary"
          >
            📥 Import Sample ERP Data
          </button>
        </div>
      ) : (
        <>
          {/* Priority Shortage Highlight Banner (CSUL501 DAA) */}
          {primaryShortage && (
            <div
              className="card"
              style={{
                borderLeft: '5px solid var(--crimson)',
                background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.05), rgba(239, 68, 68, 0.01))',
                marginBottom: '2rem',
                padding: '1.5rem',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                    <span className="badge badge-red">🚨 Critical Attendance Shortage</span>
                    <span className="badge badge-gold">{primaryShortage.subjectCode}</span>
                  </div>
                  <h2 style={{ fontSize: '1.5rem', color: 'var(--ink)', marginBottom: '0.25rem' }}>
                    {primaryShortage.subjectName}
                  </h2>
                  <p style={{ color: 'var(--ink-soft)', fontSize: '0.95rem' }}>
                    Current Attendance: <strong style={{ color: 'var(--crimson)' }}>{primaryShortage.calculatedPercentage}%</strong> &bull; Required Threshold: <strong>{primaryShortage.threshold || 75}%</strong>
                  </p>
                  <p style={{ color: 'var(--ink)', fontSize: '1.05rem', fontWeight: 600, marginTop: '0.75rem' }}>
                    Recovery Math: Attend the next{' '}
                    <span style={{ color: 'var(--crimson)', textDecoration: 'underline' }}>
                      {primaryShortage.classesNeeded} consecutive classes
                    </span>{' '}
                    without absence to reach {primaryShortage.threshold || 75}.00%.
                  </p>
                  <p style={{ color: 'var(--ink-soft)', fontSize: '0.8rem', marginTop: '0.25rem' }}>
                    Assumes current policy ({CLIENT_POLICY_METADATA[primaryShortage.policyUsed]?.name}) with 1 OD counted. Future sessions are attended normally.
                  </p>
                </div>
                <div>
                  <button
                    onClick={() => handleOpenSimulator(primaryShortage)}
                    className="btn btn-primary"
                    style={{ whiteSpace: 'nowrap' }}
                  >
                    🎲 Simulate Recovery Plan
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ERP Official Aggregate & Event Hours Banner */}
          {summary && (
            <div
              className="card"
              style={{
                background: 'var(--accent-primary-soft)',
                borderLeft: '4px solid var(--accent-primary)',
                padding: '1.25rem 1.5rem',
                marginBottom: '1.5rem',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                    <span className="badge" style={{ backgroundColor: 'var(--blue-soft)', color: 'var(--blue)', fontWeight: 600 }}>
                      🏛️ Official ERP Aggregate & Event Hours
                    </span>
                    <span className="badge badge-gold">Overall ODs: {summary.overallOdCount ?? 17}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.75rem', marginTop: '0.25rem' }}>
                    <span style={{ fontSize: '1.6rem', fontWeight: 700, color: 'var(--ink)' }}>
                      ERP aggregate (incl. event hours): {summary.erpAggregatePercentage ?? 80.1}%
                    </span>
                    <span style={{ fontSize: '0.85rem', color: 'var(--ink-soft)' }}>
                      (vs {summary.overallPercentage}% Course average (lectures/labs))
                    </span>
                  </div>
                  {summary.eventAttendance && (
                    <div style={{ fontSize: '0.82rem', color: 'var(--ink-soft)', marginTop: '0.5rem', lineHeight: 1.5 }}>
                      <strong>Event Attendance ({summary.eventAttendance.eventName} &bull; {summary.eventAttendance.eventDates}):</strong>{' '}
                      {summary.eventAttendance.presentHours} Present hrs, {summary.eventAttendance.absentHours} Absent hrs ({summary.eventAttendance.totalHours} Total hrs).{' '}
                      <em>{summary.eventAttendance.remarks}</em>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Metric KPI Overview */}
          {summary && (
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                gap: '1rem',
                marginBottom: '2.5rem',
              }}
            >
              <div className="card" style={{ padding: '1.25rem' }}>
                <span style={{ fontSize: '0.78rem', color: 'var(--ink-soft)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Course average (lectures/labs)
                </span>
                <div style={{ fontSize: '2rem', fontWeight: 700, color: summary.overallPercentage >= 75 ? 'var(--emerald)' : 'var(--crimson)', marginTop: '0.25rem' }}>
                  {summary.overallPercentage}%
                </div>
                <div style={{ fontSize: '0.85rem', color: 'var(--ink-soft)', marginTop: '0.25rem' }}>
                  {summary.totalAttended} attended of {summary.totalConducted} conducted
                </div>
              </div>

              <div className="card" style={{ padding: '1.25rem' }}>
                <span style={{ fontSize: '0.8rem', color: 'var(--ink-soft)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Shortage Alerts
                </span>
                <div style={{ fontSize: '2rem', fontWeight: 700, color: summary.hasShortage ? 'var(--crimson)' : 'var(--emerald)', marginTop: '0.25rem' }}>
                  {summary.shortageCount} {summary.shortageCount === 1 ? 'Subject' : 'Subjects'}
                </div>
                <div style={{ fontSize: '0.85rem', color: 'var(--ink-soft)', marginTop: '0.25rem' }}>
                  {summary.safeCount} subjects at or above safe margin
                </div>
              </div>

              <div className="card" style={{ padding: '1.25rem' }}>
                <span style={{ fontSize: '0.8rem', color: 'var(--ink-soft)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Active Counting Policy
                </span>
                <div style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--ink)', marginTop: '0.5rem' }}>
                  {summary.policyMeta?.name || 'Standard Policy'}
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--ink-soft)', marginTop: '0.25rem' }}>
                  {summary.policyMeta?.formula}
                </div>
              </div>

              <div className="card" style={{ padding: '1.25rem' }}>
                <span style={{ fontSize: '0.8rem', color: 'var(--ink-soft)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Total Courses Enrolled
                </span>
                <div style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--ink)', marginTop: '0.25rem' }}>
                  {summary.totalSubjects}
                </div>
                <div style={{ fontSize: '0.85rem', color: 'var(--ink-soft)', marginTop: '0.25rem' }}>
                  Last synchronized {summary.lastImportedAt ? new Date(summary.lastImportedAt).toLocaleDateString() : 'recently'}
                </div>
              </div>
            </div>
          )}

          {/* Subject-Wise Ledger */}
          <div className="card" style={{ padding: '1.5rem', marginBottom: '2rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.75rem' }}>
              <div>
                <h3 style={{ fontSize: '1.25rem', color: 'var(--ink)' }}>Subject-Wise Attendance Ledger</h3>
                <span style={{ fontSize: '0.85rem', color: 'var(--ink-soft)' }}>
                  Complete university roster showing ERP-reported vs policy-calculated attendance
                </span>
              </div>
            </div>

            {/* Filter, Search, and Sort Controls */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '1rem' }}>
              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
                <button
                  type="button"
                  onClick={() => setActiveFilter('all')}
                  className={`btn ${activeFilter === 'all' ? 'btn-primary' : 'btn-secondary'}`}
                  style={{ fontSize: '0.8rem', padding: '0.35rem 0.75rem' }}
                >
                  All ({records.length})
                </button>
                <button
                  type="button"
                  onClick={() => setActiveFilter('shortages')}
                  className={`btn ${activeFilter === 'shortages' ? 'btn-primary' : 'btn-secondary'}`}
                  style={{ fontSize: '0.8rem', padding: '0.35rem 0.75rem', color: activeFilter === 'shortages' ? '#fff' : 'var(--crimson)' }}
                >
                  ⚠️ Shortages ({shortages.length})
                </button>
                <button
                  type="button"
                  onClick={() => setActiveFilter('safe')}
                  className={`btn ${activeFilter === 'safe' ? 'btn-primary' : 'btn-secondary'}`}
                  style={{ fontSize: '0.8rem', padding: '0.35rem 0.75rem', color: activeFilter === 'safe' ? '#fff' : 'var(--emerald)' }}
                >
                  ✓ Safe ({records.length - shortages.length})
                </button>
                <button
                  type="button"
                  onClick={() => setActiveFilter('discrepancy')}
                  className={`btn ${activeFilter === 'discrepancy' ? 'btn-primary' : 'btn-secondary'}`}
                  style={{ fontSize: '0.8rem', padding: '0.35rem 0.75rem', color: activeFilter === 'discrepancy' ? 'var(--bg-surface)' : 'var(--gold)' }}
                >
                  ⚖️ Discrepancies ({records.filter((r) => r.isDiscrepancy).length})
                </button>
              </div>

              <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
                {/* View Mode Toggle */}
                <div style={{ display: 'flex', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', overflow: 'hidden' }}>
                  <button
                    type="button"
                    onClick={() => setViewMode('cards')}
                    style={{
                      padding: '0.4rem 0.65rem',
                      fontSize: '0.8rem',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.35rem',
                      backgroundColor: viewMode === 'cards' ? 'var(--brand-gold)' : 'var(--surface)',
                      color: viewMode === 'cards' ? '#fff' : 'var(--ink-soft)',
                      border: 'none',
                      cursor: 'pointer',
                      fontWeight: 600,
                    }}
                    title="Grid Cards View"
                  >
                    <LayoutGrid size={14} />
                    <span>Cards</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setViewMode('table')}
                    style={{
                      padding: '0.4rem 0.65rem',
                      fontSize: '0.8rem',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.35rem',
                      backgroundColor: viewMode === 'table' ? 'var(--brand-gold)' : 'var(--surface)',
                      color: viewMode === 'table' ? '#fff' : 'var(--ink-soft)',
                      border: 'none',
                      cursor: 'pointer',
                      fontWeight: 600,
                    }}
                    title="Compact Table View"
                  >
                    <TableIcon size={14} />
                    <span>Table</span>
                  </button>
                </div>

                <input
                  type="text"
                  placeholder="Search subject code or name..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="input-field"
                  style={{ fontSize: '0.85rem', padding: '0.4rem 0.75rem', width: '200px' }}
                />
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as any)}
                  className="input-field"
                  style={{ fontSize: '0.85rem', padding: '0.4rem 0.75rem' }}
                >
                  <option value="shortage_first">Sort: Shortages First</option>
                  <option value="percentage_asc">Sort: Attendance (Low to High)</option>
                  <option value="percentage_desc">Sort: Attendance (High to Low)</option>
                  <option value="code">Sort: Subject Code (A–Z)</option>
                </select>
              </div>
            </div>

            {/* View 1: Cards View */}
            {viewMode === 'cards' ? (
              filteredAndSortedRecords.length === 0 ? (
                <div style={{ padding: '3rem 1rem', textAlign: 'center', color: 'var(--ink-soft)' }}>
                  No subjects match your current filter or search criteria.
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1.25rem' }}>
                  {filteredAndSortedRecords.map((r) => {
                    const isShort = r.isShortage;
                    return (
                      <div
                        key={r._id}
                        className="card"
                        style={{
                          padding: '1.25rem',
                          display: 'flex',
                          flexDirection: 'column',
                          justifyContent: 'space-between',
                          border: isShort ? '1px solid var(--crimson)' : '1px solid var(--border)',
                          backgroundColor: isShort ? 'rgba(239, 68, 68, 0.02)' : 'var(--surface)',
                        }}
                      >
                        <div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                              <span className="badge badge-gold" style={{ fontWeight: 700 }}>{r.subjectCode}</span>
                              <span className="badge" style={{ fontSize: '0.72rem' }}>{r.subjectType}</span>
                            </div>
                            <span
                              className={`badge ${isShort ? 'badge-red' : 'badge-green'}`}
                              style={{ fontWeight: 700 }}
                            >
                              {isShort ? 'Shortage' : 'Compliant'}
                            </span>
                          </div>

                          <h4 style={{ fontSize: '1.05rem', color: 'var(--ink)', margin: '0 0 0.5rem', fontWeight: 600 }}>
                            {r.subjectName}
                          </h4>

                          {/* Percentage & Progress Bar */}
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '0.35rem' }}>
                            <span style={{ fontSize: '1.8rem', fontWeight: 800, color: isShort ? 'var(--crimson)' : 'var(--emerald)' }}>
                              {r.calculatedPercentage}%
                            </span>
                            <span style={{ fontSize: '0.78rem', color: 'var(--ink-soft)' }}>
                              Target: {r.threshold || 75}% &bull; ERP: {r.erpPercentage}%
                            </span>
                          </div>

                          <div style={{ height: 7, width: '100%', backgroundColor: 'var(--surface-muted)', borderRadius: 4, overflow: 'hidden', marginBottom: '1rem', position: 'relative' }}>
                            <div
                              style={{
                                height: '100%',
                                width: `${Math.min(100, r.calculatedPercentage)}%`,
                                backgroundColor: isShort ? 'var(--crimson)' : 'var(--emerald)',
                                borderRadius: 4,
                              }}
                            />
                            {/* 75% Threshold indicator mark */}
                            <div
                              style={{
                                position: 'absolute',
                                top: 0,
                                bottom: 0,
                                left: '75%',
                                width: 2,
                                backgroundColor: 'var(--ink-soft)',
                                opacity: 0.7,
                              }}
                              title="75% minimum requirement cutoff"
                            />
                          </div>

                          {/* Quick Metrics Strip */}
                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.4rem', textAlign: 'center', padding: '0.6rem 0.4rem', backgroundColor: 'var(--surface-muted)', borderRadius: 'var(--radius-sm)', marginBottom: '1rem', fontSize: '0.75rem' }}>
                            <div>
                              <div style={{ color: 'var(--ink-soft)' }}>Present</div>
                              <div style={{ fontWeight: 700, color: 'var(--ink)' }}>{r.present}</div>
                            </div>
                            <div>
                              <div style={{ color: 'var(--ink-soft)' }}>OD</div>
                              <div style={{ fontWeight: 700, color: 'var(--ink)' }}>{r.od}</div>
                            </div>
                            <div>
                              <div style={{ color: 'var(--ink-soft)' }}>Absent</div>
                              <div style={{ fontWeight: 700, color: 'var(--ink)' }}>{r.absent}</div>
                            </div>
                            <div>
                              <div style={{ color: 'var(--ink-soft)' }}>Total</div>
                              <div style={{ fontWeight: 700, color: 'var(--ink)' }}>{r.totalConducted}</div>
                            </div>
                          </div>

                          {/* "Can I Bunk?" Status Pill */}
                          <div
                            style={{
                              padding: '0.65rem 0.85rem',
                              borderRadius: 'var(--radius-md)',
                              marginBottom: '1rem',
                              backgroundColor: isShort ? 'var(--crimson-soft, rgba(239, 68, 68, 0.08))' : 'var(--emerald-soft, rgba(16, 185, 129, 0.08))',
                              border: `1px solid ${isShort ? 'var(--crimson, rgba(239, 68, 68, 0.3))' : 'var(--emerald, rgba(16, 185, 129, 0.3))'}`,
                              fontSize: '0.82rem',
                              lineHeight: 1.4,
                            }}
                          >
                            {isShort ? (
                              <div>
                                <strong style={{ color: 'var(--crimson)' }}>⚠️ Deficit: Recovery Math</strong>
                                <div style={{ color: 'var(--ink)', marginTop: '0.15rem' }}>
                                  Must attend next <strong>{r.classesNeeded} consecutive {r.classesNeeded === 1 ? 'class' : 'classes'}</strong> without absence to cross 75%.
                                </div>
                              </div>
                            ) : (
                              <div>
                                <strong style={{ color: 'var(--emerald)' }}>✓ Can I Bunk? Safe Margin</strong>
                                <div style={{ color: 'var(--ink)', marginTop: '0.15rem' }}>
                                  {r.classesSkippable > 0 ? (
                                    <>You can safely miss up to <strong>{r.classesSkippable} {r.classesSkippable === 1 ? 'class' : 'classes'}</strong> and remain at or above 75%.</>
                                  ) : (
                                    <>At exact threshold margin. <strong>0 safe bunks</strong> (any absence drops below 75%).</>
                                  )}
                                </div>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Action Buttons */}
                        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', borderTop: '1px solid var(--border)', paddingTop: '0.85rem' }}>
                          <button
                            onClick={() => handleOpenSimulator(r)}
                            className="btn btn-primary"
                            style={{ fontSize: '0.78rem', padding: '0.4rem 0.75rem', flex: 1, justifyContent: 'center' }}
                          >
                            🎲 Simulate
                          </button>
                          <button
                            onClick={() => setSelectedSubjectDetail(r)}
                            className="btn btn-secondary"
                            style={{ fontSize: '0.78rem', padding: '0.4rem 0.65rem' }}
                            title="Inspect full details"
                          >
                            Details
                          </button>
                          <button
                            onClick={() => handleStartEdit(r)}
                            className="btn btn-secondary"
                            style={{ fontSize: '0.78rem', padding: '0.4rem 0.65rem' }}
                            title="Edit class counts"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleDelete(r._id, r.subjectCode)}
                            className="btn btn-secondary"
                            style={{ fontSize: '0.78rem', padding: '0.4rem 0.65rem', color: 'var(--crimson)' }}
                            title="Delete record"
                          >
                            🗑
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )
            ) : (
              /* View 2: Table View */
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.9rem' }}>
                  <thead>
                    <tr style={{ borderBottom: '2px solid var(--border)', color: 'var(--ink-soft)' }}>
                      <th style={{ padding: '0.75rem' }}>Course</th>
                      <th style={{ padding: '0.75rem' }}>Type</th>
                      <th style={{ padding: '0.75rem', textAlign: 'center' }}>Present</th>
                      <th style={{ padding: '0.75rem', textAlign: 'center' }}>OD</th>
                      <th style={{ padding: '0.75rem', textAlign: 'center' }}>Makeup</th>
                      <th style={{ padding: '0.75rem', textAlign: 'center' }}>Absent</th>
                      <th style={{ padding: '0.75rem', textAlign: 'center' }}>ERP %</th>
                      <th style={{ padding: '0.75rem', textAlign: 'center' }}>Calculated %</th>
                      <th style={{ padding: '0.75rem' }}>Action Plan</th>
                      <th style={{ padding: '0.75rem', textAlign: 'right' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredAndSortedRecords.length === 0 ? (
                      <tr>
                        <td colSpan={10} style={{ padding: '2rem', textAlign: 'center', color: 'var(--ink-soft)' }}>
                          No subjects match your current filter or search criteria.
                        </td>
                      </tr>
                    ) : (
                      filteredAndSortedRecords.map((r) => {
                        const isShort = r.isShortage;
                        return (
                          <tr
                            key={r._id}
                            style={{
                              borderBottom: '1px solid var(--border)',
                              backgroundColor: isShort ? 'rgba(239, 68, 68, 0.03)' : 'transparent',
                            }}
                          >
                            <td style={{ padding: '0.75rem' }}>
                              <strong>{r.subjectCode}</strong>
                              <div style={{ fontSize: '0.8rem', color: 'var(--ink-soft)' }}>{r.subjectName}</div>
                            </td>
                            <td style={{ padding: '0.75rem' }}>
                              <span className="badge" style={{ fontSize: '0.75rem' }}>{r.subjectType}</span>
                            </td>
                            <td style={{ padding: '0.75rem', textAlign: 'center' }}>{r.present}</td>
                            <td style={{ padding: '0.75rem', textAlign: 'center' }}>{r.od}</td>
                            <td style={{ padding: '0.75rem', textAlign: 'center' }}>{r.makeup}</td>
                            <td style={{ padding: '0.75rem', textAlign: 'center' }}>{r.absent}</td>
                            <td style={{ padding: '0.75rem', textAlign: 'center', fontWeight: 600 }}>
                              {r.erpPercentage}%
                            </td>
                            <td style={{ padding: '0.75rem', textAlign: 'center' }}>
                              <span
                                className={`badge ${isShort ? 'badge-red' : 'badge-green'}`}
                                style={{ fontWeight: 700 }}
                              >
                                {r.calculatedPercentage}%
                              </span>
                              {r.isDiscrepancy && (
                                <span
                                  title={r.discrepancyNote || `ERP reported ${r.erpPercentage}% vs calculated ${r.calculatedPercentage}%.`}
                                  style={{ display: 'block', fontSize: '0.7rem', color: 'var(--gold)', cursor: 'help', marginTop: '0.2rem' }}
                                >
                                  ⚠️ ERP Delta: {r.discrepancyDelta}%
                                </span>
                              )}
                            </td>
                            <td style={{ padding: '0.75rem' }}>
                              {isShort ? (
                                <span style={{ color: 'var(--crimson)', fontWeight: 600 }}>
                                  Need {r.classesNeeded} consecutive {r.classesNeeded === 1 ? 'class' : 'classes'}
                                </span>
                              ) : (
                                <span style={{ color: 'var(--emerald)' }}>
                                  Can miss {r.classesSkippable} {r.classesSkippable === 1 ? 'class' : 'classes'}
                                </span>
                              )}
                            </td>
                            <td style={{ padding: '0.75rem', textAlign: 'right', whiteSpace: 'nowrap' }}>
                              <button
                                onClick={() => setSelectedSubjectDetail(r)}
                                className="btn btn-secondary"
                                style={{ padding: '0.3rem 0.6rem', fontSize: '0.8rem', marginRight: '0.4rem' }}
                                title="Inspect full subject breakdown"
                              >
                                🔍 Details
                              </button>
                              <button
                                onClick={() => handleOpenSimulator(r)}
                                className="btn btn-secondary"
                                style={{ padding: '0.3rem 0.6rem', fontSize: '0.8rem', marginRight: '0.4rem' }}
                                title="Simulate attendance scenario"
                              >
                                🎲 Simulate
                              </button>
                              <button
                                onClick={() => handleStartEdit(r)}
                                className="btn btn-secondary"
                                style={{ padding: '0.3rem 0.6rem', fontSize: '0.8rem', marginRight: '0.4rem' }}
                                title="Edit class counts"
                              >
                                ✏️ Edit
                              </button>
                              <button
                                onClick={() => handleDelete(r._id, r.subjectCode)}
                                className="btn btn-secondary"
                                style={{ padding: '0.3rem 0.6rem', fontSize: '0.8rem', color: 'var(--crimson)' }}
                                title="Delete record"
                              >
                                🗑
                              </button>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}

      {/* Subject Detail View Modal */}
      {selectedSubjectDetail && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '1rem',
          }}
        >
          <div className="card" style={{ maxWidth: '640px', width: '100%', padding: '2rem', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.25rem' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.35rem' }}>
                  <span className={`badge ${selectedSubjectDetail.isShortage ? 'badge-red' : 'badge-green'}`}>
                    {selectedSubjectDetail.isShortage ? 'Shortage Risk' : 'Safe Margin'}
                  </span>
                  <span className="badge">{selectedSubjectDetail.subjectType}</span>
                </div>
                <h3 style={{ fontSize: '1.35rem', color: 'var(--ink)', margin: 0 }}>
                  {selectedSubjectDetail.subjectCode} — {selectedSubjectDetail.subjectName}
                </h3>
              </div>
              <button
                onClick={() => setSelectedSubjectDetail(null)}
                className="btn btn-secondary"
                style={{ padding: '0.25rem 0.6rem' }}
              >
                ✕
              </button>
            </div>

            {/* Attendance Counts Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.75rem', marginBottom: '1.25rem', textAlign: 'center' }}>
              <div style={{ background: 'var(--bg-muted)', padding: '0.75rem', borderRadius: '6px' }}>
                <span style={{ fontSize: '0.7rem', color: 'var(--ink-soft)', display: 'block' }}>PRESENT</span>
                <strong style={{ fontSize: '1.2rem', color: 'var(--ink)' }}>{selectedSubjectDetail.present}</strong>
              </div>
              <div style={{ background: 'var(--bg-muted)', padding: '0.75rem', borderRadius: '6px' }}>
                <span style={{ fontSize: '0.7rem', color: 'var(--ink-soft)', display: 'block' }}>ON DUTY (OD)</span>
                <strong style={{ fontSize: '1.2rem', color: 'var(--ink)' }}>{selectedSubjectDetail.od}</strong>
              </div>
              <div style={{ background: 'var(--bg-muted)', padding: '0.75rem', borderRadius: '6px' }}>
                <span style={{ fontSize: '0.7rem', color: 'var(--ink-soft)', display: 'block' }}>MAKEUP</span>
                <strong style={{ fontSize: '1.2rem', color: 'var(--ink)' }}>{selectedSubjectDetail.makeup}</strong>
              </div>
              <div style={{ background: 'var(--bg-muted)', padding: '0.75rem', borderRadius: '6px' }}>
                <span style={{ fontSize: '0.7rem', color: 'var(--ink-soft)', display: 'block' }}>ABSENT</span>
                <strong style={{ fontSize: '1.2rem', color: 'var(--crimson)' }}>{selectedSubjectDetail.absent}</strong>
              </div>
            </div>

            {/* Calculations Breakdown Card */}
            <div style={{ border: '1px solid var(--border)', borderRadius: '8px', padding: '1rem', marginBottom: '1.25rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', fontSize: '0.85rem' }}>
                <span style={{ color: 'var(--ink-soft)' }}>Total Conducted Classes:</span>
                <strong>{selectedSubjectDetail.totalConducted} classes</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', fontSize: '0.85rem' }}>
                <span style={{ color: 'var(--ink-soft)' }}>Total Attended Classes (P + OD):</span>
                <strong>{selectedSubjectDetail.totalAttended} classes</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', fontSize: '0.85rem', borderTop: '1px solid var(--border)', paddingTop: '0.5rem' }}>
                <span style={{ color: 'var(--ink-soft)' }}>Official ERP Reported %:</span>
                <strong style={{ color: 'var(--ink)' }}>{selectedSubjectDetail.erpPercentage}%</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                <span style={{ color: 'var(--ink-soft)' }}>
                  Policy Calculated % ({CLIENT_POLICY_METADATA[selectedSubjectDetail.policyUsed]?.name}):
                </span>
                <strong style={{ color: selectedSubjectDetail.isShortage ? 'var(--crimson)' : 'var(--emerald)' }}>
                  {selectedSubjectDetail.calculatedPercentage}%
                </strong>
              </div>
            </div>

            {/* Discrepancy Alert */}
            {selectedSubjectDetail.isDiscrepancy && (
              <div style={{ backgroundColor: 'var(--amber-soft)', border: '1px solid var(--amber)', borderRadius: '6px', padding: '0.85rem', marginBottom: '1.25rem' }}>
                <strong style={{ color: 'var(--gold-ink)', fontSize: '0.85rem', display: 'block', marginBottom: '0.25rem' }}>
                  ⚖️ Transparent ERP Discrepancy Notice:
                </strong>
                <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.8rem' }}>
                  {selectedSubjectDetail.discrepancyNote ||
                    `ERP reported ${selectedSubjectDetail.erpPercentage}% while the selected policy derived ${selectedSubjectDetail.calculatedPercentage}%. This is preserved for audit transparency without forcing numbers.`}
                </p>
              </div>
            )}

            {/* Recovery / Safety Guidance */}
            <div style={{ background: selectedSubjectDetail.isShortage ? 'rgba(239, 68, 68, 0.05)' : 'rgba(16, 185, 129, 0.05)', borderRadius: '8px', padding: '1rem', marginBottom: '1.5rem' }}>
              <h4 style={{ margin: '0 0 0.5rem', color: selectedSubjectDetail.isShortage ? 'var(--crimson)' : 'var(--emerald)', fontSize: '0.95rem' }}>
                {selectedSubjectDetail.isShortage ? '🚨 Action Required to Reach 75%' : '✓ Safe Attendance Buffer'}
              </h4>
              <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--ink)' }}>
                {selectedSubjectDetail.isShortage
                  ? `You must attend the next ${selectedSubjectDetail.classesNeeded} consecutive classes without missing any to restore attendance to ${selectedSubjectDetail.threshold || 75}.00%.`
                  : `You can safely miss up to ${selectedSubjectDetail.classesSkippable} upcoming classes before your attendance drops below the ${selectedSubjectDetail.threshold || 75}% threshold.`}
              </p>
            </div>

            {/* Actions */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
              <button
                type="button"
                onClick={() => {
                  const rec = selectedSubjectDetail;
                  setSelectedSubjectDetail(null);
                  handleOpenSimulator(rec);
                }}
                className="btn btn-primary"
              >
                🎲 Open Scenario Simulator
              </button>
              <button
                type="button"
                onClick={() => {
                  const rec = selectedSubjectDetail;
                  setSelectedSubjectDetail(null);
                  handleStartEdit(rec);
                }}
                className="btn btn-secondary"
              >
                ✏️ Edit Counts
              </button>
              <button
                type="button"
                onClick={() => setSelectedSubjectDetail(null)}
                className="btn btn-secondary"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Scenario Simulator Modal */}
      {selectedRecordForSim && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '1rem',
          }}
        >
          <div className="card" style={{ maxWidth: '580px', width: '100%', padding: '2rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <div>
                <span className="badge badge-gold" style={{ marginBottom: '0.25rem' }}>
                  Interactive Projection
                </span>
                <h3 style={{ fontSize: '1.35rem', color: 'var(--ink)' }}>
                  Scenario Simulator: {selectedRecordForSim.subjectCode}
                  {simulating && <span style={{ fontSize: '0.8rem', color: 'var(--ink-soft)', fontWeight: 400, marginLeft: '0.5rem' }}> (Calculating...)</span>}
                </h3>
              </div>
              <button
                onClick={() => {
                  setSelectedRecordForSim(null);
                  setSimulationResult(null);
                }}
                className="btn btn-secondary"
                style={{ padding: '0.25rem 0.6rem' }}
              >
                ✕
              </button>
            </div>

            <p style={{ color: 'var(--ink-soft)', fontSize: '0.85rem', marginBottom: '1.25rem' }}>
              Current state: <strong>{selectedRecordForSim.totalAttended}</strong> attended of{' '}
              <strong>{selectedRecordForSim.totalConducted}</strong> conducted ({selectedRecordForSim.calculatedPercentage}%).
              Target threshold is <strong>{selectedRecordForSim.threshold || 75}%</strong>.
            </p>

            {/* Quick Scenario Buttons */}
            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{ fontSize: '0.85rem', fontWeight: 600, display: 'block', marginBottom: '0.5rem' }}>
                Quick Presets:
              </label>
              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                {[1, 3, 5, 6, 10].map((n) => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => {
                      setSimAttended(n);
                      setSimMissed(0);
                      runSimulation(selectedRecordForSim, n, 0);
                    }}
                    className="btn btn-secondary"
                    style={{ fontSize: '0.8rem', padding: '0.35rem 0.7rem' }}
                  >
                    Attend +{n}
                  </button>
                ))}
                {[1, 2, 3].map((n) => (
                  <button
                    key={`miss-${n}`}
                    type="button"
                    onClick={() => {
                      setSimAttended(0);
                      setSimMissed(n);
                      runSimulation(selectedRecordForSim, 0, n);
                    }}
                    className="btn btn-secondary"
                    style={{ fontSize: '0.8rem', padding: '0.35rem 0.7rem', color: 'var(--crimson)' }}
                  >
                    Miss +{n}
                  </button>
                ))}
              </div>
            </div>

            {/* What-If Interactive Range Sliders & Inputs */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', marginBottom: '1.5rem', backgroundColor: 'var(--surface-muted)', padding: '1.25rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
                  <label style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--ink)' }}>
                    Classes Attended: <strong style={{ color: 'var(--emerald)' }}>+{simAttended}</strong>
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="50"
                    value={simAttended}
                    onChange={(e) => {
                      const val = Math.max(0, parseInt(e.target.value) || 0);
                      setSimAttended(val);
                      runSimulation(selectedRecordForSim, val, simMissed, simThreshold);
                    }}
                    className="input-field"
                    style={{ width: '65px', padding: '0.2rem 0.4rem', fontSize: '0.85rem', textAlign: 'center' }}
                  />
                </div>
                <input
                  type="range"
                  min="0"
                  max="25"
                  step="1"
                  value={simAttended}
                  onChange={(e) => {
                    const val = parseInt(e.target.value) || 0;
                    setSimAttended(val);
                    runSimulation(selectedRecordForSim, val, simMissed, simThreshold);
                  }}
                  style={{ width: '100%', accentColor: 'var(--emerald, #10b981)' }}
                />
              </div>

              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
                  <label style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--ink)' }}>
                    Classes Bunked / Missed: <strong style={{ color: 'var(--crimson)' }}>+{simMissed}</strong>
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="30"
                    value={simMissed}
                    onChange={(e) => {
                      const val = Math.max(0, parseInt(e.target.value) || 0);
                      setSimMissed(val);
                      runSimulation(selectedRecordForSim, simAttended, val, simThreshold);
                    }}
                    className="input-field"
                    style={{ width: '65px', padding: '0.2rem 0.4rem', fontSize: '0.85rem', textAlign: 'center' }}
                  />
                </div>
                <input
                  type="range"
                  min="0"
                  max="20"
                  step="1"
                  value={simMissed}
                  onChange={(e) => {
                    const val = parseInt(e.target.value) || 0;
                    setSimMissed(val);
                    runSimulation(selectedRecordForSim, simAttended, val, simThreshold);
                  }}
                  style={{ width: '100%', accentColor: 'var(--crimson, #ef4444)' }}
                />
              </div>

              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
                  <label style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--ink)' }}>
                    Eligibility Threshold Cutoff: <strong style={{ color: 'var(--brand-gold)' }}>{simThreshold}%</strong>
                  </label>
                  <select
                    value={simThreshold}
                    onChange={(e) => {
                      const val = Number(e.target.value);
                      setSimThreshold(val);
                      runSimulation(selectedRecordForSim, simAttended, simMissed, val);
                    }}
                    className="input-field"
                    style={{ width: '90px', padding: '0.2rem 0.4rem', fontSize: '0.82rem' }}
                  >
                    <option value="60">60%</option>
                    <option value="65">65%</option>
                    <option value="70">70%</option>
                    <option value="75">75% (Std)</option>
                    <option value="80">80%</option>
                    <option value="85">85%</option>
                  </select>
                </div>
                <input
                  type="range"
                  min="60"
                  max="85"
                  step="5"
                  value={simThreshold}
                  onChange={(e) => {
                    const val = Number(e.target.value);
                    setSimThreshold(val);
                    runSimulation(selectedRecordForSim, simAttended, simMissed, val);
                  }}
                  style={{ width: '100%', accentColor: 'var(--brand-gold)' }}
                />
              </div>
            </div>

            {/* Live Instant / Authoritative Projection Card */}
            {(() => {
              const curAtt = selectedRecordForSim.totalAttended;
              const curCond = selectedRecordForSim.totalConducted;
              const projAtt = simulationResult ? simulationResult.projection.projectedAttended : (curAtt + simAttended);
              const projCond = simulationResult ? simulationResult.projection.projectedConducted : (curCond + simAttended + simMissed);
              const projPct = simulationResult
                ? simulationResult.projection.projectedPercentage
                : (projCond > 0 ? Number(((projAtt / projCond) * 100).toFixed(2)) : 0);
              const isSafe = projPct >= simThreshold;
              const needed = simulationResult
                ? simulationResult.projection.classesNeeded
                : (isSafe ? 0 : Math.max(0, Math.ceil((simThreshold * projCond - 100 * projAtt) / (100 - simThreshold))));
              const skippable = simulationResult
                ? simulationResult.projection.classesSkippable
                : (!isSafe ? 0 : Math.max(0, Math.floor((100 * projAtt - simThreshold * projCond) / simThreshold)));

              return (
                <div
                  style={{
                    padding: '1.25rem',
                    borderRadius: 'var(--radius-md)',
                    backgroundColor: isSafe ? 'var(--emerald-soft, rgba(16, 185, 129, 0.08))' : 'var(--crimson-soft, rgba(239, 68, 68, 0.08))',
                    border: `1px solid ${isSafe ? 'var(--emerald, rgba(16, 185, 129, 0.3))' : 'var(--crimson, rgba(239, 68, 68, 0.3))'}`,
                    marginBottom: '1.25rem',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                    <span style={{ fontSize: '0.85rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--ink)' }}>
                      Scenario Projection
                    </span>
                    <span
                      className={`badge ${isSafe ? 'badge-green' : 'badge-red'}`}
                      style={{ fontSize: '0.85rem', fontWeight: 800 }}
                    >
                      {projPct}% ({isSafe ? 'ELIGIBLE / SAFE' : 'SHORTAGE ALERT'})
                    </span>
                  </div>

                  {/* Visual Projected Bar with Threshold Marker */}
                  <div style={{ height: 8, width: '100%', backgroundColor: 'var(--surface-muted)', borderRadius: 4, overflow: 'hidden', position: 'relative', margin: '0.6rem 0' }}>
                    <div
                      style={{
                        height: '100%',
                        width: `${Math.min(100, projPct)}%`,
                        backgroundColor: isSafe ? 'var(--emerald)' : 'var(--crimson)',
                        borderRadius: 4,
                        transition: 'width 0.2s ease',
                      }}
                    />
                    <div
                      style={{
                        position: 'absolute',
                        top: 0,
                        bottom: 0,
                        left: `${simThreshold}%`,
                        width: 2,
                        backgroundColor: 'var(--ink)',
                      }}
                      title={`Target threshold: ${simThreshold}%`}
                    />
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', color: 'var(--ink-soft)' }}>
                    <span>Projected: <strong>{projAtt}</strong> attended of <strong>{projCond}</strong> conducted</span>
                    <span>Cutoff Target: <strong>{simThreshold}%</strong></span>
                  </div>

                  <div style={{ borderTop: '1px solid var(--border)', marginTop: '0.75rem', paddingTop: '0.75rem', fontSize: '0.85rem' }}>
                    {isSafe ? (
                      <div style={{ color: 'var(--emerald)' }}>
                        <strong>🎉 Safe to Bunk:</strong> You can safely miss up to <strong>{skippable} additional {skippable === 1 ? 'class' : 'classes'}</strong> and maintain at least {simThreshold}% eligibility.
                      </div>
                    ) : (
                      <div style={{ color: 'var(--crimson)' }}>
                        <strong>⚠️ Shortage Deficit:</strong> Recovery requires attending <strong>{needed} consecutive {needed === 1 ? 'class' : 'classes'}</strong> without absence to reach {simThreshold}%.
                      </div>
                    )}
                  </div>
                </div>
              );
            })()}

            <div style={{ textAlign: 'right' }}>
              <button
                type="button"
                onClick={() => {
                  setSelectedRecordForSim(null);
                  setSimulationResult(null);
                }}
                className="btn btn-secondary"
              >
                Close Simulator
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Import & Preview Modal */}
      {showImportModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '1rem',
          }}
        >
          <div
            className="card"
            style={{
              maxWidth: '1050px',
              width: '100%',
              maxHeight: '90vh',
              overflowY: 'auto',
              padding: '2rem',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.2), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <div>
                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginBottom: '0.25rem' }}>
                  <span className="badge badge-gold">
                    ERP Data Ingestion
                  </span>
                  <span style={{ fontSize: '0.75rem', color: 'var(--ink-soft)' }}>
                    Data Integrity & Multi-Format Ingestion
                  </span>
                </div>
                <h3 style={{ fontSize: '1.4rem', color: 'var(--ink)', fontWeight: 700, margin: 0 }}>
                  Import University Attendance Report
                </h3>
              </div>
              <button
                onClick={() => setShowImportModal(false)}
                className="btn btn-secondary"
                style={{ padding: '0.35rem 0.75rem', borderRadius: '6px' }}
                aria-label="Close modal"
              >
                ✕
              </button>
            </div>

            {/* Policy Selector */}
            <div style={{ marginBottom: '1.25rem', background: 'var(--bg-muted)', padding: '1rem', borderRadius: '8px', border: '1px solid var(--border)' }}>
              <label style={{ fontSize: '0.85rem', fontWeight: 600, display: 'block', marginBottom: '0.35rem' }}>
                Select Attendance Counting Policy:
              </label>
              <select
                value={selectedPolicy}
                onChange={(e) => setSelectedPolicy(e.target.value as AttendancePolicy)}
                className="input-field"
                style={{ width: '100%', marginBottom: '0.5rem', fontWeight: 500 }}
              >
                {Object.entries(CLIENT_POLICY_METADATA).map(([key, meta]) => (
                  <option key={key} value={key}>
                    {meta.name} — {meta.description}
                  </option>
                ))}
              </select>
              <div style={{ fontSize: '0.78rem', color: 'var(--ink-soft)' }}>
                <strong>Assumption Formula:</strong> <code style={{ backgroundColor: 'var(--bg-surface)', padding: '2px 6px', borderRadius: '4px', border: '1px solid var(--border)' }}>{CLIENT_POLICY_METADATA[selectedPolicy]?.formula}</code>
              </div>
            </div>

            {/* Paste Box or CSV upload */}
            {!previewRows ? (
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                  <div>
                    <label style={{ fontSize: '0.85rem', fontWeight: 600, display: 'block' }}>
                      Paste ERP Rows or Report Content:
                    </label>
                    <div style={{ display: 'flex', gap: '0.4rem', marginTop: '0.25rem' }}>
                      <span style={{ fontSize: '0.7rem', padding: '1px 6px', borderRadius: '4px', background: 'var(--bg-muted)', color: 'var(--text-secondary)', border: '1px solid var(--border)' }}>TSV Tab-Separated</span>
                      <span style={{ fontSize: '0.7rem', padding: '1px 6px', borderRadius: '4px', background: 'var(--bg-muted)', color: 'var(--text-secondary)', border: '1px solid var(--border)' }}>Pipe-Table (|)</span>
                      <span style={{ fontSize: '0.7rem', padding: '1px 6px', borderRadius: '4px', background: 'var(--bg-muted)', color: 'var(--text-secondary)', border: '1px solid var(--border)' }}>CSV File</span>
                      <span style={{ fontSize: '0.7rem', padding: '1px 6px', borderRadius: '4px', background: 'var(--bg-muted)', color: 'var(--text-secondary)', border: '1px solid var(--border)' }}>Space-Delimited</span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setRawText(SAMPLE_ERP_DATA)}
                    className="btn btn-secondary"
                    style={{ fontSize: '0.75rem', padding: '0.3rem 0.6rem', fontWeight: 600 }}
                  >
                    Insert Real Sample ERP Data (11 Subjects)
                  </button>
                </div>
                <textarea
                  rows={9}
                  value={rawText}
                  onChange={(e) => setRawText(e.target.value)}
                  placeholder={`#\tSubject Code\tSubject\tSubject Type\tPresent\tOD\tMakeup\tAbsent\tPercentage\n1\tCEUL560.1\tClimate Change Science\tLecture\t30\t3\t0\t3\t91.67\n2\tCRT\tCampus Recruitment Training\tLab\t58\t0\t0\t14\t80.56\n3\tCSUL501\tDesign and Analysis of Algorithms\tLecture\t26\t1\t0\t11\t71.05\n...`}
                  className="input-field"
                  style={{ width: '100%', fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace', fontSize: '0.8rem', marginBottom: '1rem', lineHeight: 1.5 }}
                />

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
                  <div>
                    <label style={{ fontSize: '0.8rem', color: 'var(--ink-soft)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                      📁 <strong>Or upload file:</strong>
                      <input
                        type="file"
                        accept=".csv,.tsv,.txt"
                        onChange={handleFileUpload}
                        style={{ marginLeft: '0.25rem', fontSize: '0.8rem' }}
                      />
                    </label>
                  </div>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button
                      type="button"
                      onClick={() => setShowImportModal(false)}
                      className="btn btn-secondary"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={handleGeneratePreview}
                      disabled={parsing || !rawText.trim()}
                      className="btn btn-primary"
                    >
                      {parsing ? 'Parsing...' : 'Generate Import Preview ➔'}
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              /* Interactive Editable Preview Table */
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                  <div>
                    <h4 style={{ fontSize: '1.15rem', color: 'var(--ink)', fontWeight: 600, margin: 0 }}>
                      Step 2: Review & Verify Parsed Rows
                    </h4>
                    <p style={{ color: 'var(--ink-soft)', fontSize: '0.8rem', margin: '0.2rem 0 0 0' }}>
                      Check imported counts before writing to database. Cell edits recalculate live.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setPreviewRows(null)}
                    className="btn btn-secondary"
                    style={{ fontSize: '0.8rem', padding: '0.3rem 0.65rem' }}
                  >
                    ← Edit Raw Input
                  </button>
                </div>

                {/* Detected ERP Metadata Banner */}
                {previewMetadata && (
                  <div
                    style={{
                      padding: '0.75rem 1rem',
                      backgroundColor: 'rgba(99, 102, 241, 0.06)',
                      borderRadius: '8px',
                      marginBottom: '1rem',
                      border: '1px solid rgba(99, 102, 241, 0.2)',
                      fontSize: '0.82rem',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
                      <div>
                        <strong>🏛️ ERP Aggregate:</strong> {previewMetadata.erpAggregatePercentage ?? 80.1}% &bull;{' '}
                        <strong>Total University ODs:</strong> {previewMetadata.overallOdCount ?? 17}
                      </div>
                      {previewMetadata.eventAttendance && (
                        <div style={{ color: 'var(--ink-soft)' }}>
                          <strong>Event ({previewMetadata.eventAttendance.eventName}):</strong> {previewMetadata.eventAttendance.presentHours} Present hrs / {previewMetadata.eventAttendance.absentHours} Absent hrs ({previewMetadata.eventAttendance.totalHours} Total hrs)
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Import Summary Ribbon */}
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
                    gap: '0.75rem',
                    marginBottom: '1rem',
                    padding: '0.75rem 1rem',
                    backgroundColor: 'var(--bg-muted)',
                    borderRadius: '8px',
                    border: '1px solid var(--border)',
                  }}
                >
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '0.7rem', color: 'var(--ink-soft)', textTransform: 'uppercase', fontWeight: 600 }}>Total Detected</div>
                    <div style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--ink)' }}>{previewStats?.totalRows ?? previewRows.length}</div>
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '0.7rem', color: 'var(--ink-soft)', textTransform: 'uppercase', fontWeight: 600 }}>Ready to Import</div>
                    <div style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--emerald)' }}>{previewRows.filter(r => r.isValid).length}</div>
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '0.7rem', color: 'var(--ink-soft)', textTransform: 'uppercase', fontWeight: 600 }}>Changed Rows</div>
                    <div style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--accent-primary)' }}>
                      {previewStats?.changedRows ?? previewRows.filter(r => r.isChanged).length}
                    </div>
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '0.7rem', color: 'var(--ink-soft)', textTransform: 'uppercase', fontWeight: 600 }}>Discrepancies</div>
                    <div style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--gold)' }}>
                      {previewRows.filter(r => r.isDiscrepancy).length}
                    </div>
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '0.7rem', color: 'var(--ink-soft)', textTransform: 'uppercase', fontWeight: 600 }}>Invalid Rows</div>
                    <div style={{ fontSize: '1.25rem', fontWeight: 700, color: previewRows.some(r => !r.isValid) ? 'var(--crimson)' : 'var(--ink-soft)' }}>
                      {previewRows.filter(r => !r.isValid).length}
                    </div>
                  </div>
                  {(previewStats?.duplicateRows ?? 0) > 0 && (
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: '0.7rem', color: 'var(--ink-soft)', textTransform: 'uppercase', fontWeight: 600 }}>Duplicates</div>
                      <div style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--accent-primary)' }}>{previewStats?.duplicateRows}</div>
                    </div>
                  )}
                </div>

                {previewErrors.length > 0 && (
                  <div style={{ padding: '0.75rem', backgroundColor: 'var(--red-soft)', color: 'var(--crimson)', borderRadius: '6px', marginBottom: '1rem', fontSize: '0.8rem' }}>
                    ⚠️ {previewErrors.join(', ')}
                  </div>
                )}

                <div style={{ overflowX: 'auto', marginBottom: '1.25rem', border: '1px solid var(--border)', borderRadius: '6px' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                    <thead>
                      <tr style={{ backgroundColor: 'var(--bg-muted)', borderBottom: '2px solid var(--border)', textAlign: 'left' }}>
                        <th style={{ padding: '0.6rem 0.5rem', fontWeight: 600 }}>Code</th>
                        <th style={{ padding: '0.6rem 0.5rem', fontWeight: 600 }}>Subject Name</th>
                        <th style={{ padding: '0.6rem 0.5rem', fontWeight: 600 }}>Type</th>
                        <th style={{ padding: '0.6rem 0.5rem', width: '65px', textAlign: 'center', fontWeight: 600 }}>Present</th>
                        <th style={{ padding: '0.6rem 0.5rem', width: '55px', textAlign: 'center', fontWeight: 600 }}>OD</th>
                        <th style={{ padding: '0.6rem 0.5rem', width: '55px', textAlign: 'center', fontWeight: 600 }}>Makeup</th>
                        <th style={{ padding: '0.6rem 0.5rem', width: '55px', textAlign: 'center', fontWeight: 600 }}>Absent</th>
                        <th style={{ padding: '0.6rem 0.5rem', width: '70px', textAlign: 'center', fontWeight: 600 }}>ERP %</th>
                        <th style={{ padding: '0.6rem 0.5rem', width: '70px', textAlign: 'center', fontWeight: 600 }}>Calc %</th>
                        <th style={{ padding: '0.6rem 0.5rem', fontWeight: 600 }}>Status / Discrepancy</th>
                      </tr>
                    </thead>
                    <tbody>
                      {previewRows.map((row, idx) => (
                        <tr
                          key={idx}
                          style={{
                            borderBottom: '1px solid var(--border)',
                            backgroundColor: !row.isValid
                              ? 'rgba(239,68,68,0.06)'
                              : row.isChanged
                              ? 'rgba(59, 130, 246, 0.05)'
                              : row.isDiscrepancy
                              ? 'rgba(245, 158, 11, 0.05)'
                              : 'transparent',
                          }}
                        >
                          <td style={{ padding: '0.5rem', fontWeight: 600, fontFamily: 'monospace' }}>{row.subjectCode}</td>
                          <td style={{ padding: '0.5rem' }}>
                            <div style={{ fontWeight: 500 }}>{row.subjectName}</div>
                            {row.matchedSubjectId && (
                              <span className="badge badge-green" style={{ fontSize: '0.65rem', marginTop: '2px', display: 'inline-block' }}>
                                Linked to Subject
                              </span>
                            )}
                          </td>
                          <td style={{ padding: '0.5rem', fontSize: '0.78rem', color: 'var(--ink-soft)' }}>
                            {row.subjectType}
                          </td>
                          <td style={{ padding: '0.5rem', textAlign: 'center' }}>
                            <input
                              type="number"
                              min="0"
                              value={row.present}
                              onChange={(e) => handlePreviewCellChange(idx, 'present', parseInt(e.target.value) || 0)}
                              style={{ width: '50px', padding: '0.2rem', textAlign: 'center', borderRadius: '4px', border: '1px solid var(--border)' }}
                            />
                          </td>
                          <td style={{ padding: '0.5rem', textAlign: 'center' }}>
                            <input
                              type="number"
                              min="0"
                              value={row.od}
                              onChange={(e) => handlePreviewCellChange(idx, 'od', parseInt(e.target.value) || 0)}
                              style={{ width: '45px', padding: '0.2rem', textAlign: 'center', borderRadius: '4px', border: '1px solid var(--border)' }}
                            />
                          </td>
                          <td style={{ padding: '0.5rem', textAlign: 'center' }}>
                            <input
                              type="number"
                              min="0"
                              value={row.makeup}
                              onChange={(e) => handlePreviewCellChange(idx, 'makeup', parseInt(e.target.value) || 0)}
                              style={{ width: '45px', padding: '0.2rem', textAlign: 'center', borderRadius: '4px', border: '1px solid var(--border)' }}
                            />
                          </td>
                          <td style={{ padding: '0.5rem', textAlign: 'center' }}>
                            <input
                              type="number"
                              min="0"
                              value={row.absent}
                              onChange={(e) => handlePreviewCellChange(idx, 'absent', parseInt(e.target.value) || 0)}
                              style={{ width: '45px', padding: '0.2rem', textAlign: 'center', borderRadius: '4px', border: '1px solid var(--border)' }}
                            />
                          </td>
                          <td style={{ padding: '0.5rem', textAlign: 'center', fontWeight: 600 }}>
                            {row.erpPercentage !== null ? `${row.erpPercentage}%` : '—'}
                          </td>
                          <td style={{ padding: '0.5rem', textAlign: 'center', fontWeight: 700, color: row.calculatedPercentage < 75 ? 'var(--crimson)' : 'var(--emerald)' }}>
                            {row.calculatedPercentage}%
                          </td>
                          <td style={{ padding: '0.5rem' }}>
                            {!row.isValid ? (
                              <span style={{ color: 'var(--crimson)', fontSize: '0.75rem', fontWeight: 600 }}>⚠️ {row.error}</span>
                            ) : (
                              <div>
                                {row.isChanged && (
                                  <div
                                    style={{
                                      backgroundColor: 'var(--blue-soft)',
                                      color: 'var(--blue)',
                                      fontSize: '0.7rem',
                                      fontWeight: 600,
                                      padding: '2px 6px',
                                      borderRadius: '4px',
                                      marginBottom: '3px',
                                      display: 'inline-block',
                                    }}
                                  >
                                    🔄 Updated (was Absent: {row.oldValues?.absent}, ERP: {row.oldValues?.erpPercentage}%)
                                  </div>
                                )}
                                {row.isNew && (
                                  <div
                                    style={{
                                      backgroundColor: 'var(--accent-primary-soft)',
                                      color: 'var(--accent-primary)',
                                      fontSize: '0.7rem',
                                      fontWeight: 600,
                                      padding: '2px 6px',
                                      borderRadius: '4px',
                                      marginBottom: '3px',
                                      display: 'inline-block',
                                    }}
                                  >
                                    ✨ New Subject
                                  </div>
                                )}
                                {row.isDiscrepancy ? (
                                  <div>
                                    <span style={{ color: 'var(--gold)', fontSize: '0.75rem', fontWeight: 600, display: 'block' }}>
                                      ⚠️ Delta: {row.discrepancyDelta}%
                                    </span>
                                    {row.discrepancyNote && (
                                      <span style={{ fontSize: '0.7rem', color: 'var(--ink-soft)', lineHeight: 1.2, display: 'block', maxWidth: '200px' }}>
                                        {row.discrepancyNote}
                                      </span>
                                    )}
                                  </div>
                                ) : (
                                  !row.isChanged && !row.isNew && (
                                    <span style={{ color: 'var(--emerald)', fontSize: '0.75rem', fontWeight: 600 }}>✅ Valid (Unchanged)</span>
                                  )
                                )}
                              </div>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
                  <div style={{ fontSize: '0.8rem', color: 'var(--ink-soft)' }}>
                    Re-importing will update existing subjects for your student account without creating duplicate entries.
                  </div>
                  <div style={{ display: 'flex', gap: '0.75rem' }}>
                    <button
                      type="button"
                      onClick={() => setShowImportModal(false)}
                      className="btn btn-secondary"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={handleConfirmImport}
                      disabled={importing || previewRows.filter((r) => r.isValid).length === 0}
                      className="btn btn-primary"
                      style={{ minWidth: '220px' }}
                    >
                      {importing ? 'Saving to Database...' : `Confirm & Save ${previewRows.filter((r) => r.isValid).length} Records`}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Edit Record Modal */}
      {editingRecord && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '1rem',
          }}
        >
          <div className="card" style={{ maxWidth: '440px', width: '100%', padding: '2rem' }}>
            <h3 style={{ fontSize: '1.25rem', marginBottom: '0.5rem', color: 'var(--ink)' }}>
              Edit Attendance: {editingRecord.subjectCode}
            </h3>
            <p style={{ color: 'var(--ink-soft)', fontSize: '0.85rem', marginBottom: '1.25rem' }}>
              {editingRecord.subjectName}
            </p>

            <form onSubmit={handleSaveEdit}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '1rem' }}>
                <div>
                  <label style={{ fontSize: '0.8rem', fontWeight: 600 }}>Present:</label>
                  <input
                    type="number"
                    min="0"
                    value={editForm.present}
                    onChange={(e) => setEditForm({ ...editForm, present: parseInt(e.target.value) || 0 })}
                    className="input-field"
                    style={{ width: '100%' }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '0.8rem', fontWeight: 600 }}>On Duty (OD):</label>
                  <input
                    type="number"
                    min="0"
                    value={editForm.od}
                    onChange={(e) => setEditForm({ ...editForm, od: parseInt(e.target.value) || 0 })}
                    className="input-field"
                    style={{ width: '100%' }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '0.8rem', fontWeight: 600 }}>Makeup:</label>
                  <input
                    type="number"
                    min="0"
                    value={editForm.makeup}
                    onChange={(e) => setEditForm({ ...editForm, makeup: parseInt(e.target.value) || 0 })}
                    className="input-field"
                    style={{ width: '100%' }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '0.8rem', fontWeight: 600 }}>Absent:</label>
                  <input
                    type="number"
                    min="0"
                    value={editForm.absent}
                    onChange={(e) => setEditForm({ ...editForm, absent: parseInt(e.target.value) || 0 })}
                    className="input-field"
                    style={{ width: '100%' }}
                  />
                </div>
              </div>

              <div style={{ marginBottom: '1.25rem' }}>
                <label style={{ fontSize: '0.8rem', fontWeight: 600 }}>Threshold Goal (%):</label>
                <input
                  type="number"
                  min="50"
                  max="100"
                  value={editForm.threshold}
                  onChange={(e) => setEditForm({ ...editForm, threshold: parseInt(e.target.value) || 75 })}
                  className="input-field"
                  style={{ width: '100%' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                <button
                  type="button"
                  onClick={() => setEditingRecord(null)}
                  className="btn btn-secondary"
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Academic Disclaimer Footer */}
      <div style={{ marginTop: '3rem', padding: '1rem', borderTop: '1px solid var(--border)', color: 'var(--ink-soft)', fontSize: '0.8rem' }}>
        <p>
          <strong>Academic Transparency Note:</strong> Attendance calculations and consecutive recovery projections
          are mathematical forecasts based on the data imported from your university ERP report and your configured threshold (75%).
          Actual exam eligibility rules may involve medical certificates, laboratory minimums, or departmental discretion.
        </p>
      </div>
    </div>
  );
}
