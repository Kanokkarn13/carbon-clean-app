// src/config/db.js
const path = require('path');
const dotenv = require('dotenv');
const mysql = require('mysql2/promise');

/**
 * Load env from multiple locations (backend/.env and project root .env)
 * so running from backend or repo root both work.
 */
const envPaths = [
  path.resolve(__dirname, '..', '.env'),
  path.resolve(__dirname, '..', '..', '..', '.env'),
];
envPaths.forEach((p) => dotenv.config({ path: p, override: false }));

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
  // TiDB Serverless requires TLS; rely on system CAs.
  ssl: {
    minVersion: 'TLSv1.2',
    rejectUnauthorized: true,
  },
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

async function ensureProfilePictureColumn() {
  try {
    const sql = `
      ALTER TABLE users
      ADD COLUMN profile_picture VARCHAR(512) NULL DEFAULT NULL
    `;
    await pool.query(sql);
    console.log('✅ Added users.profile_picture column');
  } catch (err) {
    // Ignore "duplicate column" error (ER_DUP_FIELDNAME = 1060)
    if (err && err.errno === 1060) {
      console.log('ℹ️  users.profile_picture already exists');
    } else {
      console.error('❌ Failed to ensure profile_picture column:', err.message);
    }
  }
}

module.exports = pool;
module.exports.ensureProfilePictureColumn = ensureProfilePictureColumn;
