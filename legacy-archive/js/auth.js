

document.addEventListener('DOMContentLoaded', () => {

  const eyeIcon = `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>`;
  const eyeOffIcon = `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18" /></svg>`;

  document.querySelectorAll('.password-toggle-btn').forEach(btn => {
    btn.innerHTML = eyeIcon;
    btn.addEventListener('click', () => {
      const targetId = btn.getAttribute('data-target');
      const input = document.getElementById(targetId);
      if (!input) return;

      const isPassword = input.type === 'password';
      input.type = isPassword ? 'text' : 'password';
      btn.innerHTML = isPassword ? eyeOffIcon : eyeIcon;
      btn.setAttribute('aria-label', isPassword ? 'Hide password' : 'Show password');
    });
  });

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  function setFieldError(input, errorEl, message) {
    if (!input || !errorEl) return;
    if (message) {
      input.classList.add('is-invalid');
      input.classList.remove('is-valid');
      errorEl.textContent = message;
      errorEl.classList.add('visible');
    } else {
      input.classList.remove('is-invalid');
      input.classList.add('is-valid');
      errorEl.textContent = '';
      errorEl.classList.remove('visible');
    }
  }

  function setButtonLoading(btn, isLoading, defaultText = 'Submit') {
    if (!btn) return;
    const textSpan = btn.querySelector('.btn-text');
    if (isLoading) {
      btn.classList.add('is-loading');
      btn.disabled = true;
      if (textSpan) textSpan.textContent = 'Authenticating…';
    } else {
      btn.classList.remove('is-loading');
      btn.disabled = false;
      if (textSpan) textSpan.textContent = defaultText;
    }
  }

  const studentLoginForm = document.getElementById('student-login-form');
  if (studentLoginForm) {
    const emailInput = document.getElementById('login-email');
    const emailError = document.getElementById('email-error');
    const pwInput = document.getElementById('login-password');
    const pwError = document.getElementById('password-error');
    const submitBtn = studentLoginForm.querySelector('button[type="submit"]');

    if (emailInput && emailError) {
      const validateEmail = () => {
        const val = emailInput.value.trim();
        if (!val) {
          setFieldError(emailInput, emailError, 'Email address is required.');
          return false;
        }
        if (!emailRegex.test(val)) {
          setFieldError(emailInput, emailError, 'Please enter a valid email address.');
          return false;
        }
        setFieldError(emailInput, emailError, '');
        return true;
      };
      emailInput.addEventListener('blur', validateEmail);
      emailInput.addEventListener('input', () => {
        if (emailInput.classList.contains('is-invalid')) validateEmail();
      });
    }

    if (pwInput && pwError) {
      const validatePw = () => {
        const val = pwInput.value;
        if (!val) {
          setFieldError(pwInput, pwError, 'Password is required.');
          return false;
        }
        setFieldError(pwInput, pwError, '');
        return true;
      };
      pwInput.addEventListener('blur', validatePw);
      pwInput.addEventListener('input', () => {
        if (pwInput.classList.contains('is-invalid')) validatePw();
      });
    }

    studentLoginForm.addEventListener('submit', e => {
      e.preventDefault();
      const email = emailInput ? emailInput.value.trim() : '';
      const password = pwInput ? pwInput.value : '';

      let isValid = true;
      if (!email || !emailRegex.test(email)) {
        setFieldError(emailInput, emailError, 'Please enter a valid email address.');
        isValid = false;
      }
      if (!password) {
        setFieldError(pwInput, pwError, 'Password is required.');
        isValid = false;
      }

      if (!isValid) {
        S360.toast('Please correct the errors above.', 'error');
        return;
      }

      setButtonLoading(submitBtn, true, 'Sign In');

      setTimeout(() => {
        const mockStudent = { id: 'stu-001', name: 'Jane Doe', role: 'student', email };
        S360.setSession(mockStudent);
        S360.toast('Welcome back, ' + mockStudent.name + '!', 'success');
        setTimeout(() => {
          window.location.href = '../student/dashboard.html';
        }, 500);
      }, 750);
    });
  }

  const studentRegisterForm = document.getElementById('student-register-form');
  if (studentRegisterForm) {
    const nameInput = document.getElementById('reg-name');
    const nameError = document.getElementById('name-error');
    const emailInput = document.getElementById('reg-email');
    const emailError = document.getElementById('email-error');
    const courseSelect = document.getElementById('reg-course');
    const courseError = document.getElementById('course-error');
    const pwInput = document.getElementById('reg-password');
    const pwError = document.getElementById('password-error');
    const confirmInput = document.getElementById('reg-confirm-password');
    const confirmError = document.getElementById('confirm-error');
    const strengthBar = document.getElementById('pw-strength-bar');
    const submitBtn = studentRegisterForm.querySelector('button[type="submit"]');

    if (nameInput && nameError) {
      nameInput.addEventListener('blur', () => {
        const val = nameInput.value.trim();
        if (!val || val.length < 2) {
          setFieldError(nameInput, nameError, 'Full name must be at least 2 characters.');
        } else {
          setFieldError(nameInput, nameError, '');
        }
      });
      nameInput.addEventListener('input', () => {
        if (nameInput.classList.contains('is-invalid')) {
          const val = nameInput.value.trim();
          if (val.length >= 2) setFieldError(nameInput, nameError, '');
        }
      });
    }

    if (emailInput && emailError) {
      emailInput.addEventListener('blur', () => {
        const val = emailInput.value.trim();
        if (!val || !emailRegex.test(val)) {
          setFieldError(emailInput, emailError, 'Please enter a valid email address.');
        } else {
          setFieldError(emailInput, emailError, '');
        }
      });
      emailInput.addEventListener('input', () => {
        if (emailInput.classList.contains('is-invalid') && emailRegex.test(emailInput.value.trim())) {
          setFieldError(emailInput, emailError, '');
        }
      });
    }

    if (courseSelect && courseError) {
      courseSelect.addEventListener('change', () => {
        if (!courseSelect.value) {
          setFieldError(courseSelect, courseError, 'Please select your programme.');
        } else {
          setFieldError(courseSelect, courseError, '');
        }
      });
    }

    if (pwInput) {
      pwInput.addEventListener('input', () => {
        const len = pwInput.value.length;
        let pct = 0, color = 'var(--red)';
        if (len >= 12) { pct = 100; color = 'var(--green)'; }
        else if (len >= 8) { pct = 66; color = 'var(--gold-ink)'; }
        else if (len > 0) { pct = 33; color = 'var(--red)'; }

        if (strengthBar) {
          strengthBar.style.width = pct + '%';
          strengthBar.style.backgroundColor = color;
        }

        if (pwError && pwInput.classList.contains('is-invalid') && len >= 8) {
          setFieldError(pwInput, pwError, '');
        }
      });

      pwInput.addEventListener('blur', () => {
        if (pwInput.value.length < 8) {
          setFieldError(pwInput, pwError, 'Password must be at least 8 characters.');
        } else {
          setFieldError(pwInput, pwError, '');
        }
      });
    }

    if (confirmInput && confirmError) {
      const validateConfirm = () => {
        if (!confirmInput.value) {
          setFieldError(confirmInput, confirmError, 'Please confirm your password.');
          return false;
        }
        if (confirmInput.value !== (pwInput ? pwInput.value : '')) {
          setFieldError(confirmInput, confirmError, 'Passwords do not match.');
          return false;
        }
        setFieldError(confirmInput, confirmError, '');
        return true;
      };

      confirmInput.addEventListener('blur', validateConfirm);
      confirmInput.addEventListener('input', () => {
        if (confirmInput.classList.contains('is-invalid')) validateConfirm();
      });
    }

    studentRegisterForm.addEventListener('submit', e => {
      e.preventDefault();
      const name = nameInput ? nameInput.value.trim() : '';
      const email = emailInput ? emailInput.value.trim() : '';
      const course = courseSelect ? courseSelect.value : '';
      const password = pwInput ? pwInput.value : '';
      const confirmPw = confirmInput ? confirmInput.value : '';

      let isValid = true;

      if (!name || name.length < 2) {
        setFieldError(nameInput, nameError, 'Full name must be at least 2 characters.');
        isValid = false;
      }
      if (!email || !emailRegex.test(email)) {
        setFieldError(emailInput, emailError, 'Please enter a valid email address.');
        isValid = false;
      }
      if (!course) {
        setFieldError(courseSelect, courseError, 'Please select your programme.');
        isValid = false;
      }
      if (!password || password.length < 8) {
        setFieldError(pwInput, pwError, 'Password must be at least 8 characters.');
        isValid = false;
      }
      if (password !== confirmPw) {
        setFieldError(confirmInput, confirmError, 'Passwords do not match.');
        isValid = false;
      }

      if (!isValid) {
        S360.toast('Please check the required fields.', 'error');
        return;
      }

      setButtonLoading(submitBtn, true, 'Create Account');

      setTimeout(() => {
        const newStudent = { id: 'stu-new-' + Date.now(), name, role: 'student', email, course };
        S360.setSession(newStudent);
        S360.toast('Account successfully created! Welcome to Student360.', 'success');
        setTimeout(() => {
          window.location.href = '../student/dashboard.html';
        }, 500);
      }, 750);
    });
  }

  const adminLoginForm = document.getElementById('admin-login-form');
  if (adminLoginForm) {
    const emailInput = document.getElementById('admin-email');
    const emailError = document.getElementById('admin-email-error');
    const pwInput = document.getElementById('admin-password');
    const pwError = document.getElementById('admin-password-error');
    const submitBtn = adminLoginForm.querySelector('button[type="submit"]');

    if (emailInput && emailError) {
      emailInput.addEventListener('blur', () => {
        const val = emailInput.value.trim();
        if (!val || !emailRegex.test(val)) {
          setFieldError(emailInput, emailError, 'Please enter a valid admin email.');
        } else {
          setFieldError(emailInput, emailError, '');
        }
      });
      emailInput.addEventListener('input', () => {
        if (emailInput.classList.contains('is-invalid') && emailRegex.test(emailInput.value.trim())) {
          setFieldError(emailInput, emailError, '');
        }
      });
    }

    if (pwInput && pwError) {
      pwInput.addEventListener('blur', () => {
        if (!pwInput.value) {
          setFieldError(pwInput, pwError, 'Admin password is required.');
        } else {
          setFieldError(pwInput, pwError, '');
        }
      });
      pwInput.addEventListener('input', () => {
        if (pwInput.classList.contains('is-invalid') && pwInput.value) {
          setFieldError(pwInput, pwError, '');
        }
      });
    }

    adminLoginForm.addEventListener('submit', e => {
      e.preventDefault();
      const email = emailInput ? emailInput.value.trim() : '';
      const password = pwInput ? pwInput.value : '';

      let isValid = true;
      if (!email || !emailRegex.test(email)) {
        setFieldError(emailInput, emailError, 'Please enter a valid admin email.');
        isValid = false;
      }
      if (!password) {
        setFieldError(pwInput, pwError, 'Admin password is required.');
        isValid = false;
      }

      if (!isValid) {
        S360.toast('Please check your login details.', 'error');
        return;
      }

      setButtonLoading(submitBtn, true, 'Access Portal');

      setTimeout(() => {
        const mockAdmin = { id: 'adm-001', name: 'Administrator', role: 'admin', email };
        S360.setSession(mockAdmin);
        S360.toast('Welcome to the Admin Portal!', 'success');
        setTimeout(() => {
          window.location.href = '../admin/dashboard.html';
        }, 500);
      }, 750);
    });
  }
});
