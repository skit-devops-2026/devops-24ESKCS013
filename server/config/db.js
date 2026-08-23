// config/db.js
// Sets up a MySQL connection pool using environment variables.
// We use a pool (not a single connection) so multiple requests can be handled concurrently.

const mysql = require('mysql2/promise');

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 3306,
  user: process.env.DB_USER || 'campususer',
  password: process.env.DB_PASSWORD || 'campus123',
  database: process.env.DB_NAME || 'campusconnect',
  waitForConnections: true,
  connectionLimit: 10, // max 10 simultaneous DB connections
  queueLimit: 0
});

// Test the connection on startup
pool.getConnection()
  .then(conn => {
    console.log('✅ MySQL connected successfully');
    conn.release(); // release back to pool immediately
  })
  .catch(err => {
    console.error('❌ MySQL connection failed:', err.message);
  });

module.exports = pool;
