export default function Hero({ onOpenModal }) {
  return (
    <main className="hero">
      <div className="hero-content">
        <div className="badge fade-in-up" style={{ animationDelay: '0.1s' }}>
          <span className="badge-dot"></span> v3.0 ONLINE
        </div>
        <h1 className="hero-title fade-in-up" style={{ animationDelay: '0.2s' }}>
          <span className="title-line">TRANSCEND</span>
          <span className="title-line gradient-text">YOUR LIMITS</span>
        </h1>
        <p className="hero-subtitle fade-in-up" style={{ animationDelay: '0.3s' }}>
          Enter the neural network of modern education. Connect, analyze, and evolve with real-time academic synthesis.
        </p>
        
        <div className="action-buttons fade-in-up" style={{ animationDelay: '0.4s' }}>
          <button onClick={() => onOpenModal('STUDENT')} className="btn btn-primary cyber-btn">
            <span className="btn-content">INITIALIZE STUDENT</span>
            <span className="btn-glitch"></span>
          </button>
          <button onClick={() => onOpenModal('ADMIN')} className="btn btn-secondary cyber-btn">
            <span className="btn-content">OVERRIDE ADMIN</span>
            <span className="btn-glitch"></span>
          </button>
        </div>
      </div>
      
      <div className="hero-visual fade-in" style={{ animationDelay: '0.5s' }}>
        <div className="holo-card">
          <div className="holo-ring outer"></div>
          <div className="holo-ring inner"></div>
          <div className="holo-core">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="0.5"><polygon points="12 2 22 8.5 22 15.5 12 22 2 15.5 2 8.5 12 2"/></svg>
          </div>
          <div className="floating-data d1">SYNC: 99.9%</div>
          <div className="floating-data d2">NODE: ACTIVE</div>
        </div>
      </div>
    </main>
  );
}
