// src/server.js
require('dotenv').config();
const express     = require('express');
const cors        = require('cors');
const helmet      = require('helmet');
const morgan      = require('morgan');
const compression = require('compression');
const rateLimit   = require('express-rate-limit');
const { testConnection } = require('./config/database');
const logger      = require('./config/logger');
const routes      = require('./routes');

const app  = express();
const PORT = process.env.PORT || 5000;

// Trust ALB / reverse proxy
app.set('trust proxy', 1);

// ── Security & Middleware ─────────────────────────────────────────────────────
app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.use(cors({
  origin:      process.env.FRONTEND_URL || '*',
  credentials: true,
  methods:     ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));
app.use(compression());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(morgan('combined', { stream: { write: (msg) => logger.info(msg.trim()) } }));

// ── Rate Limiting ─────────────────────────────────────────────────────────────
app.use('/api/', rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000'),
  max:      parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100'),
  standardHeaders: true,
  legacyHeaders:   false,
  message: { success: false, message: 'Too many requests, please try again later.' },
}));

// Stricter auth limiter
app.use('/api/auth/login',    rateLimit({ windowMs: 15 * 60 * 1000, max: 10 }));
app.use('/api/auth/register', rateLimit({ windowMs: 15 * 60 * 1000, max: 10 }));

// ── Routes ────────────────────────────────────────────────────────────────────
app.use('/api', routes);

// ── Global Error Handler ──────────────────────────────────────────────────────
// eslint-disable-next-line no-unused-vars
app.use((err, _req, res, _next) => {
  logger.error(err.stack || err.message);
  if (err.code === 'LIMIT_FILE_SIZE')
    return res.status(400).json({ success: false, message: 'File too large. Max 5 MB per photo.' });
  if (err.message?.includes('Only JPEG'))
    return res.status(400).json({ success: false, message: err.message });
  res.status(err.status || 500).json({
    success: false,
    message: process.env.NODE_ENV === 'production' ? 'Internal server error' : err.message,
  });
});

// ── 404 ───────────────────────────────────────────────────────────────────────
app.use((req, res) =>
  res.status(404).json({ success: false, message: `Route ${req.originalUrl} not found` })
);

// ── Boot ──────────────────────────────────────────────────────────────────────
async function start() {
  await testConnection();
  app.listen(PORT, '0.0.0.0', () => {
    logger.info(`🚀 Rural Portal API running on :${PORT} [${process.env.NODE_ENV}]`);
    logger.info(`🤖 Groq model: ${process.env.GROQ_MODEL || 'llama3-8b-8192'}`);
  });
}

start();
module.exports = app;
