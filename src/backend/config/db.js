// src/config/db.js
require('dotenv').config();
const mysql = require('mysql2/promise');

/**
 * ✅ MySQL Connection Pool for AWS RDS
 * - ใช้ promise pool เพื่อรองรับ async/await
 * - รองรับ ENV ของ Render และ .env (local dev)
 */

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || '',
  port: Number(process.env.DB_PORT) || 3306,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  connectTimeout: 10000,
});

// ✅ Test connection on startup (once)
(async () => {
  try {
    const conn = await pool.getConnection();
    console.log('✅ Successfully connected to the database!');
    conn.release();
  } catch (err) {
    console.error('❌ Failed to connect to the database:', err.message);
  }
})();

module.exports = pool;
