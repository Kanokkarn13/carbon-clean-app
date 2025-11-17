// routes/rewards.js
const express = require('express');
const router = express.Router();
const db = require('../config/db');
const { verifyToken, verifyAdmin } = require('../middleware/auth');

// แปลง/กรองค่าให้ตรง schema DB
function sanitizeReward(body) {
  const out = {};
  if (body.title !== undefined) out.title = String(body.title).slice(0, 120);
  if (body.description !== undefined) out.description = String(body.description);
  if (body.image_url !== undefined) {
    const v = String(body.image_url).trim();
    out.image_url = v === '' ? null : v.slice(0, 255);
  }
  if (body.cost_points !== undefined) out.cost_points = Number(body.cost_points) || 0;
  if (body.stock !== undefined) out.stock = Number(body.stock) || 0;
  if (body.active !== undefined) out.active = Number(body.active) ? 1 : 0;
  if (body.expires_at !== undefined) {
    // รับทั้ง 'YYYY-MM-DDTHH:mm' (จาก input datetime-local) และรูปแบบอื่น ๆ
    const dt = new Date(body.expires_at);
    out.expires_at = isNaN(dt.getTime()) ? null : dt; // ให้ mysql driver แปลงเป็น DATETIME
  }
  return out;
}

/** GET: ทั้งหมด */
router.get('/rewards', verifyToken, verifyAdmin, async (_req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT id, title, description, image_url, cost_points,
              expires_at, active, stock, created_at, updated_at
       FROM rewards
       ORDER BY id DESC`
    );
    // ensure active เป็นตัวเลข 0/1
    const data = rows.map(r => ({ ...r, active: Number(r.active) }));
    res.json({ success: true, data });
  } catch (err) {
    console.error('GET /admin/rewards error:', err);
    res.status(500).json({ success: false, message: 'DB error' });
  }
});

/** POST: สร้างใหม่ */
router.post('/rewards', verifyToken, verifyAdmin, async (req, res) => {
  try {
    const payload = sanitizeReward(req.body);
    const required = ['title', 'cost_points', 'stock'];
    for (const k of required) {
      if (payload[k] === undefined || payload[k] === null || payload[k] === '') {
        return res.status(400).json({ success: false, message: `Missing field: ${k}` });
      }
    }
    payload.active = payload.active ?? 1;

    const [rs] = await db.query(`INSERT INTO rewards SET ?`, payload);
    const [rows] = await db.query(
      `SELECT id, title, description, image_url, cost_points,
              expires_at, active, stock, created_at, updated_at
       FROM rewards WHERE id = ?`, [rs.insertId]
    );
    const r = rows[0];
    r.active = Number(r.active);
    res.status(201).json({ success: true, data: r });
  } catch (err) {
    console.error('POST /admin/rewards error:', err);
    res.status(500).json({ success: false, message: 'DB error' });
  }
});

/** PUT: แก้ไขทั้งแถว */
router.put('/rewards/:id', verifyToken, verifyAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const payload = sanitizeReward(req.body);
    if (Object.keys(payload).length === 0) {
      return res.status(400).json({ success: false, message: 'No valid fields' });
    }
    await db.query(`UPDATE rewards SET ? WHERE id = ?`, [payload, id]);
    const [rows] = await db.query(
      `SELECT id, title, description, image_url, cost_points,
              expires_at, active, stock, created_at, updated_at
       FROM rewards WHERE id = ?`, [id]
    );
    if (!rows.length) return res.status(404).json({ success: false, message: 'Not found' });
    const r = rows[0];
    r.active = Number(r.active);
    res.json({ success: true, data: r });
  } catch (err) {
    console.error('PUT /admin/rewards/:id error:', err);
    res.status(500).json({ success: false, message: 'DB error' });
  }
});

/** PATCH: toggle active */
router.patch('/rewards/:id/toggle', verifyToken, verifyAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    await db.query(`UPDATE rewards SET active = 1 - active WHERE id = ?`, [id]);
    const [rows] = await db.query(
      `SELECT id, title, description, image_url, cost_points,
              expires_at, active, stock, created_at, updated_at
       FROM rewards WHERE id = ?`, [id]
    );
    if (!rows.length) return res.status(404).json({ success: false, message: 'Not found' });
    const r = rows[0];
    r.active = Number(r.active);
    res.json({ success: true, data: r });
  } catch (err) {
    console.error('PATCH /admin/rewards/:id/toggle error:', err);
    res.status(500).json({ success: false, message: 'DB error' });
  }
});

/** DELETE */
router.delete('/rewards/:id', verifyToken, verifyAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    await db.query(`DELETE FROM rewards WHERE id = ?`, [id]);
    res.json({ success: true, message: 'Deleted' });
  } catch (err) {
    console.error('DELETE /admin/rewards/:id error:', err);
    res.status(500).json({ success: false, message: 'DB error' });
  }
});

module.exports = router;
