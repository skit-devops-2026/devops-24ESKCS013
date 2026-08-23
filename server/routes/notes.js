// routes/notes.js
const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const { authenticate } = require('../middleware/auth');
const { getNotes, uploadNote, likeNote, deleteNote } = require('../controllers/notesController');

// Multer configuration: saves files to /uploads with original extension preserved
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, path.join(__dirname, '../uploads')),
  filename: (req, file, cb) => {
    // Prefix with timestamp to avoid filename collisions
    const unique = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, unique + path.extname(file.originalname));
  }
});

// Allow only PDFs, images, and Word documents
const fileFilter = (req, file, cb) => {
  const allowed = /pdf|jpeg|jpg|png|gif|doc|docx/;
  const ext = allowed.test(path.extname(file.originalname).toLowerCase());
  const mime = allowed.test(file.mimetype);
  if (ext && mime) cb(null, true);
  else cb(new Error('Only PDF, image, DOC files are allowed'));
};

const upload = multer({ storage, fileFilter, limits: { fileSize: 10 * 1024 * 1024 } }); // 10MB limit

router.get('/', authenticate, getNotes);
router.post('/', authenticate, upload.single('file'), uploadNote);
router.put('/:id/like', authenticate, likeNote);
router.delete('/:id', authenticate, deleteNote);

module.exports = router;
