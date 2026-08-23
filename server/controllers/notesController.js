// controllers/notesController.js
// Notes module: upload, list, download, and like notes.

const db = require('../config/db');
const path = require('path');

// GET /api/notes — list notes with optional subject/semester filter
async function getNotes(req, res) {
  try {
    const { subject_id, semester } = req.query;
    let query = `
      SELECT n.id, n.title, n.file_path, n.likes_count, n.uploaded_at,
             u.name as uploader_name, u.branch,
             s.name as subject_name, s.semester
      FROM Notes n
      JOIN Users u ON n.uploaded_by = u.id
      JOIN Subjects s ON n.subject_id = s.id
    `;
    const params = [];
    const conditions = [];
    if (subject_id) { conditions.push('n.subject_id = ?'); params.push(subject_id); }
    if (semester) { conditions.push('s.semester = ?'); params.push(semester); }
    if (conditions.length) query += ' WHERE ' + conditions.join(' AND ');
    query += ' ORDER BY n.likes_count DESC, n.uploaded_at DESC';

    const [rows] = await db.query(query, params);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error.' });
  }
}

// POST /api/notes — upload a new note (uses multer for file handling)
async function uploadNote(req, res) {
  if (!req.file) {
    return res.status(400).json({ message: 'No file uploaded.' });
  }
  const { subject_id, title } = req.body;
  if (!subject_id || !title) {
    return res.status(400).json({ message: 'Subject and title are required.' });
  }

  try {
    // Store relative path so it's portable between environments
    const file_path = `/uploads/${req.file.filename}`;
    await db.query(
      'INSERT INTO Notes (uploaded_by, subject_id, title, file_path) VALUES (?, ?, ?, ?)',
      [req.user.id, subject_id, title, file_path]
    );
    res.status(201).json({ message: 'Note uploaded successfully.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error.' });
  }
}

// PUT /api/notes/:id/like — increment like count
async function likeNote(req, res) {
  const { id } = req.params;
  try {
    await db.query('UPDATE Notes SET likes_count = likes_count + 1 WHERE id = ?', [id]);
    const [[note]] = await db.query('SELECT likes_count FROM Notes WHERE id = ?', [id]);
    res.json({ likes_count: note.likes_count });
  } catch (err) {
    res.status(500).json({ message: 'Server error.' });
  }
}

// DELETE /api/notes/:id — delete a note (only by uploader or admin)
async function deleteNote(req, res) {
  const { id } = req.params;
  try {
    const [[note]] = await db.query('SELECT * FROM Notes WHERE id = ?', [id]);
    if (!note) return res.status(404).json({ message: 'Note not found.' });

    // Only the uploader or an admin can delete
    if (note.uploaded_by !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Not authorized.' });
    }

    await db.query('DELETE FROM Notes WHERE id = ?', [id]);
    res.json({ message: 'Note deleted.' });
  } catch (err) {
    res.status(500).json({ message: 'Server error.' });
  }
}

module.exports = { getNotes, uploadNote, likeNote, deleteNote };
