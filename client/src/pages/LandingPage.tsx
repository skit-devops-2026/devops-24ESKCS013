import { BookOpen, Clock, CheckSquare, Shield } from 'lucide-react';

export function LandingPage() {
  return (
    <div>
      {/* Hero Section */}
      <section style={{ padding: '4.5rem 0 3rem', background: 'linear-gradient(180deg, #FFFFFF 0%, var(--paper) 100%)', borderBottom: '1px solid var(--rule)' }}>
        <div className="container" style={{ textAlign: 'center', maxWidth: '820px' }}>
          <span className="badge badge-gold" style={{ marginBottom: '1.25rem' }}>
            Next-Gen Academic Management
          </span>
          <h1 style={{ fontSize: '3rem', lineHeight: 1.15, marginBottom: '1.25rem', color: 'var(--ink)' }}>
            Elevate Your Academic Journey with <span style={{ color: 'var(--gold-ink)' }}>Student Hub</span>
          </h1>
          <p style={{ fontSize: '1.15rem', color: 'var(--ink-soft)', lineHeight: 1.6, marginBottom: '2rem' }}>
            A unified academic management platform built for university students to track subjects, manage tasks, record lecture notes, and assess semester progress with integrated attendance intelligence.
          </p>
          <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
            <a href="/login" className="btn btn-primary" style={{ padding: '0.75rem 1.75rem', fontSize: '1rem' }}>
              Access Student Portal
            </a>
            <a href="#features" className="btn btn-secondary" style={{ padding: '0.75rem 1.75rem', fontSize: '1rem' }}>
              Explore Features
            </a>
          </div>
        </div>
      </section>

      {/* Feature Grid */}
      <section id="features" style={{ padding: '4rem 0 5rem' }}>
        <div className="container">
          <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
            <h2 style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>Architected for Academic Excellence</h2>
            <p style={{ color: 'var(--ink-soft)' }}>
              Empowering student success with real-time academic tracking, focus tools, and attendance intelligence.
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem' }}>
            <div className="card">
              <div style={{ color: 'var(--brand-gold)', marginBottom: '0.75rem' }}>
                <BookOpen size={28} />
              </div>
              <h3 style={{ fontSize: '1.2rem', marginBottom: '0.5rem' }}>Curriculum &amp; Subjects</h3>
              <p style={{ color: 'var(--ink-soft)', fontSize: '0.9rem' }}>
                Track course codes, assigned professors, credit hours, and syllabus milestones in real-time.
              </p>
            </div>

            <div className="card">
              <div style={{ color: 'var(--brand-gold)', marginBottom: '0.75rem' }}>
                <Clock size={28} />
              </div>
              <h3 style={{ fontSize: '1.2rem', marginBottom: '0.5rem' }}>Study Tracker &amp; Timer</h3>
              <p style={{ color: 'var(--ink-soft)', fontSize: '0.9rem' }}>
                Structured Pomodoro focus sessions with subject duration logging and weekly trend analytics.
              </p>
            </div>

            <div className="card">
              <div style={{ color: 'var(--brand-gold)', marginBottom: '0.75rem' }}>
                <CheckSquare size={28} />
              </div>
              <h3 style={{ fontSize: '1.2rem', marginBottom: '0.5rem' }}>Notes &amp; Task Kanban</h3>
              <p style={{ color: 'var(--ink-soft)', fontSize: '0.9rem' }}>
                Markdown lecture note editor and priority task boards with status workflows.
              </p>
            </div>

            <div className="card">
              <div style={{ color: 'var(--brand-gold)', marginBottom: '0.75rem' }}>
                <Shield size={28} />
              </div>
              <h3 style={{ fontSize: '1.2rem', marginBottom: '0.5rem' }}>Administrative Oversight</h3>
              <p style={{ color: 'var(--ink-soft)', fontSize: '0.9rem' }}>
                Role-based controls for student registry, resource uploads, institutional announcements, and analytics.
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
