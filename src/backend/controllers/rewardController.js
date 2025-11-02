const db = require('../config/db');

const mapRewardRow = (row = {}) => ({
  id: Number(row.id),
  title: row.title || '',
  description: row.description || '',
  cost_points: Number(row.cost_points) || 0,
  expires_at: row.expires_at || null,
  active: Boolean(row.active ?? 0),
  stock: row.stock != null ? Number(row.stock) : null,
  image_url: row.image_url || null,
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
          stock,
          image_url
        FROM reward
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

const mapRedemptionRow = (row = {}) => ({
  id: Number(row.id),
  reward_id: row.reward_id != null ? Number(row.reward_id) : null,
  cost_points: Number(row.cost_points) || 0,
  status: row.status || 'pending',
  created_at: row.created_at,
  reward_title: row.reward_title || '',
  reward_description: row.reward_description || '',
  reward_image_url: row.reward_image_url || null,
  reward_cost_points:
    row.reward_cost_points != null ? Number(row.reward_cost_points) : null,
});

exports.listRedemptions = async function listRedemptions(req, res) {
  const rawUserId =
    req.params?.user_id ??
    req.query?.user_id ??
    req.query?.userId ??
    req.body?.user_id;
  const userId = Number(rawUserId);

  if (!userId || !Number.isFinite(userId)) {
    return res
      .status(400)
      .json({ error: 'Missing or invalid user_id parameter' });
  }

  try {
    const [rows] = await db.query(
      `
        SELECT
          rr.id,
          rr.reward_id,
          rr.cost_points,
          rr.status,
          rr.created_at,
          r.title AS reward_title,
          r.description AS reward_description,
          r.image_url AS reward_image_url,
          r.cost_points AS reward_cost_points
        FROM reward_redemption rr
        LEFT JOIN reward r ON r.id = rr.reward_id
        WHERE rr.user_id = ?
        ORDER BY rr.created_at DESC
        LIMIT 200
      `.trim(),
      [userId]
    );

    const items = Array.isArray(rows) ? rows.map(mapRedemptionRow) : [];
    return res.json({ items });
  } catch (error) {
    console.error(
      '[rewardController] listRedemptions error:',
      error?.message || error
    );
    return res
      .status(500)
      .json({ error: 'Failed to load redemption history.' });
  }
};
