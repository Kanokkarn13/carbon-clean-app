const db = require('../config/db');

/* ---------- helpers ---------- */
function nowGMT7() {
  const now = new Date();
  const gmt7 = new Date(now.getTime() + 7 * 60 * 60 * 1000);
  return gmt7.toISOString().slice(0, 19).replace('T', ' ');
}

/* ---------- POST /api/save-walking ---------- */
exports.saveWalking = async (req, res) => {
  try {
    const {
      title = null,
      description = null,
      distance_km,
      carbonReduce,  // ✅ receive from frontend
      step_total = null,
      duration_sec = null,
      user_id,
    } = req.body;

    console.log('[saveWalking] incoming data:', {
      title,
      description,
      distance_km,
      carbonReduce,
      step_total,
      duration_sec,
      user_id,
    });

    if (!user_id || distance_km === undefined) {
      return res.status(400).json({ ok: false, message: 'Missing required fields.' });
    }

    // fallback when carbonReduce missing
    const carbonValue = Number.isFinite(Number(carbonReduce))
      ? Number(carbonReduce)
      : 0;

    const createAt = nowGMT7();

    const [result] = await db.query(
      `INSERT INTO walk_history
         (user_id, title, description, distance_km, carbonReduce, step_total, duration_sec, record_date)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [user_id, title, description, distance_km, carbonValue, step_total, duration_sec, createAt]
    );

    console.log('[saveWalking] inserted ID:', result?.insertId, 'carbonReduce:', carbonValue);

    return res.status(200).json({
      ok: true,
      message: '🚶‍♀️ Walking activity saved successfully!',
      record_date: createAt,
      insertId: result?.insertId ?? null,
      carbonReduce: carbonValue,
    });
  } catch (err) {
    console.error('❌ Walking Save Error:', err);
    return res.status(500).json({ ok: false, message: 'Server error during walking save.' });
  }
};

/* ---------- PATCH /api/walking/:id/carbon ---------- */
exports.updateWalkingCarbon = async (req, res) => {
  try {
    const { id } = req.params;
    const { carbonReduce } = req.body;

    console.log('[updateWalkingCarbon] id:', id, 'carbonReduce:', carbonReduce);

    if (!id || carbonReduce == null) {
      return res.status(400).json({
        ok: false,
        message: 'Missing id or carbonReduce value.',
      });
    }

    const [result] = await db.query(
      `UPDATE walk_history SET carbonReduce = ? WHERE id = ?`,
      [carbonReduce, id]
    );

    return res.status(200).json({
      ok: true,
      message: '✅ Carbon reduction updated successfully (walking)',
      affectedRows: result.affectedRows,
      id,
      carbonReduce,
    });
  } catch (err) {
    console.error('❌ updateWalkingCarbon error:', err);
    return res.status(500).json({ ok: false, message: 'Server error during carbon update.' });
  }
};
