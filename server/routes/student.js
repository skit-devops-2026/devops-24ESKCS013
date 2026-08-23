// routes/student.js
const express = require('express');
const router = express.Router();
const { authenticate, authorizeRoles } = require('../middleware/auth');
const { getDashboard } = require('../controllers/studentController');

router.get('/dashboard', authenticate, authorizeRoles('student'), getDashboard);

module.exports = router;
