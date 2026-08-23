// routes/admin.js
const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const { authenticate, authorizeRoles } = require('../middleware/auth');

// Special middleware for CSV export: allows token via query string (for direct browser navigation)
function authenticateCSV(req, res, next) {
  if (req.query.token) req.headers.authorization = 'Bearer ' + req.query.token;
  return authenticate(req, res, next);
}
const ctrl = require('../controllers/adminController');

// All admin routes require authentication + admin role
const isAdmin = [authenticate, authorizeRoles('admin')];

router.get('/dashboard', ...isAdmin, ctrl.getDashboard);

// Students
router.get('/students', ...isAdmin, ctrl.getStudents);
router.get('/students/export', authenticateCSV, authorizeRoles('admin'), ctrl.exportStudentsCSV);
router.put('/students/:id', ...isAdmin, ctrl.updateStudent);
router.delete('/students/:id', ...isAdmin, ctrl.deleteStudent);

// Subjects
router.get('/subjects', ...isAdmin, ctrl.getSubjects);
router.post('/subjects', ...isAdmin, ctrl.addSubject);
router.put('/subjects/:id', ...isAdmin, ctrl.updateSubject);
router.delete('/subjects/:id', ...isAdmin, ctrl.deleteSubject);

// Notices
router.get('/notices', ...isAdmin, ctrl.getNotices);
router.post('/notices', ...isAdmin, ctrl.addNotice);
router.delete('/notices/:id', ...isAdmin, ctrl.deleteNotice);

// Attendance
router.get('/attendance', ...isAdmin, ctrl.getAttendance);
router.put('/attendance', ...isAdmin, ctrl.upsertAttendance);

module.exports = router;
