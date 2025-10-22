// routes/activityRoutes.js
const express = require('express');
const db = require('../config/db');
const { saveTransportEmission, listSavedActivities } = require('../controllers/saveEmissionController');

// ✅ import the correct controller files & named exports
const { saveWalking, updateWalkingCarbon } = require('../controllers/saveWalkingController');
const { saveCycling, updateCyclingCarbon } = require('../controllers/saveCyclingController');

const router = express.Router();

console.log('[activityRoutes] loaded:', __filename, 'ver=r3-add-save-emission');

// ------------------------------
// internal helper for recent history
// ------------------------------
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
      carbonReduce,
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
      carbonReduce,
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

// ------------------------------
// EXISTING: recent activity endpoints
// ------------------------------
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

// ------------------------------
// NEW: create/save walking & cycling activities
// ------------------------------
// These endpoints are called by the app when you press "Save" on TrackingScreen
router.post('/save-walking', saveWalking);
router.post('/save-cycling', saveCycling);

// ------------------------------
// NEW: save + list saved emission records (transport emission)
// ------------------------------
/**
 * POST /emission
 * body: { user_id, activity_type: 'Car'|'Motorcycle'|'Taxi'|'Bus', emission_kgco2e, distance_km, parameters? }
 * Writes a row into activities(user_id, point_value, activity, create_at, updated_at).
 */
router.post('/emission', saveTransportEmission);

/**
 * GET /saved/:user_id?limit=50&offset=0
 * Reads from activities table for a given user.
 */
router.get('/saved/:user_id', listSavedActivities);

// ------------------------------
// NEW: carbon update routes (used by CarbonOffsetScreen - optional if you PATCH later)
// ------------------------------
router.patch('/walking/:id/carbon', updateWalkingCarbon);
router.patch('/cycling/:id/carbon', updateCyclingCarbon);

module.exports = router;
