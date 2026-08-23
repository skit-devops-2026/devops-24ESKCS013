// server.js
// Main entry point for the CampusConnect backend API server.
// Loads environment variables, sets up middleware, mounts routes, and starts cron jobs.

require('dotenv').config(); // Load .env variables FIRST, before anything else

const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 5000;

// ─── MIDDLEWARE ───────────────────────────────────────────────────────────────
// Allow requests from the frontend (any origin for demo; restrict in production)
app.use(cors({ origin: '*', credentials: true }));

// Parse JSON request bodies
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve uploaded files statically — e.g., GET /uploads/somefile.pdf
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Serve the frontend client files
app.use(express.static(path.join(__dirname, '../client')));

// ─── API ROUTES ───────────────────────────────────────────────────────────────
app.use('/api/auth', require('./routes/auth'));
app.use('/api/admin', require('./routes/admin'));
app.use('/api/student', require('./routes/student'));
app.use('/api/notes', require('./routes/notes'));
app.use('/api/tasks', require('./routes/tasks'));
app.use('/api/reports', require('./routes/reports'));

// Health check endpoint — useful for Docker healthchecks
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// SPA fallback: any unmatched route serves the frontend index.html
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../client/index.html'));
});

// ─── START SERVER ─────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`🚀 CampusConnect server running on http://localhost:${PORT}`);
  console.log(`   Environment: ${process.env.NODE_ENV || 'development'}`);

  // Start background cron jobs after the server is up
  const { startDailyCron, startMonthlyCron } = require('./utils/cronJobs');
  startDailyCron();
  startMonthlyCron();
});
