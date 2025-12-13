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
function makePublicFileUrl(req, key) {
  // route นี้ถูก mount ที่ /api/admin
  const base = `${req.protocol}://${req.get('host')}`;
  return `${base}/api/admin/blogs/file?key=${encodeURIComponent(key)}`;
}

/* ───────────────────────── READ: List ─────────────────────────
   GET /api/admin/blogs
   - alias updated_at → update_at ให้ FE ใช้ field เดิมได้ */
router.get('/blogs', verifyToken, verifyAdmin, async (_req, res) => {
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
    res.json({ success: true, data: rows });
  } catch (err) {
    console.error('GET /admin/blogs error:', err);
    res.status(500).json({ message: 'DB error' });
  }
});

/* ───────────────────────── CREATE ─────────────────────────
   POST /api/admin/blogs   (multipart/form-data)
   fields: title, content, author_id, cover (file)
   - บันทึกวันที่เป็น DATE ด้วย CURDATE()
   - ถ้ามี cover จะอัปขึ้น S3 แล้วเก็บ URL redirect (/api/admin/blogs/file?key=...) */
router.post(
  '/blogs',
  verifyToken, verifyAdmin,
  upload.single('cover'),
  async (req, res) => {
    try {
      let coverUrl = null;

      if (req.file) {
        const ext = path.extname(req.file.originalname || '').toLowerCase() || '.bin';
        const filename = `${Date.now()}-${crypto.randomBytes(6).toString('hex')}${ext}`;
        const key = `blog/${filename}`;
        await uploadBufferToS3({ buffer: req.file.buffer, contentType: req.file.mimetype, key });
        coverUrl = makePublicFileUrl(req, key);
      }

      const title = String(req.body.title || '').slice(0, 150);
      const content = String(req.body.content || '');
      const author_id = safeInt(req.body.author_id, 0);

      if (!title || !content || !author_id) {
        return res.status(400).json({ message: 'title, content, author_id are required' });
      }

      // ตรวจว่ามี user นี้จริง (optional)
      try {
        const [u] = await db.query(`SELECT user_id FROM users WHERE user_id = ?`, [author_id]);
        if (!u.length) return res.status(400).json({ message: 'author_id not found' });
      } catch (_) {}

      const [rs] = await db.query(
        `INSERT INTO ${TABLE} (title, content, author_id, create_at, updated_at, cover_image_url)
         VALUES (?, ?, ?, CURDATE(), CURDATE(), ?)`,
        [title, content, author_id, coverUrl]
      );

      const [rows] = await db.query(
        `SELECT id, title, content, author_id, create_at, updated_at AS update_at, cover_image_url
         FROM ${TABLE} WHERE id = ?`,
        [rs.insertId]
      );

      res.status(201).json({ success: true, data: rows[0] });
    } catch (err) {
      console.error('POST /admin/blogs error:', err);
      res.status(500).json({ message: 'Create failed',
    error: err?.message || String(err),
    code: err?.code, });
    }
  }
);

/* ───────────────────────── UPDATE ─────────────────────────
   PUT /api/admin/blogs/:id  (multipart/form-data)
   - อัปเดตเฉพาะ fields ที่ส่งมา
   - ถ้ามี cover ใหม่ → อัป S3 แล้วเปลี่ยน URL
   - อัปเดต updated_at = CURDATE() */
router.put(
  '/blogs/:id',
  verifyToken, verifyAdmin,
  upload.single('cover'),
  async (req, res) => {
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
        if (!author_id) return res.status(400).json({ message: 'Invalid author_id' });
        // validate user (optional)
        try {
          const [u] = await db.query(`SELECT user_id FROM users WHERE user_id = ?`, [author_id]);
          if (!u.length) return res.status(400).json({ message: 'author_id not found' });
        } catch (_) {}
        fields.push('author_id = ?');
        values.push(author_id);
      }

      if (req.file) {
        const ext = path.extname(req.file.originalname || '').toLowerCase() || '.bin';
        const filename = `${Date.now()}-${crypto.randomBytes(6).toString('hex')}${ext}`;
        const key = `blog/${filename}`;
        await uploadBufferToS3({ buffer: req.file.buffer, contentType: req.file.mimetype, key });
        fields.push('cover_image_url = ?');
        values.push(makePublicFileUrl(req, key));
      }

      if (!fields.length) return res.status(400).json({ message: 'No fields to update' });

      // อัปเดตวันที่แก้ไข (DATE)
      fields.push('updated_at = CURDATE()');

      await db.query(
        `UPDATE ${TABLE} SET ${fields.join(', ')} WHERE id = ?`,
        [...values, id]
      );

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
        WHERE ka.id = ?
      `, [id]);

      res.json({ success: true, data: rows[0] || null });
    } catch (err) {
      console.error('PUT /admin/blogs/:id error:', err);
      res.status(500).json({ message: 'Update failed' });
    }
  }
);

/* ───────────────────────── DELETE ─────────────────────────
   DELETE /api/admin/blogs/:id */
router.delete('/blogs/:id', verifyToken, verifyAdmin, async (req, res) => {
  try {
    await db.query(`DELETE FROM ${TABLE} WHERE id = ?`, [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    console.error('DELETE /admin/blogs/:id error:', err);
    res.status(500).json({ message: 'Delete failed' });
  }
});

/* ───────────────────────── Inline image upload (Quill) ─────────────────────────
   POST /api/admin/blogs/upload   (multipart: image)
   - คืน URL สาธารณะ (redirect endpoint) ให้แทรกใน editor ได้ทันที */
router.post(
  '/blogs/upload',
  verifyToken, verifyAdmin,
  upload.single('image'),
  async (req, res) => {
    try {
      if (!req.file) return res.status(400).json({ message: 'image is required' });
      const ext = path.extname(req.file.originalname || '').toLowerCase() || '.bin';
      const filename = `${Date.now()}-${crypto.randomBytes(6).toString('hex')}${ext}`;
      const key = `blog/${filename}`;
      await uploadBufferToS3({ buffer: req.file.buffer, contentType: req.file.mimetype, key });
      return res.json({ success: true, url: makePublicFileUrl(req, key), key });
    } catch (err) {
      console.error('POST /admin/blogs/upload error:', err);
      res.status(500).json({ message: 'Upload failed' });
    }
  }
);

/* ───────────────────────── PUBLIC redirect → signed S3 URL ─────────────────────────
   GET /api/admin/blogs/file?key=blog%2F<filename>  (no auth)
   - ใช้ได้ทั้งกับ cover และรูป inline */
router.get('/blogs/file', async (req, res) => {
  try {
    const key = decodeURIComponent(String(req.query.key || ''));
    if (!key.startsWith('blog/')) return res.status(400).send('invalid key');
    const signed = await getSignedGetObjectUrl(key, 60 * 60); // ลิงก์มีอายุ 1 ชม.
    return res.redirect(302, signed);
  } catch (err) {
    console.error('GET /admin/blogs/file error:', err);
    res.status(500).send('cannot get file');
  }
});

module.exports = router;
