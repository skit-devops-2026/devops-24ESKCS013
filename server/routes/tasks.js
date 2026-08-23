// routes/tasks.js
const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const { getTasks, createTask, updateTask, deleteTask, getTaskStats } = require('../controllers/tasksController');

// IMPORTANT: /stats must be defined BEFORE /:id to avoid Express treating 'stats' as an ID
router.get('/stats', authenticate, getTaskStats);

router.get('/', authenticate, getTasks);
router.post('/', authenticate, createTask);
router.put('/:id', authenticate, updateTask);
router.delete('/:id', authenticate, deleteTask);

module.exports = router;
