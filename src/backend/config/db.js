const path = require('path');

// Load env from project root (../../.. from config/) so shared .env is picked up
require('dotenv').config({ path: path.resolve(__dirname, '..', '..', '..', '.env') });
require('dotenv').config();
const mysql = require('mysql2');

const port = Number(process.env.DB_PORT) || 3306;
const useSsl = String(process.env.DB_USE_SSL || 'false').toLowerCase() === 'true';

// TiDB Cloud speaks MySQL; default port 4000; TLS recommended
const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port,
  connectTimeout: 10000,
  ssl: useSsl ? { minVersion: 'TLSv1.2' } : undefined,
});

// Test the connection
pool.getConnection((err, connection) => {
  if (err) {
    console.error('ƒ?O Failed to connect to the database:', err.message);
    console.error('DB_HOST:', process.env.DB_HOST || '(empty)');
    console.error('DB_USER:', process.env.DB_USER || '(empty)');
  } else {
    console.log('ƒo. Successfully connected to the database!');
    connection.release();
  }
});

module.exports = pool.promise();
