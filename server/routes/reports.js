// routes/reports.js
const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const { getMonthlyReports } = require('../controllers/reportsController');

router.get('/monthly', authenticate, getMonthlyReports);

module.exports = router;
