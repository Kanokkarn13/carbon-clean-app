// routes/activityRoutes.js
const express = require('express');
const db = require('../config/db');
const router = express.Router();

console.log('[activityRoutes] loaded:', __filename, 'ver=r2-no-created-at');

async function fetchRecentActivities(userId) {
  // WALKING
  const [walks] = await db.query(
    `
    SELECT
      id,
      title,
      description,
      distance_km,
      step_total,
      duration_sec,
      record_date
    FROM walk_history
    WHERE user_id = ?
    ORDER BY record_date DESC
    LIMIT 50
    `,
    [userId]
  );

  // CYCLING
  const [bikes] = await db.query(
    `
    SELECT
      id,
      title,
      description,
      distance_km,
      duration_sec,
      record_date
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
      record_date: r.record_date,
    })),
  ]
    .sort((a, b) => new Date(b.record_date) - new Date(a.record_date))
    .slice(0, 20);

  return { activities };
}

// GET ปกติ
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

// GET /full กัน 404
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

// POST fallback
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

module.exports = router;
