document.addEventListener('DOMContentLoaded', () => {
  // Cursor tracking for background glow
  const cursorGlow = document.getElementById('cursor-glow');
  
  document.addEventListener('mousemove', (e) => {
    if (cursorGlow) {
      cursorGlow.style.left = `${e.clientX}px`;
      cursorGlow.style.top = `${e.clientY}px`;
    }
  });

  // Modal Logic
  const studentLoginBtn = document.getElementById('student-login-btn');
  const adminLoginBtn = document.getElementById('admin-login-btn');
  const loginModal = document.getElementById('login-modal');
  const closeModalBtn = document.getElementById('close-modal');
  const modalBackdrop = document.querySelector('.modal-backdrop');
  const loginForm = document.getElementById('login-form');
  const modalTitle = document.getElementById('modal-title');
  
  // Custom button text colors for different modes
  const themeColors = {
    'STUDENT': '#00f0ff',
    'ADMIN': '#ff0055'
  };

  let currentMode = '';

  const openModal = (mode) => {
    currentMode = mode;
    modalTitle.innerHTML = `${mode} <span style="color: ${themeColors[mode]}">ACCESS</span>`;
    
    // Change button color based on mode
    const submitBtn = document.querySelector('.btn-submit');
    submitBtn.style.setProperty('--accent-tertiary', themeColors[mode]);
    
    loginForm.reset();
    loginModal.classList.remove('hidden');
    setTimeout(() => {
      document.getElementById('email').focus();
    }, 400); // Wait for animation
  };

  const closeModal = () => {
    loginModal.classList.add('hidden');
  };

  studentLoginBtn.addEventListener('click', () => openModal('STUDENT'));
  adminLoginBtn.addEventListener('click', () => openModal('ADMIN'));
  closeModalBtn.addEventListener('click', closeModal);
  modalBackdrop.addEventListener('click', closeModal);

  // Form submission with hyper-modern aesthetic feedback
  loginForm.addEventListener('submit', (e) => {
    e.preventDefault();
    
    const submitBtn = loginForm.querySelector('button[type="submit"]');
    const btnContent = submitBtn.querySelector('.btn-content');
    const originalText = btnContent.textContent;
    
    // Glitchy auth effect
    let glitchCount = 0;
    const glitchInterval = setInterval(() => {
      btnContent.textContent = Math.random().toString(36).substring(2, 10).toUpperCase();
      glitchCount++;
      if (glitchCount > 10) {
        clearInterval(glitchInterval);
        btnContent.textContent = 'ACCESS GRANTED';
        submitBtn.style.setProperty('--accent-tertiary', '#00ffaa'); // Green success
        
        setTimeout(() => {
          closeModal();
          // Reset after close
          setTimeout(() => {
            btnContent.textContent = originalText;
            submitBtn.style.setProperty('--accent-tertiary', themeColors[currentMode]);
          }, 500);
        }, 1000);
      }
    }, 50);
  });
});
