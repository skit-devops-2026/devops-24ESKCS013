// controllers/adminController.js
// All admin operations: manage students, subjects, notices, attendance, CSV export.

const db = require('../config/db');

// ─── STUDENTS ─────────────────────────────────────────────────────────────────

// GET /api/admin/students — list all students with optional branch filter
async function getStudents(req, res) {
  try {
    const { branch, search } = req.query;
    let query = `SELECT id, name, email, college_name, branch, year, semester, roll_no, is_verified, created_at
                 FROM Users WHERE role = 'student'`;
    const params = [];

    if (branch) { query += ' AND branch = ?'; params.push(branch); }
    if (search) { query += ' AND (name LIKE ? OR email LIKE ? OR roll_no LIKE ?)'; params.push(`%${search}%`, `%${search}%`, `%${search}%`); }

    query += ' ORDER BY created_at DESC';
    const [rows] = await db.query(query, params);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error.' });
  }
}

// PUT /api/admin/students/:id — update a student's details or verification status
async function updateStudent(req, res) {
  const { id } = req.params;
  const { name, branch, year, semester, is_verified } = req.body;
  try {
    await db.query(
      'UPDATE Users SET name=?, branch=?, year=?, semester=?, is_verified=? WHERE id=? AND role="student"',
      [name, branch, year, semester, is_verified, id]
    );
    res.json({ message: 'Student updated successfully.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error.' });
  }
}

// DELETE /api/admin/students/:id — remove a student account
async function deleteStudent(req, res) {
  const { id } = req.params;
  try {
    await db.query('DELETE FROM Users WHERE id = ? AND role = "student"', [id]);
    res.json({ message: 'Student deleted.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error.' });
  }
}

// ─── SUBJECTS ─────────────────────────────────────────────────────────────────

// GET /api/admin/subjects
async function getSubjects(req, res) {
  try {
    const [rows] = await db.query('SELECT * FROM Subjects ORDER BY branch, semester');
    res.json(rows);
  } catch (err) {
    res.status(500).json({ message: 'Server error.' });
  }
}

// POST /api/admin/subjects
async function addSubject(req, res) {
  const { name, branch, semester } = req.body;
  if (!name || !branch || !semester) return res.status(400).json({ message: 'All fields required.' });
  try {
    const [result] = await db.query('INSERT INTO Subjects (name, branch, semester) VALUES (?, ?, ?)', [name, branch, semester]);
    res.status(201).json({ message: 'Subject added.', id: result.insertId });
  } catch (err) {
    res.status(500).json({ message: 'Server error.' });
  }
}

// PUT /api/admin/subjects/:id
async function updateSubject(req, res) {
  const { id } = req.params;
  const { name, branch, semester } = req.body;
  try {
    await db.query('UPDATE Subjects SET name=?, branch=?, semester=? WHERE id=?', [name, branch, semester, id]);
    res.json({ message: 'Subject updated.' });
  } catch (err) {
    res.status(500).json({ message: 'Server error.' });
  }
}

// DELETE /api/admin/subjects/:id
async function deleteSubject(req, res) {
  const { id } = req.params;
  try {
    await db.query('DELETE FROM Subjects WHERE id = ?', [id]);
    res.json({ message: 'Subject deleted.' });
  } catch (err) {
    res.status(500).json({ message: 'Server error.' });
  }
}

// ─── NOTICES ──────────────────────────────────────────────────────────────────

// GET /api/admin/notices
async function getNotices(req, res) {
  try {
    const [rows] = await db.query(
      `SELECT n.*, u.name as posted_by_name
       FROM Notices n JOIN Users u ON n.posted_by = u.id
       ORDER BY n.created_at DESC`
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ message: 'Server error.' });
  }
}

// POST /api/admin/notices
async function addNotice(req, res) {
  const { title, body } = req.body;
  if (!title || !body) return res.status(400).json({ message: 'Title and body required.' });
  try {
    await db.query('INSERT INTO Notices (title, body, posted_by) VALUES (?, ?, ?)', [title, body, req.user.id]);
    res.status(201).json({ message: 'Notice posted.' });
  } catch (err) {
    res.status(500).json({ message: 'Server error.' });
  }
}

