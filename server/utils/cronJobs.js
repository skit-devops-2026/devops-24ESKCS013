// utils/cronJobs.js
// Two scheduled jobs:
// 1. Daily at midnight: flip overdue 'pending' tasks to 'missed'
// 2. Monthly on the 1st: generate a performance snapshot + email it

const cron = require('node-cron');
const db = require('../config/db');
const { sendMonthlyReportEmail } = require('./email');

const MONTH_NAMES = ['January','February','March','April','May','June','July','August','September','October','November','December'];

// ─── JOB 1: Daily at midnight ─────────────────────────────────────────────────
// Finds all 'pending' tasks whose due_date has passed and marks them 'missed'
function startDailyCron() {
  cron.schedule('0 0 * * *', async () => {
    console.log('⏰ [CRON] Daily job: marking overdue tasks as missed...');
    try {
      const [result] = await db.query(
        `UPDATE Tasks SET status = 'missed'
         WHERE status = 'pending' AND due_date < CURDATE()`
      );
      console.log(`✅ [CRON] ${result.affectedRows} tasks marked as missed.`);
    } catch (err) {
      console.error('❌ [CRON] Daily job failed:', err.message);
    }
  }, { timezone: 'Asia/Kolkata' });

  console.log('⏰ Daily cron job scheduled (midnight IST)');
}

// ─── JOB 2: Monthly on the 1st at 1am ────────────────────────────────────────
// Calculates previous month's stats for every student and saves a snapshot
function startMonthlyCron() {
  cron.schedule('0 1 1 * *', async () => {
    console.log('⏰ [CRON] Monthly job: generating monthly reports...');

    // Get the previous month (month is 1-indexed)
    const now = new Date();
    const prevMonth = now.getMonth() === 0 ? 12 : now.getMonth(); // 0=Jan, so Jan -> Dec of prev year
    const prevYear = now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear();

    try {
      // Get all students
      const [students] = await db.query("SELECT id, email, name FROM Users WHERE role='student' AND is_verified=TRUE");

      for (const student of students) {
        // Task stats for the previous month
        const [[taskStats]] = await db.query(`
          SELECT
            COUNT(*) as total,
            SUM(CASE WHEN status='completed' THEN 1 ELSE 0 END) as completed
          FROM Tasks
          WHERE student_id = ? AND MONTH(due_date) = ? AND YEAR(due_date) = ?
        `, [student.id, prevMonth, prevYear]);

        const tasks_total = taskStats.total || 0;
        const tasks_completed = taskStats.completed || 0;
        const completion_pct = tasks_total > 0 ? Math.round((tasks_completed / tasks_total) * 100) : 0;

        // Average attendance
        const [[attendRow]] = await db.query(`
          SELECT COALESCE(AVG(CASE WHEN total_classes > 0 THEN attended_classes/total_classes*100 ELSE NULL END), 0) as avg_att
          FROM Attendance WHERE student_id = ?
        `, [student.id]);
        const attendance_pct = Math.round(attendRow.avg_att || 0);

        // Subject with the most missed tasks
        const [[worstSubject]] = await db.query(`
          SELECT s.name as subject_name
          FROM Tasks t JOIN Subjects s ON t.subject_id = s.id
          WHERE t.student_id=? AND t.status='missed' AND MONTH(t.due_date)=? AND YEAR(t.due_date)=?
          GROUP BY t.subject_id ORDER BY COUNT(*) DESC LIMIT 1
        `, [student.id, prevMonth, prevYear]);

        // Rule-based feedback
        let feedback;
        if (completion_pct >= 80) {
          feedback = '🎉 Excellent work! You completed most of your tasks. Keep the momentum going!';
        } else if (completion_pct >= 50) {
          feedback = '📅 Good effort! Try setting a daily priority task list to improve your completion rate.';
        } else {
          feedback = '💡 Let\'s work smarter! Try breaking larger tasks into smaller 20-minute chunks to make them more manageable.';
        }

        // Save the report snapshot
        await db.query(`
          INSERT INTO MonthlyReports (student_id, month, year, tasks_total, tasks_completed, completion_pct, attendance_pct, feedback, worst_subject)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
          ON DUPLICATE KEY UPDATE tasks_total=?, tasks_completed=?, completion_pct=?, attendance_pct=?, feedback=?, worst_subject=?
        `, [
          student.id, prevMonth, prevYear, tasks_total, tasks_completed, completion_pct, attendance_pct, feedback, worstSubject?.subject_name || null,
          tasks_total, tasks_completed, completion_pct, attendance_pct, feedback, worstSubject?.subject_name || null
        ]);

        // Email the report to the student (reusing the email utility)
        try {
          await sendMonthlyReportEmail(student.email, student.name, {
            monthName: MONTH_NAMES[prevMonth - 1],
            year: prevYear,
            tasks_total,
            tasks_completed,
            completion_pct,
            attendance_pct,
            feedback,
            worst_subject: worstSubject?.subject_name || null
          });
        } catch (emailErr) {
          console.error(`❌ [CRON] Failed to email report to ${student.email}:`, emailErr.message);
        }

        console.log(`✅ [CRON] Report generated for ${student.name} (${student.email})`);
      }
    } catch (err) {
      console.error('❌ [CRON] Monthly job failed:', err.message);
    }
  }, { timezone: 'Asia/Kolkata' });

  console.log('⏰ Monthly cron job scheduled (1st of month, 1am IST)');
}

module.exports = { startDailyCron, startMonthlyCron };
