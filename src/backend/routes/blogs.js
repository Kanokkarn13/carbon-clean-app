// routes/blogs.js
const express = require('express');
const router = express.Router();
const db = require('../config/db');
const { verifyToken, verifyAdmin } = require('../middleware/auth');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const TABLE = 'knowledge_article';

// ---------- uploads dir ----------
const ensureDir = (dir) => !fs.existsSync(dir) && fs.mkdirSync(dir, { recursive: true });
const uploadDir = path.join(__dirname, '..', 'uploads', 'blogs');
ensureDir(uploadDir);

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname || '').toLowerCase();
    cb(null, `${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`);
  },
});
const upload = multer({ storage });

// ---------- helpers ----------
const shape = (r) => ({
  id: r.id,
  title: r.title,
  content: r.content,
  author_id: r.author_id,
  create_at: r.create_at ?? r.created_at ?? null,
  update_at: r.update_at ?? r.updated_at ?? null,
  cover_image_url: r.cover_image_url ?? null,
});

async function getArticleColumnInfo() {
  const [cols] = await db.query(`SHOW COLUMNS FROM ${TABLE}`);
  const map = Object.fromEntries(cols.map(c => [c.Field.toLowerCase(), c]));
  // หา created / updated ที่มีอยู่จริง (รองรับทั้ง create_at/created_at และ update_at/updated_at)
  const created =
    map['create_at'] ? { name: 'create_at', type: map['create_at'].Type } :
    map['created_at'] ? { name: 'created_at', type: map['created_at'].Type } :
    null;

  const updated =
    map['update_at'] ? { name: 'update_at', type: map['update_at'].Type } :
    map['updated_at'] ? { name: 'updated_at', type: map['updated_at'].Type } :
    null;

  const cover = map['cover_image_url'] ? { name: 'cover_image_url' } : null;

  return { created, updated, cover };
}

function timeExprFor(mysqlType /* e.g. 'date','datetime','timestamp' */) {
  const t = (mysqlType || '').toLowerCase();
  if (t.startsWith('date') && !t.startsWith('datetime') && !t.startsWith('timestamp')) {
    return 'CURDATE()';
  }
  return 'NOW()';
}

// ─────────────────────────────────────────────────────────────
// GET /api/admin/blogs : list
router.get('/blogs', verifyToken, verifyAdmin, async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT ka.*, u.fname, u.lname
      FROM ${TABLE} ka
      LEFT JOIN users u ON u.user_id = ka.author_id
      ORDER BY ka.id DESC
    `);
    const data = rows.map(r => ({
      ...shape(r),
      author_name: [r.fname, r.lname].filter(Boolean).join(' ') || '-',
    }));
    res.json({ data });
  } catch (err) {
    console.error('GET /admin/blogs error:', err);
    res.status(500).json({ message: 'DB error' });
  }
});

// GET /api/admin/blogs/:id
router.get('/blogs/:id', verifyToken, verifyAdmin, async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT ka.*, u.fname, u.lname
      FROM ${TABLE} ka
      LEFT JOIN users u ON u.user_id = ka.author_id
      WHERE ka.id = ?
    `, [req.params.id]);

    if (!rows.length) return res.status(404).json({ message: 'Not found' });

    const r = rows[0];
    res.json({
      data: {
        ...shape(r),
        author_name: [r.fname, r.lname].filter(Boolean).join(' ') || '-',
      }
    });
  } catch (err) {
    console.error('GET /admin/blogs/:id error:', err);
    res.status(500).json({ message: 'DB error' });
  }
});

