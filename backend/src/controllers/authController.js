// src/controllers/authController.js
const bcrypt = require('bcryptjs');
const jwt    = require('jsonwebtoken');
const { pool } = require('../config/database');
const { validationResult } = require('express-validator');

const signToken = (user) =>
  jwt.sign({ id: user.id, role: user.role }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  });

// POST /api/auth/register
exports.register = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty())
    return res.status(400).json({ success: false, errors: errors.array() });

  const { name, email, password, phone, state, district, village } = req.body;
  try {
    const [existing] = await pool.query('SELECT id FROM users WHERE email = ?', [email]);
    if (existing.length)
      return res.status(409).json({ success: false, message: 'Email already registered' });

    const hashed = await bcrypt.hash(password, 12);
    const [result] = await pool.query(
      `INSERT INTO users (name, email, password, phone, state, district, village)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [name, email, hashed, phone || null, state, district, village]
    );

    const user  = { id: result.insertId, role: 'user', name, email, state, district, village };
    const token = signToken(user);
    res.status(201).json({ success: true, message: 'Registration successful', token,
      user: { id: user.id, name, email, state, district, village, role: 'user' } });
  } catch (err) {
    console.error('Register error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// POST /api/auth/login
exports.login = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty())
    return res.status(400).json({ success: false, errors: errors.array() });

  const { email, password } = req.body;
  try {
    const [rows] = await pool.query(
      'SELECT id, name, email, password, role, state, district, village, is_active FROM users WHERE email = ?',
      [email]
    );
    if (!rows.length)
      return res.status(401).json({ success: false, message: 'Invalid email or password' });

    const user = rows[0];
    if (!user.is_active)
      return res.status(403).json({ success: false, message: 'Account deactivated' });

    const match = await bcrypt.compare(password, user.password);
    if (!match)
      return res.status(401).json({ success: false, message: 'Invalid email or password' });

    const token = signToken(user);
    const { password: _, ...safeUser } = user;
    res.json({ success: true, token, user: safeUser });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// GET /api/auth/me
exports.getMe = async (req, res) => {
  const [rows] = await pool.query(
    'SELECT id, name, email, phone, state, district, village, role, created_at FROM users WHERE id = ?',
    [req.user.id]
  );
  if (!rows.length)
    return res.status(404).json({ success: false, message: 'User not found' });
  res.json({ success: true, user: rows[0] });
};
