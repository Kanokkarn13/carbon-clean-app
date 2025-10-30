const db = require('../config/db');

const mapRewardRow = (row = {}) => ({
  id: Number(row.id),
  title: row.title || '',
  description: row.description || '',
  cost_points: Number(row.cost_points) || 0,
  expires_at: row.expires_at || null,
  active: Boolean(row.active ?? 0),
  stock: row.stock != null ? Number(row.stock) : null,
});

exports.listRewards = async function listRewards(_req, res) {
  try {
    const [rows] = await db.query(
      `
        SELECT
          id,
          title,
          description,
          cost_points,
          expires_at,
          active,
          stock
        FROM rewards
        WHERE active = 1 AND (expires_at IS NULL OR expires_at >= NOW())
        ORDER BY cost_points ASC, title ASC
      `.trim(),
    );

    const rewards = Array.isArray(rows) ? rows.map(mapRewardRow) : [];
    res.json({ items: rewards });
  } catch (error) {
    console.error('[rewardController] listRewards error:', error);
    res.status(500).json({ error: 'Failed to load rewards' });
  }
};

