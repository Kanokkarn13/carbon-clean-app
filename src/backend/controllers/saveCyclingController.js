// controllers/saveCyclingController.js
const db = require('../config/db');

/* ---------- helpers ---------- */
function nowGMT7() {
  const now = new Date();
  const gmt7 = new Date(now.getTime() + 7 * 60 * 60 * 1000);
  return gmt7.toISOString().slice(0, 19).replace('T', ' ');
}

/* ---------- POST /api/save-cycling ---------- */
exports.saveCycling = async (req, res) => {
  try {
    const {
      title = null,
      description = null,
      distance_km,
      carbonReduce,       // receive from frontend
      duration_sec = null,
      user_id,
    } = req.body;

    console.log('[saveCycling] incoming data:', {
      title,
      description,
      distance_km,
      carbonReduce,
      duration_sec,
      user_id,
    });

    if (!user_id || distance_km === undefined) {
      return res.status(400).json({ ok: false, message: 'Missing required fields.' });
    }

    // normalize numeric value
    const carbonValue = Number.isFinite(Number(carbonReduce)) ? Number(carbonReduce) : 0;

    const createAt = nowGMT7();

    const [result] = await db.query(
      `INSERT INTO bic_history
         (user_id, title, description, distance_km, carbonReduce, duration_sec, record_date)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [user_id, title, description, distance_km, carbonValue, duration_sec, createAt]
    );

    console.log('[saveCycling] inserted ID:', result?.insertId, 'carbonReduce:', carbonValue);

    return res.status(200).json({
      ok: true,
      message: '🚴‍♂️ Cycling activity saved successfully!',
      record_date: createAt,
      insertId: result?.insertId ?? null,
      carbonReduce: carbonValue,
    });
  } catch (err) {
    console.error('❌ Cycling Save Error:', err);
    return res.status(500).json({ ok: false, message: 'Server error during cycling save.' });
  }
};

/* ---------- PATCH /api/cycling/:id/carbon ---------- */
exports.updateCyclingCarbon = async (req, res) => {
  try {
    const { id } = req.params;
    const { carbonReduce } = req.body;

    console.log('[updateCyclingCarbon] id:', id, 'carbonReduce:', carbonReduce);

    if (!id || carbonReduce == null) {
      return res.status(400).json({
        ok: false,
        message: 'Missing id or carbonReduce value.',
      });
    }

    const numericValue = Number(carbonReduce);
    if (!Number.isFinite(numericValue)) {
      return res.status(400).json({
        ok: false,
        message: 'carbonReduce must be a number.',
      });
    }

    const [result] = await db.query(
      `UPDATE bic_history SET carbonReduce = ? WHERE id = ?`,
      [numericValue, id]
    );

    return res.status(200).json({
      ok: true,
      message: '✅ Carbon reduction updated successfully (cycling)',
      affectedRows: result.affectedRows,
      id,
      carbonReduce: numericValue,
    });
  } catch (err) {
    console.error('❌ updateCyclingCarbon error:', err);
    return res.status(500).json({ ok: false, message: 'Server error during carbon update.' });
  }
};
