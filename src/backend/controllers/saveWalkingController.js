const db = require('../config/db');

/* ---------- helpers ---------- */
function nowGMT7() {
  // Return DATETIME string in GMT+7 (for MySQL)
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
      carbonReduce = 0,
      step_total = null,
      duration_sec = null,
      user_id,
    } = req.body;

    if (!user_id || distance_km === undefined) {
      return res.status(400).json({ message: 'Missing required fields.' });
    }

    // ✅ Use local GMT+7 timestamp instead of MySQL NOW()
    const createAt = nowGMT7();

    await db.query(
      `INSERT INTO walk_history
         (user_id, title, description, distance_km, carbonReduce, step_total, duration_sec, record_date)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [user_id, title, description, distance_km, carbonReduce, step_total, duration_sec, createAt]
    );

    return res.status(200).json({
      ok: true,
      message: '🚶‍♀️ Walking activity saved successfully!',
      record_date: createAt,
    });
  } catch (err) {
    console.error('❌ Walking Save Error:', err);
    return res.status(500).json({ message: 'Server error during walking save.' });
  }
};
