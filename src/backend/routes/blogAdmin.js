// src/backend/routes/blogAdmin.js
const express = require('express');
const router = express.Router();

const db = require('../config/db');
const { verifyToken, verifyAdmin } = require('../middleware/auth');

const multer = require('multer');
const path = require('path');
const crypto = require('crypto');

const { uploadBufferToS3, getSignedGetObjectUrl } = require('../utils/s3');

/* ───────────────────────── Multer (memory) ───────────────────────── */
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
});

/* ───────────────────────── Config ───────────────────────── */
const TABLE = 'knowledge_article'; // ตารางบทความ

/* ───────────────────────── Utils ───────────────────────── */
function safeInt(v, def = 0) {
  const n = Number(v);
  return Number.isFinite(n) ? n : def;
}

// make req.protocol reliable on Render/Proxy (ถ้า index.js ยังไม่ได้ set trust proxy)
function getBaseUrl(req) {
  const proto =
    (req.headers['x-forwarded-proto'] && String(req.headers['x-forwarded-proto']).split(',')[0]) ||
    req.protocol ||
    'http';
  return `${proto}://${req.get('host')}`;
}

function makePublicFileUrl(req, key) {
  const base = getBaseUrl(req);
  return `${base}/api/admin/blogs/file?key=${encodeURIComponent(key)}`;
}

function reqId() {
  return `${Date.now().toString(36)}-${crypto.randomBytes(3).toString('hex')}`;
}

function summarizeErr(err) {
  // mysql2 error fields: code, errno, sqlState, sqlMessage, sql
  // aws sdk v3 error fields: name, Code, $metadata, message
  return {
    name: err?.name,
    message: err?.message || String(err),
    code: err?.code || err?.Code,
    errno: err?.errno,
    sqlState: err?.sqlState,
    sqlMessage: err?.sqlMessage,
    sql: err?.sql,
    metadata: err?.$metadata,
    stack: process.env.NODE_ENV === 'production' ? undefined : err?.stack,
  };
}

function debug(rid, ...args) {
  console.log(`[blogAdmin][${rid}]`, ...args);
}

/* ───────────────────────── READ: List ─────────────────────────
   GET /api/admin/blogs
   - alias updated_at → update_at ให้ FE ใช้ field เดิมได้ */
router.get('/blogs', verifyToken, verifyAdmin, async (req, res) => {
  const rid = reqId();
  debug(rid, 'GET /blogs start');
  try {
    const [rows] = await db.query(`
      SELECT
        ka.id,
        ka.title,
        ka.content,
        ka.author_id,
        ka.create_at,
        ka.updated_at AS update_at,
        ka.cover_image_url,
        CONCAT(COALESCE(u.fname,''), ' ', COALESCE(u.lname,'')) AS author_name
      FROM ${TABLE} ka
      LEFT JOIN users u ON u.user_id = ka.author_id
      ORDER BY ka.id DESC
    `);

    debug(rid, 'GET /blogs ok -> rows:', rows?.length);
    return res.json({ success: true, data: rows, rid });
  } catch (err) {
    const info = summarizeErr(err);
    console.error(`[blogAdmin][${rid}] GET /blogs error:`, info);
    return res.status(500).json({ message: 'DB error', rid, error: info });
  }
});

/* ───────────────────────── CREATE ─────────────────────────
   POST /api/admin/blogs   (multipart/form-data)
   fields: title, content, author_id, cover (file) */
