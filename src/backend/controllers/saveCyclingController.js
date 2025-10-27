// controllers/saveCyclingController.js
const db = require('../config/db');

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
 * POST /api/save-cycling
 * Body: {
 *   user_id (required),
 *   distance_km (required, number),
 *   title?, description?,
 *   duration_sec?,
 *   carbonReduce?   // kg (optional, default 0)
 * }
 * Writes to bic_history
 * ======================================================= */
exports.saveCycling = async (req, res) => {
  try {
    const {
      title = null,
      description = null,
      distance_km,
      carbonReduce,         // optional from frontend (kg)
      duration_sec = null,
      user_id,
    } = req.body || {};

    console.log('[saveCycling] incoming:', {
      title, description, distance_km, carbonReduce, duration_sec, user_id,
    });

    if (user_id == null || distance_km == null) {
      return res.status(400).json({ ok: false, message: 'Missing required fields.' });
    }

    // coerce numbers
    const distanceVal = toNum(distance_km, 0);
    const carbonVal   = toNum(carbonReduce, 0);
    const durationVal = duration_sec == null ? null : toNum(duration_sec, null);

    const recordAt = nowGMT7();

    const [result] = await db.query(
      `INSERT INTO bic_history
         (user_id, title, description, distance_km, carbonReduce, duration_sec, record_date)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [user_id, title, description, distanceVal, carbonVal, durationVal, recordAt]
    );

    console.log('[saveCycling] inserted:', { insertId: result?.insertId, carbonReduce: carbonVal });

    return res.status(200).json({
      ok: true,
      message: '🚴‍♂️ Cycling activity saved successfully!',
      record_date: recordAt,
      insertId: result?.insertId ?? null,
      carbonReduce: carbonVal,
    });
  } catch (err) {
    console.error('❌ Cycling Save Error:', err);
    return res.status(500).json({ ok: false, message: 'Server error during cycling save.' });
  }
};

/* =========================================================
 * PATCH /api/cycling/:id/carbon
 * Body: { carbonReduce (required, number in kg) }
 * Updates carbonReduce for a cycling row
 * ======================================================= */
exports.updateCyclingCarbon = async (req, res) => {
  try {
    const { id } = req.params || {};
    const { carbonReduce } = req.body || {};

    console.log('[updateCyclingCarbon] incoming:', { id, carbonReduce });

    const idNum = toNum(id);
    const carbonVal = toNum(carbonReduce);

    if (!idNum || carbonVal == null) {
      return res.status(400).json({
        ok: false,
        message: 'Missing id or carbonReduce value.',
      });
    }

    const [result] = await db.query(
      `UPDATE bic_history SET carbonReduce = ? WHERE id = ?`,
      [carbonVal, idNum]
    );

    return res.status(200).json({
      ok: true,
      message: '✅ Carbon reduction updated successfully (cycling)',
      affectedRows: result?.affectedRows ?? 0,
      id: idNum,
      carbonReduce: carbonVal,
    });
  } catch (err) {
    console.error('❌ updateCyclingCarbon error:', err);
    return res.status(500).json({ ok: false, message: 'Server error during carbon update.' });
  }
};
