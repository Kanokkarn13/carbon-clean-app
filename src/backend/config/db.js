require('dotenv').config();
const mysql = require('mysql2');

// Create a connection pool
const pool = mysql.createPool({
  host: process.env.DB_HOST, 
  user: process.env.DB_USER, 
  password: process.env.DB_PASSWORD, 
  database: process.env.DB_NAME, 
  port: process.env.DB_PORT, 
  connectTimeout: 10000,
});

// Test the connection
pool.getConnection((err, connection) => {
  if (err) {
    console.error('❌ Failed to connect to the database:', err.message);
  } else {
    console.log('✅ Successfully connected to the database!');
    connection.release();
  }
});

module.exports = pool.promise();
