const db = require('../config/db');

exports.saveCycling = async (req, res) => {
  const { title, description, distance_km, duration_sec, user_id } = req.body;

  if (!user_id || distance_km === undefined) {
    return res.status(400).json({ message: 'Missing required fields.' });
  }

  try {
    await db.query(
      `INSERT INTO bic_history (user_id, title, description, distance_km, duration_sec, record_date)
       VALUES (?, ?, ?, ?, ?, NOW())`,
      [user_id, title, description, distance_km, duration_sec]
    );
    return res.status(200).json({ message: '🚴‍♂️ Cycling activity saved successfully!' });
  } catch (err) {
    console.error('❌ Cycling Save Error:', err.message);
    return res.status(500).json({ message: 'Server error during cycling save.' });
  }
};
