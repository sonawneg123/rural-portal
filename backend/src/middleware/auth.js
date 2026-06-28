// src/middleware/auth.js
const jwt        = require('jsonwebtoken');
const { pool }   = require('../config/database');

const authenticate = async (req, res, next) => {
  try {
    const header = req.headers.authorization || '';
    const token  = header.startsWith('Bearer ') ? header.slice(7) : null;
    if (!token)
      return res.status(401).json({ success: false, message: 'No token provided' });

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const [rows]  = await pool.query(
      'SELECT id, name, email, role, is_active FROM users WHERE id = ?',
      [decoded.id]
    );

    if (!rows.length || !rows[0].is_active)
      return res.status(401).json({ success: false, message: 'User not found or deactivated' });

    req.user = rows[0];
    next();
  } catch {
    return res.status(401).json({ success: false, message: 'Invalid or expired token' });
  }
};

const requireAdmin = (req, res, next) => {
  if (req.user?.role !== 'admin')
    return res.status(403).json({ success: false, message: 'Admin access required' });
  next();
};

const optionalAuth = async (req, res, next) => {
  try {
    const header = req.headers.authorization || '';
    const token  = header.startsWith('Bearer ') ? header.slice(7) : null;
    if (!token) { req.user = null; return next(); }
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const [rows]  = await pool.query('SELECT id, name, email, role FROM users WHERE id = ?', [decoded.id]);
    req.user = rows[0] || null;
    next();
  } catch {
    req.user = null;
    next();
  }
};

module.exports = { authenticate, requireAdmin, optionalAuth };
