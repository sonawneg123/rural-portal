// src/config/s3.js
const { S3Client } = require('@aws-sdk/client-s3');
const multer       = require('multer');
const multerS3     = require('multer-s3');
const { v4: uuidv4 } = require('uuid');
const path         = require('path');

const s3Client = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId:     process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

const ALLOWED_MIME = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const MAX_SIZE_MB  = 5;

const upload = multer({
  storage: multerS3({
    s3:     s3Client,
    bucket: process.env.S3_BUCKET_NAME,
    acl:    'public-read',
    contentType: multerS3.AUTO_CONTENT_TYPE,
    key: (_req, file, cb) => {
      const ext = path.extname(file.originalname).toLowerCase();
      cb(null, `problems/${Date.now()}-${uuidv4()}${ext}`);
    },
  }),
  limits:     { fileSize: MAX_SIZE_MB * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (ALLOWED_MIME.includes(file.mimetype)) cb(null, true);
    else cb(new Error('Only JPEG, PNG, WEBP, GIF images are allowed'));
  },
});

module.exports = { s3Client, upload };