router.post(
  '/blogs',
  verifyToken,
  verifyAdmin,
  upload.single('cover'),
  async (req, res) => {
    const rid = reqId();
    debug(rid, 'POST /blogs start', {
      hasFile: !!req.file,
      fileSize: req.file?.size,
      fileType: req.file?.mimetype,
      bodyKeys: Object.keys(req.body || {}),
    });

    try {
      let coverUrl = null;

      // 1) Upload cover (optional)
      if (req.file) {
        const ext = path.extname(req.file.originalname || '').toLowerCase() || '.bin';
        const filename = `${Date.now()}-${crypto.randomBytes(6).toString('hex')}${ext}`;
        const key = `blog/${filename}`;

        debug(rid, 'uploading cover -> key:', key);
        await uploadBufferToS3({
          buffer: req.file.buffer,
          contentType: req.file.mimetype,
          key,
        });

        coverUrl = makePublicFileUrl(req, key);
        debug(rid, 'cover uploaded ok -> coverUrl:', coverUrl);
      }

      // 2) Validate payload
      const title = String(req.body.title || '').slice(0, 150);
      const content = String(req.body.content || '');
      const author_id = safeInt(req.body.author_id, 0);

      debug(rid, 'payload parsed', { titleLen: title.length, contentLen: content.length, author_id });

      if (!title || !content || !author_id) {
        debug(rid, 'bad request: missing fields');
        return res.status(400).json({ message: 'title, content, author_id are required', rid });
      }

      // 3) Validate user exists (อย่ากลืน error จะได้รู้ schema จริง)
      try {
        const [u] = await db.query(`SELECT user_id FROM users WHERE user_id = ?`, [author_id]);
        if (!u.length) {
          debug(rid, 'author_id not found in users:', author_id);
          return res.status(400).json({ message: 'author_id not found', rid });
        }
      } catch (e) {
        const info = summarizeErr(e);
        console.error(`[blogAdmin][${rid}] author validate query failed:`, info);
        return res.status(500).json({
          message: 'User validate query failed (check users PK column name)',
          rid,
          error: info,
        });
      }

      // 4) Insert
      debug(rid, 'inserting into DB...');
      const [rs] = await db.query(
        `INSERT INTO ${TABLE} (title, content, author_id, create_at, updated_at, cover_image_url)
         VALUES (?, ?, ?, CURDATE(), CURDATE(), ?)`,
        [title, content, author_id, coverUrl]
      );

      debug(rid, 'insert ok -> insertId:', rs?.insertId);

      // 5) Return inserted row
      const [rows] = await db.query(
        `SELECT id, title, content, author_id, create_at, updated_at AS update_at, cover_image_url
         FROM ${TABLE} WHERE id = ?`,
        [rs.insertId]
      );

      debug(rid, 'select inserted ok');
      return res.status(201).json({ success: true, data: rows[0], rid });
    } catch (err) {
      const info = summarizeErr(err);
      console.error(`[blogAdmin][${rid}] POST /blogs error:`, info);

      return res.status(500).json({
        message: 'Create failed',
        rid,
        error: info,
      });
    }
  }
);

/* ───────────────────────── UPDATE ─────────────────────────
   PUT /api/admin/blogs/:id  (multipart/form-data) */
router.put(
  '/blogs/:id',
  verifyToken,
  verifyAdmin,
  upload.single('cover'),
  async (req, res) => {
    const rid = reqId();
    debug(rid, 'PUT /blogs/:id start', {
      id: req.params.id,
      hasFile: !!req.file,
      bodyKeys: Object.keys(req.body || {}),
    });

    try {
      const { id } = req.params;
      const fields = [];
      const values = [];

      if (req.body.title !== undefined) {
        fields.push('title = ?');
        values.push(String(req.body.title).slice(0, 150));
      }
      if (req.body.content !== undefined) {
        fields.push('content = ?');
        values.push(String(req.body.content));
      }
      if (req.body.author_id !== undefined) {
        const author_id = safeInt(req.body.author_id, 0);
        if (!author_id) return res.status(400).json({ message: 'Invalid author_id', rid });

        // validate user exists (อย่ากลืน error)
        try {
          const [u] = await db.query(`SELECT user_id FROM users WHERE user_id = ?`, [author_id]);
          if (!u.length) return res.status(400).json({ message: 'author_id not found', rid });
        } catch (e) {
          const info = summarizeErr(e);
          console.error(`[blogAdmin][${rid}] author validate query failed:`, info);
          return res.status(500).json({
            message: 'User validate query failed (check users PK column name)',
            rid,
            error: info,
          });
        }

        fields.push('author_id = ?');
        values.push(author_id);
      }

      if (req.file) {
        const ext = path.extname(req.file.originalname || '').toLowerCase() || '.bin';
        const filename = `${Date.now()}-${crypto.randomBytes(6).toString('hex')}${ext}`;
        const key = `blog/${filename}`;

        debug(rid, 'uploading new cover -> key:', key);
        await uploadBufferToS3({ buffer: req.file.buffer, contentType: req.file.mimetype, key });

        fields.push('cover_image_url = ?');
        values.push(makePublicFileUrl(req, key));
      }

      if (!fields.length) return res.status(400).json({ message: 'No fields to update', rid });

      // update timestamp (DATE)
      fields.push('updated_at = CURDATE()');

      debug(rid, 'updating DB...', { fields });
      await db.query(`UPDATE ${TABLE} SET ${fields.join(', ')} WHERE id = ?`, [...values, id]);

      const [rows] = await db.query(
        `
        SELECT
          ka.id,
          ka.title,
          ka.content,
          ka.author_id,
          ka.create_at,
          ka.updated_at AS update_at,
          ka.cover_image_url,
          CONCAT(COALESCE(u.fname,''), ' ', COALESCE(u.lname,'')) AS author_name
        FROM ${TABLE} ka
        LEFT JOIN users u ON u.user_id = ka.author_id
        WHERE ka.id = ?
      `,
        [id]
      );

      debug(rid, 'PUT ok');
      return res.json({ success: true, data: rows[0] || null, rid });
    } catch (err) {
      const info = summarizeErr(err);
      console.error(`[blogAdmin][${rid}] PUT /blogs/:id error:`, info);
      return res.status(500).json({ message: 'Update failed', rid, error: info });
    }
  }
);

