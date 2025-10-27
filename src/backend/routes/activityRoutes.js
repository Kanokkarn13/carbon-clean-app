// routes/activityRoutes.js
const express = require('express');
const db = require('../config/db');
const { saveTransportEmission, listSavedActivities } = require('../controllers/saveEmissionController');
const { saveWalking, updateWalkingCarbon } = require('../controllers/saveWalkingController');
const { saveCycling, updateCyclingCarbon } = require('../controllers/saveCyclingController');

const router = express.Router();

console.log('[activityRoutes] loaded:', __filename, 'ver=r4-crud-walk-cycle');

/* ---------------- helpers ---------------- */
function toNum(v, def = null) {
  const n = Number(v);
  return Number.isFinite(n) ? n : def;
}
function nowGMT7() {
  const now = new Date();
  const gmt7 = new Date(now.getTime() + 7 * 60 * 60 * 1000);
  return gmt7.toISOString().slice(0, 19).replace('T', ' ');
}

/* ---------------- internal: recent activities ---------------- */
async function fetchRecentActivities(userId) {
  const [walks] = await db.query(
    `
    SELECT
      id, title, description, distance_km, step_total, duration_sec, carbonReduce, record_date
    FROM walk_history
    WHERE user_id = ?
    ORDER BY record_date DESC
    LIMIT 50
    `,
    [userId]
  );

  const [bikes] = await db.query(
    `
    SELECT
      id, title, description, distance_km, duration_sec, carbonReduce, record_date
    FROM bic_history
    WHERE user_id = ?
    ORDER BY record_date DESC
    LIMIT 50
    `,
    [userId]
  );

  const activities = [
    ...walks.map(r => ({
      id: r.id,
      type: 'Walking',
      title: r.title ?? null,
      description: r.description ?? null,
      distance_km: r.distance_km != null ? Number(r.distance_km) : 0,
      step_total: r.step_total != null ? Number(r.step_total) : null,
      duration_sec: r.duration_sec != null ? Number(r.duration_sec) : null,
      carbonReduce: r.carbonReduce != null ? Number(r.carbonReduce) : 0,
      record_date: r.record_date,
    })),
    ...bikes.map(r => ({
      id: r.id,
      type: 'Cycling',
      title: r.title ?? null,
      description: r.description ?? null,
      distance_km: r.distance_km != null ? Number(r.distance_km) : 0,
      step_total: null,
      duration_sec: r.duration_sec != null ? Number(r.duration_sec) : null,
      carbonReduce: r.carbonReduce != null ? Number(r.carbonReduce) : 0,
      record_date: r.record_date,
    })),
  ]
    .sort((a, b) => new Date(b.record_date) - new Date(a.record_date))
    .slice(0, 20);

  return { activities };
}

/* ---------------- existing: recent activity endpoints ---------------- */
router.get('/recent-activity/:user_id', async (req, res) => {
  try {
    const out = await fetchRecentActivities(req.params.user_id);
    res.setHeader('Content-Type', 'application/json');
    res.json(out);
  } catch (err) {
    console.error('recent-activity error:', err);
    res.status(500).json({ message: 'Internal server error' });
  }
});

router.get('/recent-activity/full/:user_id', async (req, res) => {
  try {
    const out = await fetchRecentActivities(req.params.user_id);
    res.setHeader('Content-Type', 'application/json');
    res.json(out);
  } catch (err) {
    console.error('recent-activity full error:', err);
    res.status(500).json({ message: 'Internal server error' });
  }
});

router.post('/recent-activity', async (req, res) => {
  try {
    const out = await fetchRecentActivities(req.body?.user_id);
    res.setHeader('Content-Type', 'application/json');
    res.json(out);
  } catch (err) {
    console.error('recent-activity POST error:', err);
    res.status(500).json({ message: 'Internal server error' });
  }
});

/* ---------------- save walking & cycling (create) ---------------- */
router.post('/save-walking', saveWalking);
router.post('/save-cycling', saveCycling);

/* ---------------- transport emission save + list ---------------- */
router.post('/emission', saveTransportEmission);
router.get('/saved/:user_id', listSavedActivities);

/* ---------------- carbon patch (optional, from CarbonOffsetScreen) ---------------- */
router.patch('/walking/:id/carbon', updateWalkingCarbon);
router.patch('/cycling/:id/carbon', updateCyclingCarbon);

/* ======================================================================
 * NEW: CRUD for WALKING
 * ==================================================================== */
// GET one walking activity
router.get('/walking/:id', async (req, res) => {
  try {
    const id = toNum(req.params.id);
    if (!id) return res.status(400).json({ ok: false, message: 'Invalid id' });

    const [rows] = await db.query(
      `SELECT id, user_id, title, description, distance_km, step_total, duration_sec, carbonReduce, record_date
       FROM walk_history WHERE id = ? LIMIT 1`,
      [id]
    );
    if (!rows.length) return res.status(404).json({ ok: false, message: 'Not found' });
    res.json({ ok: true, item: rows[0] });
  } catch (err) {
    console.error('GET /walking/:id error', err);
    res.status(500).json({ ok: false, message: 'Internal server error' });
  }
});

