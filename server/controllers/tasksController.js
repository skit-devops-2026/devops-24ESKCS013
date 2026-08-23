// controllers/tasksController.js
// Task tracker: CRUD operations and statistics for charts.

const db = require('../config/db');

// GET /api/tasks — list tasks for the logged-in student
async function getTasks(req, res) {
  try {
    const { status, subject_id } = req.query;
    let query = `
      SELECT t.*, s.name as subject_name
      FROM Tasks t
      LEFT JOIN Subjects s ON t.subject_id = s.id
      WHERE t.student_id = ?
    `;
    const params = [req.user.id];
    if (status) { query += ' AND t.status = ?'; params.push(status); }
    if (subject_id) { query += ' AND t.subject_id = ?'; params.push(subject_id); }
    query += ' ORDER BY t.due_date ASC';

    const [rows] = await db.query(query, params);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ message: 'Server error.' });
  }
}

// POST /api/tasks — create a new task
async function createTask(req, res) {
  const { title, category, due_date, subject_id } = req.body;
  if (!title || !category || !due_date) {
    return res.status(400).json({ message: 'Title, category, and due date are required.' });
  }
  try {
    const [result] = await db.query(
      'INSERT INTO Tasks (student_id, subject_id, title, category, due_date) VALUES (?, ?, ?, ?, ?)',
      [req.user.id, subject_id || null, title, category, due_date]
    );
    res.status(201).json({ message: 'Task created.', id: result.insertId });
  } catch (err) {
    res.status(500).json({ message: 'Server error.' });
  }
}

// PUT /api/tasks/:id — update task (e.g., mark complete, edit details)
async function updateTask(req, res) {
  const { id } = req.params;
  const { title, category, due_date, status, subject_id } = req.body;
  try {
    // Only the owner can update
    const [[task]] = await db.query('SELECT * FROM Tasks WHERE id = ? AND student_id = ?', [id, req.user.id]);
    if (!task) return res.status(404).json({ message: 'Task not found.' });

    const completed_at = status === 'completed' ? new Date() : (status === 'pending' ? null : task.completed_at);

    await db.query(
      'UPDATE Tasks SET title=?, category=?, due_date=?, status=?, subject_id=?, completed_at=? WHERE id=?',
      [title || task.title, category || task.category, due_date || task.due_date, status || task.status, subject_id !== undefined ? subject_id : task.subject_id, completed_at, id]
    );
    res.json({ message: 'Task updated.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error.' });
  }
}

// DELETE /api/tasks/:id — delete a task
async function deleteTask(req, res) {
  const { id } = req.params;
  try {
    await db.query('DELETE FROM Tasks WHERE id = ? AND student_id = ?', [id, req.user.id]);
    res.json({ message: 'Task deleted.' });
  } catch (err) {
    res.status(500).json({ message: 'Server error.' });
  }
}

// GET /api/tasks/stats — aggregated data for Chart.js charts
async function getTaskStats(req, res) {
  const studentId = req.user.id;
  try {
    // 1. Weekly stats: completed/pending/missed per day for last 7 days
    const [weekly] = await db.query(`
      SELECT
        DATE(due_date) as date,
        SUM(CASE WHEN status='completed' THEN 1 ELSE 0 END) as completed,
        SUM(CASE WHEN status='pending' THEN 1 ELSE 0 END) as pending,
        SUM(CASE WHEN status='missed' THEN 1 ELSE 0 END) as missed
      FROM Tasks
      WHERE student_id = ? AND due_date >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)
      GROUP BY DATE(due_date)
      ORDER BY date ASC
    `, [studentId]);

    // 2. Monthly doughnut: current month totals
    const [monthly] = await db.query(`
      SELECT
        SUM(CASE WHEN status='completed' THEN 1 ELSE 0 END) as completed,
        SUM(CASE WHEN status='pending' THEN 1 ELSE 0 END) as pending,
        SUM(CASE WHEN status='missed' THEN 1 ELSE 0 END) as missed,
        COUNT(*) as total
      FROM Tasks
      WHERE student_id = ? AND MONTH(due_date)=MONTH(CURDATE()) AND YEAR(due_date)=YEAR(CURDATE())
    `, [studentId]);

    // 3. Subject-wise missed tasks
    const [subjectMissed] = await db.query(`
      SELECT s.name as subject, COUNT(*) as missed_count
      FROM Tasks t JOIN Subjects s ON t.subject_id = s.id
      WHERE t.student_id = ? AND t.status = 'missed'
      GROUP BY t.subject_id, s.name
      ORDER BY missed_count DESC
    `, [studentId]);

    // 4. Trend: monthly completion % from MonthlyReports history
    const [trend] = await db.query(`
      SELECT month, year, completion_pct, attendance_pct
      FROM MonthlyReports
      WHERE student_id = ?
      ORDER BY year ASC, month ASC
      LIMIT 12
    `, [studentId]);

    res.json({ weekly, monthly: monthly[0], subjectMissed, trend });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error.' });
  }
}

module.exports = { getTasks, createTask, updateTask, deleteTask, getTaskStats };