// DELETE /api/admin/notices/:id
async function deleteNotice(req, res) {
  const { id } = req.params;
  try {
    await db.query('DELETE FROM Notices WHERE id = ?', [id]);
    res.json({ message: 'Notice deleted.' });
  } catch (err) {
    res.status(500).json({ message: 'Server error.' });
  }
}

// ─── ATTENDANCE ───────────────────────────────────────────────────────────────

// GET /api/admin/attendance — list all attendance records (optionally filter by student)
async function getAttendance(req, res) {
  try {
    const { student_id } = req.query;
    let query = `
      SELECT a.id, u.name as student_name, u.roll_no, s.name as subject_name, s.branch, s.semester,
             a.total_classes, a.attended_classes, a.updated_at
      FROM Attendance a
      JOIN Users u ON a.student_id = u.id
      JOIN Subjects s ON a.subject_id = s.id
    `;
    const params = [];
    if (student_id) { query += ' WHERE a.student_id = ?'; params.push(student_id); }
    query += ' ORDER BY u.name, s.name';
    const [rows] = await db.query(query, params);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ message: 'Server error.' });
  }
}

// PUT /api/admin/attendance — upsert attendance record (insert or update)
async function upsertAttendance(req, res) {
  const { student_id, subject_id, total_classes, attended_classes } = req.body;
  if (!student_id || !subject_id || total_classes == null || attended_classes == null) {
    return res.status(400).json({ message: 'All fields required.' });
  }
  if (attended_classes > total_classes) {
    return res.status(400).json({ message: 'Attended classes cannot exceed total classes.' });
  }
  try {
    // INSERT OR UPDATE (MySQL's ON DUPLICATE KEY UPDATE)
    await db.query(
      `INSERT INTO Attendance (student_id, subject_id, total_classes, attended_classes)
       VALUES (?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE total_classes = ?, attended_classes = ?`,
      [student_id, subject_id, total_classes, attended_classes, total_classes, attended_classes]
    );
    res.json({ message: 'Attendance updated.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error.' });
  }
}

// ─── DASHBOARD STATS ──────────────────────────────────────────────────────────

// GET /api/admin/dashboard
async function getDashboard(req, res) {
  try {
    const [[{ totalStudents }]] = await db.query("SELECT COUNT(*) as totalStudents FROM Users WHERE role='student'");
    const [[{ totalNotes }]] = await db.query('SELECT COUNT(*) as totalNotes FROM Notes');
    const [branchCounts] = await db.query("SELECT branch, COUNT(*) as count FROM Users WHERE role='student' GROUP BY branch");
    const [[{ totalSubjects }]] = await db.query('SELECT COUNT(*) as totalSubjects FROM Subjects');
    const [recentStudents] = await db.query("SELECT name, email, branch, created_at FROM Users WHERE role='student' ORDER BY created_at DESC LIMIT 5");

    res.json({ totalStudents, totalNotes, totalSubjects, branchCounts, recentStudents });
  } catch (err) {
    res.status(500).json({ message: 'Server error.' });
  }
}

// GET /api/admin/students/export — exports student list as CSV
async function exportStudentsCSV(req, res) {
  try {
    const [rows] = await db.query(
      "SELECT id, name, email, college_name, branch, year, semester, roll_no, is_verified, created_at FROM Users WHERE role='student' ORDER BY created_at DESC"
    );

    // Manually build CSV string
    const headers = ['ID', 'Name', 'Email', 'College', 'Branch', 'Year', 'Semester', 'Roll No', 'Verified', 'Created At'];
    const csv = [
      headers.join(','),
      ...rows.map(r => [r.id, `"${r.name}"`, r.email, `"${r.college_name}"`, r.branch, r.year, r.semester, r.roll_no, r.is_verified, r.created_at].join(','))
    ].join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="students.csv"');
    res.send(csv);
  } catch (err) {
    res.status(500).json({ message: 'Server error.' });
  }
}

module.exports = {
  getStudents, updateStudent, deleteStudent,
  getSubjects, addSubject, updateSubject, deleteSubject,
  getNotices, addNotice, deleteNotice,
  getAttendance, upsertAttendance,
  getDashboard, exportStudentsCSV
};
