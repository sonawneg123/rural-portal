// src/controllers/adminController.js
const { pool } = require('../config/database');
const { generateAdminInsight } = require('../config/groq');
const logger = require('../config/logger');

// GET /api/admin/dashboard
exports.getDashboard = async (req, res) => {
  try {
    const [[summary]]   = await pool.query('SELECT * FROM v_dashboard_summary');
    const [byCategory]  = await pool.query(
      `SELECT c.name, c.color, c.icon, COUNT(p.id) AS count
       FROM categories c LEFT JOIN problems p ON p.category_id = c.id
       GROUP BY c.id ORDER BY count DESC`
    );
    const [byState]     = await pool.query(
      'SELECT state, COUNT(*) AS count FROM problems GROUP BY state ORDER BY count DESC LIMIT 10'
    );
    const [recentProbs] = await pool.query(
      `SELECT p.id, p.title, p.status, p.priority, p.created_at, p.upvotes,
              c.name AS category, u.name AS reporter
       FROM problems p
       JOIN categories c ON c.id = p.category_id
       JOIN users u      ON u.id = p.user_id
       ORDER BY p.created_at DESC LIMIT 10`
    );
    res.json({ success: true, data: { summary, byCategory, byState, recentProblems: recentProbs } });
  } catch (err) {
    logger.error('Dashboard error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// GET /api/admin/problems
exports.getAllProblems = async (req, res) => {
  const { status, priority, state, district, category_id, page = 1, limit = 20 } = req.query;
  const offset = (parseInt(page) - 1) * parseInt(limit);
  const where  = ['1=1'];
  const params = [];

  if (status)      { where.push('p.status = ?');       params.push(status); }
  if (priority)    { where.push('p.priority = ?');      params.push(priority); }
  if (state)       { where.push('p.state = ?');         params.push(state); }
  if (district)    { where.push('p.district = ?');      params.push(district); }
  if (category_id) { where.push('p.category_id = ?');  params.push(category_id); }

  try {
    const [[{ total }]] = await pool.query(
      `SELECT COUNT(*) AS total FROM problems p WHERE ${where.join(' AND ')}`, params
    );
    const [rows] = await pool.query(
      `SELECT p.id, p.title, p.status, p.priority, p.state, p.district, p.village,
              p.upvotes, p.views, p.ai_summary, p.ai_tags, p.created_at,
              c.name AS category, u.name AS reporter, u.email AS reporter_email
       FROM problems p
       JOIN categories c ON c.id = p.category_id
       JOIN users u      ON u.id = p.user_id
       WHERE ${where.join(' AND ')}
       ORDER BY p.created_at DESC LIMIT ? OFFSET ?`,
      [...params, parseInt(limit), offset]
    );
    res.json({
      success: true, data: rows,
      pagination: { total, page: parseInt(page), limit: parseInt(limit), totalPages: Math.ceil(total / parseInt(limit)) },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// PATCH /api/admin/problems/:id/status
exports.updateProblemStatus = async (req, res) => {
  const { status, priority, admin_notes } = req.body;
  const { id } = req.params;
  try {
    const [[old]] = await pool.query('SELECT status, priority FROM problems WHERE id = ?', [id]);
    if (!old) return res.status(404).json({ success: false, message: 'Problem not found' });

    const updates = [];
    const vals    = [];
    if (status)      { updates.push('status = ?');      vals.push(status); }
    if (priority)    { updates.push('priority = ?');     vals.push(priority); }
    if (admin_notes) { updates.push('admin_notes = ?');  vals.push(admin_notes); }
    if (status === 'resolved') updates.push('resolved_at = NOW()');

    if (!updates.length)
      return res.status(400).json({ success: false, message: 'Nothing to update' });

    await pool.query(`UPDATE problems SET ${updates.join(', ')} WHERE id = ?`, [...vals, id]);
    await pool.query(
      `INSERT INTO status_history
         (problem_id, changed_by, old_status, new_status, old_priority, new_priority, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [id, req.user.id, old.status, status || old.status, old.priority, priority || old.priority, admin_notes || null]
    );

    const [[prob]] = await pool.query('SELECT user_id, title FROM problems WHERE id = ?', [id]);
    await pool.query(
      `INSERT INTO notifications (user_id, problem_id, type, title, message) VALUES (?, ?, 'status_change', ?, ?)`,
      [prob.user_id, id, 'Problem Status Updated',
       `Your problem "${prob.title}" status changed to ${status || old.status}`]
    );

    res.json({ success: true, message: 'Problem updated successfully' });
  } catch (err) {
    logger.error('Update status error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// GET /api/admin/problems/:id/insight — Groq AI action suggestion for admin
exports.getProblemInsight = async (req, res) => {
  try {
    const [[prob]] = await pool.query(
      `SELECT p.title, p.description, p.status, p.priority, p.upvotes,
              p.state, p.district, c.name AS category
       FROM problems p JOIN categories c ON c.id = p.category_id
       WHERE p.id = ?`,
      [req.params.id]
    );
    if (!prob) return res.status(404).json({ success: false, message: 'Problem not found' });

    const insight = await generateAdminInsight(prob);
    res.json({ success: true, insight });
  } catch (err) {
    logger.error('Insight error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// GET /api/admin/users
exports.getUsers = async (req, res) => {
  const { page = 1, limit = 20 } = req.query;
  const offset = (parseInt(page) - 1) * parseInt(limit);
  try {
    const [[{ total }]] = await pool.query("SELECT COUNT(*) AS total FROM users WHERE role = 'user'");
    const [rows] = await pool.query(
      `SELECT u.id, u.name, u.email, u.phone, u.state, u.district, u.village,
              u.is_active, u.created_at,
              (SELECT COUNT(*) FROM problems WHERE user_id = u.id) AS problems_count
       FROM users u WHERE u.role = 'user' ORDER BY u.created_at DESC LIMIT ? OFFSET ?`,
      [parseInt(limit), offset]
    );
    res.json({ success: true, data: rows,
      pagination: { total, page: parseInt(page), totalPages: Math.ceil(total / parseInt(limit)) } });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// PATCH /api/admin/users/:id/toggle
exports.toggleUser = async (req, res) => {
  try {
    await pool.query(
      'UPDATE users SET is_active = NOT is_active WHERE id = ? AND role = "user"',
      [req.params.id]
    );
    res.json({ success: true, message: 'User status toggled' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};
