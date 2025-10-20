const db = require('../config/db');

/* ---------- helpers ---------- */
function nowGMT7() {
  // Return DATETIME string in GMT+7 (for MySQL)
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
      carbonReduce = 0,
      duration_sec = null,
      user_id,
    } = req.body;

    if (!user_id || distance_km === undefined) {
      return res.status(400).json({ message: 'Missing required fields.' });
    }

    // ✅ ใช้เวลา GMT+7 แทน NOW()
    const createAt = nowGMT7();

    await db.query(
      `INSERT INTO bic_history
         (user_id, title, description, distance_km, carbonReduce, duration_sec, record_date)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [user_id, title, description, distance_km, carbonReduce, duration_sec, createAt]
    );

    return res.status(200).json({
      ok: true,
      message: '🚴‍♂️ Cycling activity saved successfully!',
      record_date: createAt,
    });
  } catch (err) {
    console.error('❌ Cycling Save Error:', err);
    return res.status(500).json({ message: 'Server error during cycling save.' });
  }
};
