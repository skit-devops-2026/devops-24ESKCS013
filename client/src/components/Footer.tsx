export function Footer() {
  return (
    <footer className="footer">
      <div className="container" style={{ textAlign: 'center' }}>
        <p>
          <strong>Student Hub</strong> — Academic Management Platform &copy;{' '}
          {new Date().getFullYear()}
        </p>
      </div>
    </footer>
  );
}
