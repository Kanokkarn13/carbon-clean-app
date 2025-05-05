const express = require('express');
const db = require('../config/db');
const router = express.Router();

router.get('/recent-activity/:user_id', async (req, res) => {
  const userId = req.params.user_id;
  console.log(`📡 GET /recent-activity/${userId}`);

  try {
    const [walks] = await db.query(
      'SELECT distance_km, record_date FROM walk_history WHERE user_id = ? ORDER BY record_date DESC LIMIT 5',
      [userId]
    );
    const [bikes] = await db.query(
      'SELECT distance_km, record_date FROM bic_history WHERE user_id = ? ORDER BY record_date DESC LIMIT 5',
      [userId]
    );

    const activities = [
      ...walks.map(item => ({
        type: 'Walking',
        distance_km: item.distance_km,
        created_at: item.record_date,
      })),
      ...bikes.map(item => ({
        type: 'Cycling',
        distance_km: item.distance_km,
        created_at: item.record_date,
      })),
    ]
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
      .slice(0, 10);

    res.setHeader('Content-Type', 'application/json');
    res.json({ activities });
  } catch (err) {
    console.error('❌ Error fetching recent activity:', err);
    res.status(500).json({ message: 'Internal server error' });
  }
});

module.exports = router;