// PATCH edit walking activity
router.patch('/walking/:id', async (req, res) => {
  try {
    const id = toNum(req.params.id);
    if (!id) return res.status(400).json({ ok: false, message: 'Invalid id' });

    // Allowed updatable fields
    const fields = {
      title: req.body?.title ?? undefined,
      description: req.body?.description ?? undefined,
      distance_km: req.body?.distance_km != null ? toNum(req.body.distance_km) : undefined,
      step_total: req.body?.step_total != null ? toNum(req.body.step_total) : undefined,
      duration_sec: req.body?.duration_sec != null ? toNum(req.body.duration_sec) : undefined,
      carbonReduce: req.body?.carbonReduce != null ? toNum(req.body.carbonReduce) : undefined,
    };

    const setParts = [];
    const values = [];
    Object.entries(fields).forEach(([k, v]) => {
      if (v !== undefined) {
        setParts.push(`${k} = ?`);
        values.push(v);
      }
    });

    if (!setParts.length) {
      return res.status(400).json({ ok: false, message: 'No updatable fields provided' });
    }

    values.push(id);
    const [result] = await db.query(
      `UPDATE walk_history SET ${setParts.join(', ')}, record_date = record_date WHERE id = ?`,
      values
    );

    res.json({ ok: true, message: 'Walking activity updated', affectedRows: result?.affectedRows ?? 0, id });
  } catch (err) {
    console.error('PATCH /walking/:id error', err);
    res.status(500).json({ ok: false, message: 'Internal server error' });
  }
});

// DELETE walking activity
router.delete('/walking/:id', async (req, res) => {
  try {
    const id = toNum(req.params.id);
    if (!id) return res.status(400).json({ ok: false, message: 'Invalid id' });

    const [result] = await db.query(`DELETE FROM walk_history WHERE id = ?`, [id]);
    res.json({ ok: true, message: 'Walking activity deleted', affectedRows: result?.affectedRows ?? 0, id });
  } catch (err) {
    console.error('DELETE /walking/:id error', err);
    res.status(500).json({ ok: false, message: 'Internal server error' });
  }
});

/* ======================================================================
 * NEW: CRUD for CYCLING
 * ==================================================================== */
// GET one cycling activity
router.get('/cycling/:id', async (req, res) => {
  try {
    const id = toNum(req.params.id);
    if (!id) return res.status(400).json({ ok: false, message: 'Invalid id' });

    const [rows] = await db.query(
      `SELECT id, user_id, title, description, distance_km, duration_sec, carbonReduce, record_date
       FROM bic_history WHERE id = ? LIMIT 1`,
      [id]
    );
    if (!rows.length) return res.status(404).json({ ok: false, message: 'Not found' });
    res.json({ ok: true, item: rows[0] });
  } catch (err) {
    console.error('GET /cycling/:id error', err);
    res.status(500).json({ ok: false, message: 'Internal server error' });
  }
});

// PATCH edit cycling activity
router.patch('/cycling/:id', async (req, res) => {
  try {
    const id = toNum(req.params.id);
    if (!id) return res.status(400).json({ ok: false, message: 'Invalid id' });

    const fields = {
      title: req.body?.title ?? undefined,
      description: req.body?.description ?? undefined,
      distance_km: req.body?.distance_km != null ? toNum(req.body.distance_km) : undefined,
      duration_sec: req.body?.duration_sec != null ? toNum(req.body.duration_sec) : undefined,
      carbonReduce: req.body?.carbonReduce != null ? toNum(req.body.carbonReduce) : undefined,
    };

    const setParts = [];
    const values = [];
    Object.entries(fields).forEach(([k, v]) => {
      if (v !== undefined) {
        setParts.push(`${k} = ?`);
        values.push(v);
      }
    });

    if (!setParts.length) {
      return res.status(400).json({ ok: false, message: 'No updatable fields provided' });
    }

    values.push(id);
    const [result] = await db.query(
      `UPDATE bic_history SET ${setParts.join(', ')}, record_date = record_date WHERE id = ?`,
      values
    );

    res.json({ ok: true, message: 'Cycling activity updated', affectedRows: result?.affectedRows ?? 0, id });
  } catch (err) {
    console.error('PATCH /cycling/:id error', err);
    res.status(500).json({ ok: false, message: 'Internal server error' });
  }
});

// DELETE cycling activity
router.delete('/cycling/:id', async (req, res) => {
  try {
    const id = toNum(req.params.id);
    if (!id) return res.status(400).json({ ok: false, message: 'Invalid id' });

    const [result] = await db.query(`DELETE FROM bic_history WHERE id = ?`, [id]);
    res.json({ ok: true, message: 'Cycling activity deleted', affectedRows: result?.affectedRows ?? 0, id });
  } catch (err) {
    console.error('DELETE /cycling/:id error', err);
    res.status(500).json({ ok: false, message: 'Internal server error' });
  }
});

module.exports = router;
