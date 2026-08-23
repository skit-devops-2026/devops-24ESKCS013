// controllers/authController.js
// Handles all authentication: register, OTP verify, login, forgot & reset password.

const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const db = require('../config/db');
const { sendOTPEmail } = require('../utils/email');

// generateOTP: creates a random 6-digit string
function generateOTP() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// ─── REGISTER ─────────────────────────────────────────────────────────────────
// POST /api/auth/register
// Creates a new student account, hashes the password, sends verification OTP.
async function register(req, res) {
  const { name, email, password, college_name, branch, year, semester, roll_no } = req.body;

  // Basic validation
  if (!name || !email || !password || !college_name || !branch || !year || !semester || !roll_no) {
    return res.status(400).json({ message: 'All fields are required.' });
  }
  if (password.length < 6) {
    return res.status(400).json({ message: 'Password must be at least 6 characters.' });
  }

  try {
    // Check if email already registered
    const [existing] = await db.query('SELECT id FROM Users WHERE email = ?', [email]);
    if (existing.length > 0) {
      return res.status(409).json({ message: 'Email already registered.' });
    }

    // Hash password with bcrypt (cost factor 10 is a good balance of security & speed)
    const password_hash = await bcrypt.hash(password, 10);

    // Insert user (is_verified starts as false)
    await db.query(
      `INSERT INTO Users (name, email, password_hash, role, college_name, branch, year, semester, roll_no)
       VALUES (?, ?, ?, 'student', ?, ?, ?, ?, ?)`,
      [name, email, password_hash, college_name, branch, year, semester, roll_no]
    );

    // Generate OTP and save it (expires in 10 minutes)
    const otp = generateOTP();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 min from now
    await db.query(
      'INSERT INTO OTPs (email, otp_code, purpose, expires_at) VALUES (?, ?, ?, ?)',
      [email, otp, 'verify', expiresAt]
    );

    // Send OTP via email
    await sendOTPEmail(email, otp, 'verify');

    res.status(201).json({ message: 'Registration successful. Please check your email for the OTP.' });
  } catch (err) {
    console.error('Register error:', err);
    res.status(500).json({ message: 'Server error during registration.' });
  }
}

// ─── VERIFY OTP ───────────────────────────────────────────────────────────────
// POST /api/auth/verify-otp
// Validates the OTP and marks the user's account as verified.
async function verifyOTP(req, res) {
  const { email, otp } = req.body;

  if (!email || !otp) {
    return res.status(400).json({ message: 'Email and OTP are required.' });
  }

  try {
    // Find the most recent valid OTP for this email & purpose
    const [rows] = await db.query(
      `SELECT * FROM OTPs
       WHERE email = ? AND otp_code = ? AND purpose = 'verify' AND expires_at > NOW()
       ORDER BY created_at DESC LIMIT 1`,
      [email, otp]
    );

    if (rows.length === 0) {
      return res.status(400).json({ message: 'Invalid or expired OTP.' });
    }

    // Mark the user as verified
    await db.query('UPDATE Users SET is_verified = TRUE WHERE email = ?', [email]);

    // Delete used OTPs for this email (cleanup)
    await db.query("DELETE FROM OTPs WHERE email = ? AND purpose = 'verify'", [email]);

    res.json({ message: 'Email verified successfully. You can now log in.' });
  } catch (err) {
    console.error('Verify OTP error:', err);
    res.status(500).json({ message: 'Server error.' });
  }
}

// ─── LOGIN ─────────────────────────────────────────────────────────────────────
// POST /api/auth/login
// Verifies credentials, issues a JWT token.
async function login(req, res) {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: 'Email and password are required.' });
  }

  try {
    const [rows] = await db.query('SELECT * FROM Users WHERE email = ?', [email]);
    if (rows.length === 0) {
      return res.status(401).json({ message: 'Invalid email or password.' });
    }

    const user = rows[0];

    // Check if account is verified
    if (!user.is_verified && user.role !== 'admin') {
      return res.status(403).json({ message: 'Please verify your email before logging in.' });
    }

    // Compare the provided password with the stored hash
    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid email or password.' });
    }

    // Create a JWT payload (never put sensitive info like password in JWT)
    const payload = { id: user.id, email: user.email, role: user.role, name: user.name };
    const token = jwt.sign(payload, process.env.JWT_SECRET, {
      expiresIn: process.env.JWT_EXPIRES_IN || '7d'
    });

    // Return token and basic user info
    res.json({
      message: 'Login successful.',
      token,
      user: { id: user.id, name: user.name, email: user.email, role: user.role }
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ message: 'Server error.' });
  }
}

// ─── FORGOT PASSWORD ──────────────────────────────────────────────────────────
// POST /api/auth/forgot-password
// Sends a password-reset OTP to the user's email. Reuses the same OTP flow.
async function forgotPassword(req, res) {
  const { email } = req.body;
  if (!email) return res.status(400).json({ message: 'Email is required.' });

  try {
    const [rows] = await db.query('SELECT id FROM Users WHERE email = ?', [email]);
    // We return 200 even if the email doesn't exist (prevents email enumeration)
    if (rows.length === 0) {
      return res.json({ message: 'If this email is registered, you will receive an OTP.' });
    }

    // Delete old reset OTPs for this email first
    await db.query("DELETE FROM OTPs WHERE email = ? AND purpose = 'reset'", [email]);

    const otp = generateOTP();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);
    await db.query(
      'INSERT INTO OTPs (email, otp_code, purpose, expires_at) VALUES (?, ?, ?, ?)',
      [email, otp, 'reset', expiresAt]
    );

    await sendOTPEmail(email, otp, 'reset');
    res.json({ message: 'If this email is registered, you will receive an OTP.' });
  } catch (err) {
    console.error('Forgot password error:', err);
    res.status(500).json({ message: 'Server error.' });
  }
}

// ─── RESET PASSWORD ───────────────────────────────────────────────────────────
// POST /api/auth/reset-password
// Validates the reset OTP and sets a new password.
async function resetPassword(req, res) {
  const { email, otp, newPassword } = req.body;

  if (!email || !otp || !newPassword) {
    return res.status(400).json({ message: 'All fields are required.' });
  }
  if (newPassword.length < 6) {
    return res.status(400).json({ message: 'Password must be at least 6 characters.' });
  }

  try {
    // Validate the reset OTP
    const [rows] = await db.query(
      `SELECT * FROM OTPs
       WHERE email = ? AND otp_code = ? AND purpose = 'reset' AND expires_at > NOW()
       ORDER BY created_at DESC LIMIT 1`,
      [email, otp]
    );

    if (rows.length === 0) {
      return res.status(400).json({ message: 'Invalid or expired OTP.' });
    }

    // Hash new password and update
    const password_hash = await bcrypt.hash(newPassword, 10);
    await db.query('UPDATE Users SET password_hash = ? WHERE email = ?', [password_hash, email]);

    // Cleanup used OTPs
    await db.query("DELETE FROM OTPs WHERE email = ? AND purpose = 'reset'", [email]);

    res.json({ message: 'Password reset successful. You can now log in.' });
  } catch (err) {
    console.error('Reset password error:', err);
    res.status(500).json({ message: 'Server error.' });
  }
}

module.exports = { register, verifyOTP, login, forgotPassword, resetPassword };
