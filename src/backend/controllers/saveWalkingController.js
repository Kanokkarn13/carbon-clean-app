// src/backend/controllers/saveWalkingController.js
const db = require('../config/db');
const { evaluateActivityPoints } = require('../utils/points');

/* ---------- helpers ---------- */
function nowGMT7() {
  const now = new Date();
  const gmt7 = new Date(now.getTime() + 7 * 60 * 60 * 1000);
  return gmt7.toISOString().slice(0, 19).replace('T', ' ');
}

function toNum(v, def = null) {
  const n = Number(v);
  return Number.isFinite(n) ? n : def;
}

/* =========================================================
 * POST /api/save-walking
 * Body: {
 *   user_id (required),
 *   distance_km (required, number),
 *   title?, description?,
 *   step_total?, duration_sec?,
 *   carbonReduce?  // kg (preferably)
 * }
 * Writes to walk_history
 * ======================================================= */
exports.saveWalking = async (req, res) => {
  try {
    const {
      title = null,
      description = null,
      distance_km,
      carbonReduce,          // may be undefined → fallback 0
      step_total = null,
      duration_sec = null,
      user_id,
    } = req.body || {};

    // log input
    console.log('[saveWalking] incoming:', {
      title,
      description,
      distance_km,
      carbonReduce,
      step_total,
      duration_sec,
      user_id,
    });

    // validate required
    if (user_id == null || distance_km == null) {
      return res.status(400).json({ ok: false, message: 'Missing required fields.' });
    }

    // coerce numbers
    const distanceVal   = toNum(distance_km, 0);
    const carbonValue   = toNum(carbonReduce, 0); // if not sent, store 0
    const stepsVal      = step_total == null ? null : toNum(step_total, null);
    const durationVal   = duration_sec == null ? null : toNum(duration_sec, null);

    const points = evaluateActivityPoints({
      type: 'Walking',
      distance_km: distanceVal,
      step_total: stepsVal,
      duration_sec: durationVal,
    });

    const recordAt = nowGMT7();

    const [result] = await db.query(
      `INSERT INTO walk_history
         (user_id, title, description, distance_km, carbonReduce, step_total, duration_sec, points, record_date)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [user_id, title, description, distanceVal, carbonValue, stepsVal, durationVal, points, recordAt]
    );

    console.log('[saveWalking] inserted:', { insertId: result?.insertId, carbonReduce: carbonValue, points });

    return res.status(200).json({
      ok: true,
      message: '🚶‍♀️ Walking activity saved successfully!',
      record_date: recordAt,
      insertId: result?.insertId ?? null,
      carbonReduce: carbonValue,
      points,
    });
  } catch (err) {
    console.error('❌ Walking Save Error:', err);
    return res.status(500).json({ ok: false, message: 'Server error during walking save.' });
  }
};

/* =========================================================
 * PATCH /api/walking/:id/carbon
 * Body: { carbonReduce (required, number) }
 * Updates carbonReduce for a walking row
 * ======================================================= */
exports.updateWalkingCarbon = async (req, res) => {
  try {
    const { id } = req.params || {};
    const { carbonReduce } = req.body || {};

    console.log('[updateWalkingCarbon] incoming:', { id, carbonReduce });

    const idNum = toNum(id);
    const carbonVal = toNum(carbonReduce);

    if (!idNum || carbonVal == null) {
      return res.status(400).json({
        ok: false,
        message: 'Missing id or carbonReduce value.',
      });
    }

    const [result] = await db.query(
      `UPDATE walk_history SET carbonReduce = ? WHERE id = ?`,
      [carbonVal, idNum]
    );

    return res.status(200).json({
      ok: true,
      message: '✅ Carbon reduction updated successfully (walking)',
      affectedRows: result?.affectedRows ?? 0,
      id: idNum,
      carbonReduce: carbonVal,
    });
  } catch (err) {
    console.error('❌ updateWalkingCarbon error:', err);
    return res.status(500).json({ ok: false, message: 'Server error during carbon update.' });
  }
};
