// src/backend/routes/blogAdmin.js
const express = require('express');
const router = express.Router();

const db = require('../config/db');
const { verifyToken, verifyAdmin } = require('../middleware/auth');

const { uploadBufferToS3, getSignedGetObjectUrl } = require('../utils/s3');
const multer = require('multer');
const path = require('path');
const crypto = require('crypto');

// --- Multer in-memory ---
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
});

// --- helpers ---
function safeInt(v, def = 0) {
  const n = Number(v);
  return Number.isFinite(n) ? n : def;
}
function nowSqlFragment() {
  return 'NOW()';
}
function toNullableStr(s, max = 255) {
  if (s === undefined || s === null) return null;
  const t = String(s).trim();
  return t === '' ? null : t.slice(0, max);
}

/* =========================================================
   GET /admin/blogs
   - list knowledge_article + author name (ถ้ามีใน users)
========================================================= */
router.get('/blogs', verifyToken, verifyAdmin, async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT a.id, a.title, a.content, a.cover_image_url,
             a.author_id, a.create_at, a.update_at,         -- << เปลี่ยนเป็น update_id ถ้าชื่อตารางคุณเป็นแบบนั้น
             CONCAT(COALESCE(u.fname,''), ' ', COALESCE(u.lname,'')) AS author_name
      FROM knowledge_article a
      LEFT JOIN users u ON u.user_id = a.author_id
      ORDER BY a.id DESC
    `);
    res.json({ success: true, data: rows });
  } catch (err) {
    console.error('GET /admin/blogs error:', err);
    res.status(500).json({ message: 'DB error' });
  }
});

/* =========================================================
   POST /admin/blogs
   form-data: title, content, author_id, (optional) cover
========================================================= */
router.post(
  '/blogs',
  verifyToken,
  verifyAdmin,
  upload.single('cover'),
  async (req, res) => {
    try {
      let { title, content, author_id } = req.body;
      title = String(title || '').slice(0, 150);
      content = String(content || '');
      author_id = safeInt(author_id, 0);

      // handle cover upload -> S3 (folder blog/)
      let coverUrl = null;
      if (req.file) {
        const ext = path.extname(req.file.originalname || '').toLowerCase() || '.bin';
        const filename = `${Date.now()}-${crypto.randomBytes(6).toString('hex')}${ext}`;
        const key = `blog/${filename}`;
        await uploadBufferToS3({
          buffer: req.file.buffer,
          contentType: req.file.mimetype,
          key,
        });
        // return as our proxy url (public, signed redirect)
        const base = `${req.protocol}://${req.get('host')}`;
        coverUrl = `${base}/admin/blogs/file?key=${encodeURIComponent(key)}`;
      }

      await db.query(
        `
        INSERT INTO knowledge_article
          (title, content, cover_image_url, author_id, create_at, update_at)  -- << เปลี่ยน update_at เป็น update_id ถ้าตารางคุณสะกดแบบนั้น
        VALUES
          (?, ?, ?, ?, ${nowSqlFragment()}, ${nowSqlFragment()})
        `,
        [title, content, toNullableStr(coverUrl), author_id]
      );

      res.json({ success: true });
    } catch (err) {
      console.error('POST /admin/blogs error:', err);
      res.status(500).json({ message: err?.message || 'Create blog failed' });
    }
  }
);

/* =========================================================
   PUT /admin/blogs/:id
   form-data: title?, content?, author_id?, cover?
========================================================= */
router.put(
  '/blogs/:id',
  verifyToken,
  verifyAdmin,
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
        fields.push('author_id = ?');
        values.push(safeInt(req.body.author_id, 0));
      }

      // optional new cover
      if (req.file) {
        const ext = path.extname(req.file.originalname || '').toLowerCase() || '.bin';
        const filename = `${Date.now()}-${crypto.randomBytes(6).toString('hex')}${ext}`;
        const key = `blog/${filename}`;
        await uploadBufferToS3({
          buffer: req.file.buffer,
          contentType: req.file.mimetype,
          key,
        });
        const base = `${req.protocol}://${req.get('host')}`;
        const coverUrl = `${base}/admin/blogs/file?key=${encodeURIComponent(key)}`;
        fields.push('cover_image_url = ?');
        values.push(coverUrl);
      }

      if (!fields.length) {
        return res.status(400).json({ message: 'No fields to update' });
      }

      fields.push('update_at = ' + nowSqlFragment()); // << เปลี่ยนเป็น update_id ถ้าตารางคุณเป็นแบบนั้น

      await db.query(
        `UPDATE knowledge_article SET ${fields.join(', ')} WHERE id = ?`,
        [...values, id]
      );

      res.json({ success: true });
    } catch (err) {
      console.error('PUT /admin/blogs/:id error:', err);
      res.status(500).json({ message: err?.message || 'Update blog failed' });
    }
  }
);

/* =========================================================
   DELETE /admin/blogs/:id
========================================================= */
router.delete('/blogs/:id', verifyToken, verifyAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    await db.query(`DELETE FROM knowledge_article WHERE id = ?`, [id]);
    res.json({ success: true });
  } catch (err) {
    console.error('DELETE /admin/blogs/:id error:', err);
    res.status(500).json({ message: 'Delete failed' });
  }
});

/* =========================================================
   POST /admin/blogs/upload
   - Inline image (ReactQuill) field name: "image"
   - Return { url } for editor to embed
========================================================= */
router.post(
  '/blogs/upload',
  verifyToken,
  verifyAdmin,
  upload.single('image'),
  async (req, res) => {
    try {
      const file = req.file;
      if (!file) return res.status(400).json({ message: 'image is required' });

      const ext = path.extname(file.originalname || '').toLowerCase() || '.bin';
      const filename = `${Date.now()}-${crypto.randomBytes(6).toString('hex')}${ext}`;
      const key = `blog/${filename}`;

      await uploadBufferToS3({
        buffer: file.buffer,
        contentType: file.mimetype,
        key,
      });

      const base = `${req.protocol}://${req.get('host')}`;
      const publicUrl = `${base}/admin/blogs/file?key=${encodeURIComponent(key)}`;

      res.json({ success: true, url: publicUrl, key });
    } catch (err) {
      console.error('POST /admin/blogs/upload error:', err);
      res.status(500).json({ message: err?.message || 'upload failed' });
    }
  }
);

/* =========================================================
   GET /admin/blogs/file?key=<S3_KEY>
   - public redirect (ไม่บังคับ auth) -> signed URL (อายุสั้น)
   - อนุญาตเฉพาะ key ที่ขึ้นต้นด้วย blog/
========================================================= */
router.get('/blogs/file', async (req, res) => {
  try {
    const rawKey = String(req.query.key || '');
    const key = decodeURIComponent(rawKey);
    if (!key || !key.startsWith('blog/')) {
      return res.status(400).send('invalid key');
    }
    const signed = await getSignedGetObjectUrl(key, 60 * 60); // 1 hour
    return res.redirect(302, signed);
  } catch (err) {
    console.error('GET /admin/blogs/file error:', err);
    return res.status(500).send('cannot get file');
  }
});

module.exports = router;