// POST /api/admin/blogs : create (multipart: cover optional)
router.post('/blogs', verifyToken, verifyAdmin, upload.single('cover'), async (req, res) => {
  try {
    const { title, content } = req.body;
    let { author_id } = req.body;

    if (!title || !content) {
      return res.status(400).json({ message: 'title, content are required' });
    }

    author_id = Number(author_id ?? req.user?.user_id);
    if (!Number.isFinite(author_id) || author_id <= 0) {
      return res.status(400).json({ message: 'Invalid author_id' });
    }

    // (optional) ตรวจสอบว่ามี user นี้จริง
    try {
      const [u] = await db.query(`SELECT user_id FROM users WHERE user_id = ?`, [author_id]);
      if (!u.length) return res.status(400).json({ message: 'author_id not found' });
    } catch (_) {}

    const { created, updated, cover } = await getArticleColumnInfo();

    const cols = ['title', 'content', 'author_id'];
    const placeholders = ['?', '?', '?'];
    const vals = [String(title).slice(0, 150), content, author_id];

    if (created) {
      placeholders.push(timeExprFor(created.type)); // ใส่เป็น expression
      cols.push(created.name);
    }
    if (updated) {
      placeholders.push(timeExprFor(updated.type)); // ใส่เป็น expression
      cols.push(updated.name);
    }
    if (cover) {
      const coverUrl = req.file ? `/uploads/blogs/${req.file.filename}` : null;
      cols.push(cover.name);
      placeholders.push('?');
      vals.push(coverUrl);
    }

    const sql = `INSERT INTO ${TABLE} (${cols.join(', ')}) VALUES (${placeholders.join(', ')})`;
    const [result] = await db.query(sql, vals);

    const [rows] = await db.query(`SELECT * FROM ${TABLE} WHERE id = ?`, [result.insertId]);
    res.status(201).json({ success: true, data: shape(rows[0]) });
  } catch (err) {
    console.error('POST /admin/blogs error:', err);
    res.status(500).json({ message: 'DB error' });
  }
});

// PUT /api/admin/blogs/:id : update (multipart: cover optional)
router.put('/blogs/:id', verifyToken, verifyAdmin, upload.single('cover'), async (req, res) => {
  try {
    const { title, content } = req.body;
    let { author_id } = req.body;

    const { updated, cover } = await getArticleColumnInfo();

    const sets = [];
    const vals = [];

    if (title !== undefined) { sets.push(`title = ?`); vals.push(String(title).slice(0, 150)); }
    if (content !== undefined) { sets.push(`content = ?`); vals.push(content); }

    if (author_id !== undefined) {
      author_id = Number(author_id);
      if (!Number.isFinite(author_id) || author_id <= 0) {
        return res.status(400).json({ message: 'Invalid author_id' });
      }
      // (optional) ตรวจ user
      try {
        const [u] = await db.query(`SELECT user_id FROM users WHERE user_id = ?`, [author_id]);
        if (!u.length) return res.status(400).json({ message: 'author_id not found' });
      } catch (_) {}
      sets.push(`author_id = ?`); vals.push(author_id);
    }

    if (req.file && cover) {
      const coverUrl = `/uploads/blogs/${req.file.filename}`;
      sets.push(`${cover.name} = ?`); vals.push(coverUrl);
    }

    if (updated) {
      sets.push(`${updated.name} = ${timeExprFor(updated.type)}`);
    }

    if (!sets.length) return res.status(400).json({ message: 'No fields to update' });

    await db.query(`UPDATE ${TABLE} SET ${sets.join(', ')} WHERE id = ?`, [...vals, req.params.id]);

    const [rows] = await db.query(`
      SELECT ka.*, u.fname, u.lname
      FROM ${TABLE} ka
      LEFT JOIN users u ON u.user_id = ka.author_id
      WHERE ka.id = ?
    `, [req.params.id]);

    const r = rows[0];
    res.json({
      success: true,
      data: r ? {
        ...shape(r),
        author_name: [r.fname, r.lname].filter(Boolean).join(' ') || '-',
      } : null,
    });
  } catch (err) {
    console.error('PUT /admin/blogs/:id error:', err);
    res.status(500).json({ message: 'DB error' });
  }
});

// DELETE /api/admin/blogs/:id
router.delete('/blogs/:id', verifyToken, verifyAdmin, async (req, res) => {
  try {
    await db.query(`DELETE FROM ${TABLE} WHERE id = ?`, [req.params.id]);
    res.json({ success: true, message: 'Deleted' });
  } catch (err) {
    console.error('DELETE /admin/blogs/:id error:', err);
    res.status(500).json({ message: 'DB error' });
  }
});

// POST /api/admin/blogs/upload : อัปโหลดรูป inline จาก editor
router.post('/blogs/upload', verifyToken, verifyAdmin, upload.single('image'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: 'No file' });
    const url = `/uploads/blogs/${req.file.filename}`;
    res.json({ success: true, url });
  } catch (err) {
    console.error('POST /admin/blogs/upload error:', err);
    res.status(500).json({ message: 'Upload error' });
  }
});

module.exports = router;
