// controllers/studentController.js
// Student dashboard data: overview stats for the logged-in student.

const db = require('../config/db');

// GET /api/student/dashboard
async function getDashboard(req, res) {
  const studentId = req.user.id;
  try {
    // 1. Average attendance across all subjects
    const [[attendanceRow]] = await db.query(`
      SELECT
        COALESCE(AVG(CASE WHEN total_classes > 0 THEN (attended_classes / total_classes * 100) ELSE NULL END), 0) as avg_attendance
      FROM Attendance WHERE student_id = ?
    `, [studentId]);

    // 2. Tasks due this week
    const [[tasksThisWeek]] = await db.query(`
      SELECT COUNT(*) as count FROM Tasks
      WHERE student_id = ? AND status = 'pending'
        AND due_date BETWEEN CURDATE() AND DATE_ADD(CURDATE(), INTERVAL 7 DAY)
    `, [studentId]);

    // 3. Latest notice
    const [[latestNotice]] = await db.query(
      'SELECT title, body, created_at FROM Notices ORDER BY created_at DESC LIMIT 1'
    );

    // 4. Recent notes (from the student's branch/semester)
    const [user] = await db.query('SELECT branch, semester FROM Users WHERE id = ?', [studentId]);
    const [recentNotes] = await db.query(`
      SELECT n.title, s.name as subject_name, n.uploaded_at
      FROM Notes n JOIN Subjects s ON n.subject_id = s.id
      WHERE s.branch = ? AND s.semester = ?
      ORDER BY n.uploaded_at DESC LIMIT 5
    `, [user[0]?.branch || '', user[0]?.semester || 0]);

    // 5. Attendance per subject for the attendance page
    const [attendanceBySubject] = await db.query(`
      SELECT s.name as subject_name, a.total_classes, a.attended_classes,
             ROUND(IF(a.total_classes > 0, a.attended_classes/a.total_classes*100, 0), 2) as pct
      FROM Attendance a JOIN Subjects s ON a.subject_id = s.id
      WHERE a.student_id = ?
    `, [studentId]);

    res.json({
      avg_attendance: parseFloat(attendanceRow.avg_attendance).toFixed(2),
      tasks_due_this_week: tasksThisWeek.count,
      latest_notice: latestNotice || null,
      recent_notes: recentNotes,
      attendance_by_subject: attendanceBySubject
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error.' });
  }
}

module.exports = { getDashboard };
