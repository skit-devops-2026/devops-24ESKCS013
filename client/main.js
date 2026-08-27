/**
 * Main JavaScript entry point for the Vanilla JS Nexus Portal
 */

document.addEventListener('DOMContentLoaded', () => {
  // Select DOM Elements
  const studentLoginBtn = document.getElementById('student-login-btn');
  const adminLoginBtn = document.getElementById('admin-login-btn');
  const loginModal = document.getElementById('login-modal');
  const closeModalBtn = document.getElementById('close-modal');
  const loginForm = document.getElementById('login-form');
  const modalTitle = document.getElementById('modal-title');
  const modalSubtitle = document.getElementById('modal-subtitle');

  // State to track which portal is open (student or admin)
  let currentLoginType = '';

  /**
   * Opens the login modal and configures text based on login type
   * @param {string} type - 'Student' or 'Admin'
   */
  const openModal = (type) => {
    currentLoginType = type;
    modalTitle.textContent = `${type} Portal`;
    modalSubtitle.textContent = `Sign in to your ${type.toLowerCase()} account`;
    
    // Clear previous inputs
    loginForm.reset();
    
    // Show modal
    loginModal.classList.remove('hidden');
    
    // Focus the first input
    setTimeout(() => {
      document.getElementById('email').focus();
    }, 100);
  };

  /**
   * Closes the login modal
   */
  const closeModal = () => {
    loginModal.classList.add('hidden');
    currentLoginType = '';
  };

  // Event Listeners for Buttons
  studentLoginBtn.addEventListener('click', () => openModal('Student'));
  adminLoginBtn.addEventListener('click', () => openModal('Admin'));

  // Event Listeners for Closing Modal
  closeModalBtn.addEventListener('click', closeModal);
  
  // Close modal when clicking on the dark overlay outside the modal content
  loginModal.addEventListener('click', (e) => {
    if (e.target === loginModal) {
      closeModal();
    }
  });

  // Handle Form Submission
  loginForm.addEventListener('submit', (e) => {
    // Prevent actual form submission since we have no backend integration yet
    e.preventDefault();
    
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    
    // In a real app, you would send a fetch() request here
    console.log(`[${currentLoginType} Login Attempt] Email: ${email}`);
    
    // Simulate successful login
    const submitBtn = loginForm.querySelector('button[type="submit"]');
    const originalText = submitBtn.textContent;
    
    submitBtn.textContent = 'Authenticating...';
    submitBtn.disabled = true;
    
    setTimeout(() => {
      submitBtn.textContent = 'Success!';
      submitBtn.style.backgroundColor = '#22c55e'; // green
      submitBtn.style.color = '#fff';
      
      setTimeout(() => {
        closeModal();
        // Reset button
        submitBtn.textContent = originalText;
        submitBtn.style.backgroundColor = '';
        submitBtn.style.color = '';
        submitBtn.disabled = false;
        alert(`Successfully logged in as ${currentLoginType}!`);
      }, 1000);
    }, 1500);
  });
});
