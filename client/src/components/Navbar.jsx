export default function Navbar() {
  return (
    <nav className="navbar fade-in">
      <div className="logo">
        <div className="logo-mark">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2L2 22h20L12 2z"/></svg>
        </div>
        <span className="logo-text">NEXUS</span>
      </div>
      <div className="nav-links">
        <a href="#" className="nav-link" data-text="SYSTEM">SYSTEM</a>
        <a href="#" className="nav-link" data-text="MODULES">MODULES</a>
        <a href="#" className="nav-link" data-text="SYNC">SYNC</a>
      </div>
    </nav>
  );
}
