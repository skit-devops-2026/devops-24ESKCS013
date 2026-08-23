// controllers/reportsController.js
// Monthly reports: retrieves saved monthly report snapshots.

const db = require('../config/db');

const MONTH_NAMES = ['January','February','March','April','May','June','July','August','September','October','November','December'];

// GET /api/reports/monthly — returns monthly reports for the logged-in student
async function getMonthlyReports(req, res) {
  try {
    const [rows] = await db.query(
      `SELECT * FROM MonthlyReports WHERE student_id = ? ORDER BY year DESC, month DESC LIMIT 12`,
      [req.user.id]
    );

    // Add a human-readable month name
    const reports = rows.map(r => ({
      ...r,
      monthName: MONTH_NAMES[r.month - 1]
    }));

    res.json(reports);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error.' });
  }
}

module.exports = { getMonthlyReports };
