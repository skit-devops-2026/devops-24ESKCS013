// routes/auth.js
const express = require('express');
const router = express.Router();
const rateLimit = require('express-rate-limit');
const { register, verifyOTP, login, forgotPassword, resetPassword } = require('../controllers/authController');

// Rate limiter for OTP endpoints: max 5 requests per 15 minutes per IP
const otpLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5,
  message: { message: 'Too many OTP requests. Please try again after 15 minutes.' }
});

router.post('/register', otpLimiter, register);
router.post('/verify-otp', verifyOTP);
router.post('/login', login);
router.post('/forgot-password', otpLimiter, forgotPassword);
router.post('/reset-password', resetPassword);

module.exports = router;
