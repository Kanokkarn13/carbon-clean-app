const db = require('../config/db');

exports.saveWalking = async (req, res) => {
  const { title, description, distance_km, step_total, duration_sec, user_id } = req.body;

  if (!user_id || distance_km === undefined) {
    return res.status(400).json({ message: 'Missing required fields.' });
  }

  try {
    await db.query(
      `INSERT INTO walk_history (user_id, title, description, distance_km, step_total, duration_sec, record_date)
       VALUES (?, ?, ?, ?, ?, ?, NOW())`,
      [user_id, title, description, distance_km, step_total, duration_sec]
    );
    return res.status(200).json({ message: '🚶‍♀️ Walking activity saved successfully!' });
  } catch (err) {
    console.error('❌ Walking Save Error:', err.message);
    return res.status(500).json({ message: 'Server error during walking save.' });
  }
};
