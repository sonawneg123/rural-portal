// src/config/database.js
const mysql  = require('mysql2/promise');
const logger = require('./logger');

const pool = mysql.createPool({
  host:               process.env.DB_HOST,
  port:               parseInt(process.env.DB_PORT || '3306'),
  user:               process.env.DB_USER,
  password:           process.env.DB_PASSWORD,
  database:           process.env.DB_NAME,
  connectionLimit:    parseInt(process.env.DB_POOL_SIZE || '10'),
  waitForConnections: true,
  queueLimit:         0,
  enableKeepAlive:    true,
  keepAliveInitialDelay: 0,
  charset:            'utf8mb4',
  timezone:           '+05:30',
});

async function testConnection() {
  try {
    const conn = await pool.getConnection();
    await conn.ping();
    conn.release();
    logger.info('✅ MySQL RDS connected successfully');
  } catch (err) {
    logger.error('❌ MySQL connection failed:', err.message);
    process.exit(1);
  }
}

module.exports = { pool, testConnection };
