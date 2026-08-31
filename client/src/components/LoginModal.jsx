import { useState, useRef, useEffect } from 'react';
import { checkHealth } from '../services/api';

const THEME_COLORS = {
  'STUDENT': '#00f0ff',
  'ADMIN': '#ff0055'
};

export default function LoginModal({ mode, isOpen, onClose }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [btnText, setBtnText] = useState('AUTHENTICATE');
  const [btnColor, setBtnColor] = useState('');
  
  const emailInputRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      setBtnText('AUTHENTICATE');
      setBtnColor(THEME_COLORS[mode] || '');
      setEmail('');
      setPassword('');
      // Focus email after small delay for animation
      setTimeout(() => {
        emailInputRef.current?.focus();
      }, 400);
    }
  }, [isOpen, mode]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Glitchy auth effect
    let glitchCount = 0;
    const originalText = 'AUTHENTICATE';
    
    const glitchInterval = setInterval(() => {
      setBtnText(Math.random().toString(36).substring(2, 10).toUpperCase());
      glitchCount++;
      if (glitchCount > 10) {
        clearInterval(glitchInterval);
        
        // After glitch, hit the health check endpoint to prove backend connection
        checkHealth().then(res => {
          console.log('Backend response:', res);
          setBtnText('ACCESS GRANTED');
          setBtnColor('#00ffaa'); // Green success
          
          setTimeout(() => {
            onClose();
            setTimeout(() => {
              setBtnText(originalText);
              setBtnColor(THEME_COLORS[mode]);
            }, 500);
          }, 1000);
        }).catch(err => {
          console.error('Backend connection failed:', err);
          setBtnText('CONNECTION FAILED');
          setBtnColor('#ff0000');
          setTimeout(() => {
            setBtnText(originalText);
            setBtnColor(THEME_COLORS[mode]);
          }, 2000);
        });
      }
    }, 50);
  };

  return (
    <div className={`modal-overlay ${!isOpen ? 'hidden' : ''}`}>
      <div className="modal-backdrop" onClick={onClose}></div>
      <div className="modal-content glass-panel">
        <button className="modal-close" onClick={onClose}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
        </button>
        
        <div className="modal-header">
          <div className="modal-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
          </div>
          <h2 className="gradient-text">
            {mode} <span style={{ color: THEME_COLORS[mode] }}>ACCESS</span>
          </h2>
          <p className="mono-text">AWAITING CREDENTIALS...</p>
        </div>
        
        <form className="login-form" onSubmit={handleSubmit}>
          <div className="input-group">
            <input 
              type="email" 
              id="email" 
              required 
              placeholder=" " 
              ref={emailInputRef}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <label htmlFor="email">IDENTIFIER (EMAIL)</label>
            <div className="input-line"></div>
          </div>
          <div className="input-group">
            <input 
              type="password" 
              id="password" 
              required 
              placeholder=" " 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <label htmlFor="password">SECURITY KEY</label>
            <div className="input-line"></div>
          </div>
          <button 
            type="submit" 
            className="btn btn-submit cyber-btn full-width"
            style={{ '--accent-tertiary': btnColor }}
          >
            <span className="btn-content">{btnText}</span>
            <span className="btn-glitch"></span>
          </button>
        </form>
      </div>
    </div>
  );
}
