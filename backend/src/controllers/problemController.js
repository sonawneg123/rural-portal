// src/controllers/problemController.js
const { pool }   = require('../config/database');
const { generateProblemSummary } = require('../config/groq');
const { validationResult } = require('express-validator');
const logger = require('../config/logger');

// POST /api/problems
exports.createProblem = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty())
    return res.status(400).json({ success: false, errors: errors.array() });

  const { title, description, category_id, state, district, village, pincode, latitude, longitude } = req.body;

  try {
    // Validate category exists
    const [cat] = await pool.query(
      'SELECT name FROM categories WHERE id = ? AND is_active = 1', [category_id]
    );
    if (!cat.length)
      return res.status(400).json({ success: false, message: 'Invalid category' });

    // ── Groq AI: generate summary + tags ────────────────────
    const location = `${village}, ${district}, ${state}`;
    const { summary: ai_summary, tags } = await generateProblemSummary(
      title, description, cat[0].name, location
    );
    const ai_tags = tags.join(',');
    logger.info(`Groq processed problem: "${title}" → tags: [${ai_tags}]`);
    // ────────────────────────────────────────────────────────

    const [result] = await pool.query(
      `INSERT INTO problems
         (user_id, category_id, title, description, ai_summary, ai_tags,
          state, district, village, pincode, latitude, longitude)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [req.user.id, category_id, title, description, ai_summary, ai_tags,
       state, district, village, pincode || null,
       latitude || null, longitude || null]
    );

    const problemId = result.insertId;

    // Save S3 photo references
    if (req.files?.length) {
      const photoVals = req.files.map((f) => [
        problemId, f.originalname, f.key, f.location, f.size, f.mimetype,
      ]);
      await pool.query(
        'INSERT INTO problem_photos (problem_id, filename, s3_key, s3_url, size_bytes, mime_type) VALUES ?',
        [photoVals]
      );
    }

    res.status(201).json({
      success:    true,
      message:    'Problem reported successfully',
      problemId,
      ai_summary,
      ai_tags:    tags,
    });
  } catch (err) {
    logger.error('Create problem error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// GET /api/problems — public paginated list with filters
exports.getProblems = async (req, res) => {
  const {
    state, district, village, category_id, status, search,
    page = 1, limit = 12, sort = 'newest',
  } = req.query;

  const offset = (parseInt(page) - 1) * parseInt(limit);
  const where  = ['1=1'];
  const params = [];

  if (state)       { where.push('p.state = ?');        params.push(state); }
  if (district)    { where.push('p.district = ?');      params.push(district); }
  if (village)     { where.push('p.village = ?');       params.push(village); }
  if (category_id) { where.push('p.category_id = ?');  params.push(category_id); }
  if (status)      { where.push('p.status = ?');        params.push(status); }
  if (search)      {
    where.push('MATCH(p.title, p.description) AGAINST(? IN BOOLEAN MODE)');
    params.push(search + '*');
  }

  const orderMap = {
    newest:  'p.created_at DESC',
    oldest:  'p.created_at ASC',
    popular: 'p.upvotes DESC',
    views:   'p.views DESC',
  };
  const order = orderMap[sort] || 'p.created_at DESC';

  try {
    const [[{ total }]] = await pool.query(
      `SELECT COUNT(*) AS total FROM problems p WHERE ${where.join(' AND ')}`, params
    );

    const [problems] = await pool.query(
      `SELECT p.id, p.title, p.description, p.ai_summary, p.ai_tags,
              p.state, p.district, p.village, p.status, p.priority,
              p.upvotes, p.views, p.created_at,
              c.name AS category, c.icon AS category_icon, c.color AS category_color,
              u.name AS reporter_name,
              (SELECT s3_url FROM problem_photos WHERE problem_id = p.id LIMIT 1) AS thumbnail
       FROM problems p
       JOIN categories c ON c.id = p.category_id
       JOIN users u      ON u.id = p.user_id
       WHERE ${where.join(' AND ')}
       ORDER BY ${order}
       LIMIT ? OFFSET ?`,
      [...params, parseInt(limit), offset]
    );

    // Bump view counts in background
    if (problems.length) {
      const ids = problems.map((p) => p.id);
      pool.query(
        `UPDATE problems SET views = views + 1 WHERE id IN (${ids.map(() => '?').join(',')})`,
        ids
      );
    }

    res.json({
      success: true,
      data:    problems,
      pagination: {
        total,
        page:       parseInt(page),
        limit:      parseInt(limit),
        totalPages: Math.ceil(total / parseInt(limit)),
      },
    });
  } catch (err) {
    logger.error('Get problems error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// GET /api/problems/:id
exports.getProblemById = async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT p.*, c.name AS category, c.icon AS category_icon, c.color AS category_color,
              u.name AS reporter_name, u.village AS reporter_village, u.district AS reporter_district
       FROM problems p
       JOIN categories c ON c.id = p.category_id
       JOIN users u      ON u.id = p.user_id
       WHERE p.id = ?`,
      [req.params.id]
    );
    if (!rows.length)
      return res.status(404).json({ success: false, message: 'Problem not found' });

    const [photos] = await pool.query(
      'SELECT id, s3_url, filename FROM problem_photos WHERE problem_id = ?',
      [rows[0].id]
    );
    const [comments] = await pool.query(
      `SELECT cm.id, cm.content, cm.is_official, cm.created_at, u.name AS author
       FROM comments cm JOIN users u ON u.id = cm.user_id
       WHERE cm.problem_id = ? ORDER BY cm.created_at ASC`,
      [rows[0].id]
    );

    res.json({ success: true, data: { ...rows[0], photos, comments } });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// POST /api/problems/:id/upvote
exports.upvoteProblem = async (req, res) => {
  try {
    await pool.query(
      'INSERT IGNORE INTO upvotes (problem_id, user_id) VALUES (?, ?)',
      [req.params.id, req.user.id]
    );
    await pool.query(
      'UPDATE problems SET upvotes = (SELECT COUNT(*) FROM upvotes WHERE problem_id = ?) WHERE id = ?',
      [req.params.id, req.params.id]
    );
    const [[{ upvotes }]] = await pool.query('SELECT upvotes FROM problems WHERE id = ?', [req.params.id]);
    res.json({ success: true, upvotes });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// GET /api/problems/my
exports.getMyProblems = async (req, res) => {
  const [rows] = await pool.query(
    `SELECT p.id, p.title, p.status, p.priority, p.upvotes, p.views,
            p.ai_summary, p.created_at,
            c.name AS category, c.color AS category_color
     FROM problems p JOIN categories c ON c.id = p.category_id
     WHERE p.user_id = ? ORDER BY p.created_at DESC`,
    [req.user.id]
  );
  res.json({ success: true, data: rows });
};