/* ───────────────────────── DELETE ─────────────────────────
   DELETE /api/admin/blogs/:id */
router.delete('/blogs/:id', verifyToken, verifyAdmin, async (req, res) => {
  const rid = reqId();
  debug(rid, 'DELETE /blogs/:id start', { id: req.params.id });

  try {
    await db.query(`DELETE FROM ${TABLE} WHERE id = ?`, [req.params.id]);
    debug(rid, 'DELETE ok');
    return res.json({ success: true, rid });
  } catch (err) {
    const info = summarizeErr(err);
    console.error(`[blogAdmin][${rid}] DELETE /blogs/:id error:`, info);
    return res.status(500).json({ message: 'Delete failed', rid, error: info });
  }
});

/* ───────────────────────── Inline image upload (Quill) ─────────────────────────
   POST /api/admin/blogs/upload (multipart: image) */
router.post(
  '/blogs/upload',
  verifyToken,
  verifyAdmin,
  upload.single('image'),
  async (req, res) => {
    const rid = reqId();
    debug(rid, 'POST /blogs/upload start', {
      hasFile: !!req.file,
      fileSize: req.file?.size,
      fileType: req.file?.mimetype,
    });

    try {
      if (!req.file) return res.status(400).json({ message: 'image is required', rid });

      const ext = path.extname(req.file.originalname || '').toLowerCase() || '.bin';
      const filename = `${Date.now()}-${crypto.randomBytes(6).toString('hex')}${ext}`;
      const key = `blog/${filename}`;

      debug(rid, 'uploading inline image -> key:', key);
      await uploadBufferToS3({ buffer: req.file.buffer, contentType: req.file.mimetype, key });

      const url = makePublicFileUrl(req, key);
      debug(rid, 'upload inline ok -> url:', url);
      return res.json({ success: true, url, key, rid });
    } catch (err) {
      const info = summarizeErr(err);
      console.error(`[blogAdmin][${rid}] POST /blogs/upload error:`, info);
      return res.status(500).json({ message: 'Upload failed', rid, error: info });
    }
  }
);

/* ───────────────────────── PUBLIC redirect → signed S3 URL ─────────────────────────
   GET /api/admin/blogs/file?key=blog%2F<filename> (no auth) */
router.get('/blogs/file', async (req, res) => {
  const rid = reqId();
  debug(rid, 'GET /blogs/file start', { key: req.query.key });

  try {
    const key = decodeURIComponent(String(req.query.key || ''));
    if (!key.startsWith('blog/')) return res.status(400).send('invalid key');

    const signed = await getSignedGetObjectUrl(key, 60 * 60);
    debug(rid, 'signed url ok -> redirect');
    return res.redirect(302, signed);
  } catch (err) {
    const info = summarizeErr(err);
    console.error(`[blogAdmin][${rid}] GET /blogs/file error:`, info);
    return res.status(500).json({ message: 'cannot get file', rid, error: info });
  }
});

module.exports = router;
