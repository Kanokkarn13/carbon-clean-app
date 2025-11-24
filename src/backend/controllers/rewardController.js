const QRCode = require('qrcode');
const db = require('../config/db');
const { uploadToS3, getSignedUrlForKey } = require('../config/s3');
const {
  generateUniqueVoucherCode,
  buildQrPayload,
  expiresInBangkok,
  nowInBangkok,
  toMysqlDatetime,
  pickPointColumn,
} = require('../utils/voucher');

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
  voucher_code: row.voucher_code || null,
  qr_payload: row.qr_payload || null,
  qr_image_url: row.qr_image_url || null,
  expires_at: row.expires_at || null,
  used_at: row.used_at || null,
  reward_title: row.reward_title || '',
  reward_description: row.reward_description || '',
  reward_image_url: row.reward_image_url || null,
  reward_cost_points:
    row.reward_cost_points != null ? Number(row.reward_cost_points) : null,
});

function extractKeyFromUrl(url = '') {
  if (!url) return null;
  try {
    const u = new URL(url);
    // expect https://bucket.s3.region.amazonaws.com/<key>
    const key = u.pathname.replace(/^\/+/, '');
    return key || null;
  } catch {
    return null;
  }
}

async function ensureSignedUrl(url) {
  if (!url || url.includes('X-Amz-Signature') || url.includes('X-Amz-Credential')) {
    return url;
  }
  const key = extractKeyFromUrl(url);
  if (!key) return url;
  try {
    const signed = await getSignedUrlForKey(key, 60 * 60 * 24 * 3); // 3 days
    return signed;
  } catch (err) {
    console.warn('⚠️  Failed to sign QR URL, using original', err?.message || err);
    return url;
  }
}

async function getPointsSummary(userId, conn = db) {
  const [[walkRow]] = await conn.query(
    'SELECT COALESCE(SUM(points),0) AS total FROM walk_history WHERE user_id = ?',
    [userId],
  );
  const [[bikeRow]] = await conn.query(
    'SELECT COALESCE(SUM(points),0) AS total FROM bic_history WHERE user_id = ?',
    [userId],
  );
  const [[spentRow]] = await conn.query(
    `
      SELECT COALESCE(SUM(cost_points),0) AS total
      FROM reward_redemption
      WHERE user_id = ? AND status IN ('pending','approved','used','expired')
    `,
    [userId],
  );

  const earned = Number(walkRow?.total || 0) + Number(bikeRow?.total || 0);
  const spent = Number(spentRow?.total || 0);
  const available = Math.max(0, earned - spent);
  return { earned, spent, available };
}

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
          rr.voucher_code,
          rr.qr_payload,
          rr.qr_image_url,
          rr.expires_at,
          rr.used_at,
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

    const baseItems = Array.isArray(rows) ? rows.map(mapRedemptionRow) : [];
    const items = await Promise.all(
      baseItems.map(async (it) => ({
        ...it,
        qr_image_url: await ensureSignedUrl(it.qr_image_url),
      })),
    );
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

exports.getPointsBalance = async function getPointsBalance(req, res) {
  const rawUserId =
    req.params?.user_id ??
    req.query?.user_id ??
    req.query?.userId ??
    req.body?.user_id;
  const userId = Number(rawUserId);

  if (!userId || !Number.isFinite(userId)) {
    return res.status(400).json({ error: 'Missing or invalid user_id parameter' });
  }

  try {
    const summary = await getPointsSummary(userId);
    return res.json(summary);
  } catch (error) {
    console.error('[rewardController] getPointsBalance error:', error);
    return res.status(500).json({ error: 'Failed to load points balance' });
  }
};

exports.redeemReward = async function redeemReward(req, res) {
  const rawUserId =
    req.body?.user_id ??
    req.body?.userId ??
    req.body?.user ??
    req.body?.uid;
  const rawRewardId = req.body?.reward_id ?? req.body?.rewardId ?? req.body?.reward;

  const userId = Number(rawUserId);
  const rewardId = Number(rawRewardId);

  if (!Number.isInteger(userId) || userId <= 0 || !Number.isInteger(rewardId) || rewardId <= 0) {
    return res.status(400).json({ error: 'user_id and reward_id are required numbers' });
  }

  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();

    const [userRows] = await conn.query('SELECT * FROM users WHERE user_id = ? FOR UPDATE', [
      userId,
    ]);
    const userRow = Array.isArray(userRows) ? userRows[0] : null;
    if (!userRow) {
      await conn.rollback();
      return res.status(404).json({ error: 'User not found' });
    }

    const [rewardRows] = await conn.query(
      'SELECT * FROM reward WHERE id = ? FOR UPDATE',
      [rewardId],
    );
    const reward = Array.isArray(rewardRows) ? rewardRows[0] : null;
    if (!reward) {
      await conn.rollback();
      return res.status(404).json({ error: 'Reward not found' });
    }

    const rewardActive = reward.active == null ? true : Boolean(Number(reward.active));
    const rewardCost = Number(
      reward.cost_points ??
        req.body?.cost_points ??
        req.body?.costPoints ??
        req.body?.points,
    );
    const rewardExpires = reward.expires_at ? new Date(reward.expires_at) : null;
    const rewardStock =
      reward.stock === null || reward.stock === undefined ? null : Number(reward.stock);

    if (!rewardActive) {
      await conn.rollback();
      return res.status(400).json({ error: 'Reward is not active' });
    }
    if (!Number.isFinite(rewardCost) || rewardCost <= 0) {
      await conn.rollback();
      return res.status(400).json({ error: 'Reward cost is invalid' });
    }
    if (rewardExpires && rewardExpires.getTime() < nowInBangkok().getTime()) {
      await conn.rollback();
      return res.status(400).json({ error: 'Reward has expired' });
    }
    if (rewardStock !== null && rewardStock <= 0) {
      await conn.rollback();
      return res.status(400).json({ error: 'Reward is out of stock' });
    }

    const { available, earned, spent } = await getPointsSummary(userId, conn);
    if (available < rewardCost) {
      await conn.rollback();
      return res.status(400).json({
        error: 'Insufficient points',
        available,
        required: rewardCost,
        earned,
        spent,
      });
    }

    if (rewardStock !== null) {
      await conn.query('UPDATE reward SET stock = GREATEST(stock - 1, 0) WHERE id = ?', [
        rewardId,
      ]);
    }

    const [insertResult] = await conn.query(
      `
        INSERT INTO reward_redemption (user_id, reward_id, cost_points, status, created_at)
        VALUES (?, ?, ?, 'pending', CONVERT_TZ(NOW(), 'UTC', 'Asia/Bangkok'))
      `.trim(),
      [userId, rewardId, rewardCost],
    );
    const redemptionId = insertResult.insertId;

    const voucherCode = await generateUniqueVoucherCode(conn);
    const qrPayload = buildQrPayload(userId, redemptionId, voucherCode);
    const qrBuffer = await QRCode.toBuffer(qrPayload, {
      type: 'png',
      errorCorrectionLevel: 'M',
      width: 320,
      margin: 1,
    });

    const key = `reward_qr/${redemptionId}.png`;
    const { url: qrUrl } = await uploadToS3(qrBuffer, key, 'image/png');
    const signedQrUrl = await ensureSignedUrl(qrUrl);

    const expiresAt = expiresInBangkok(7);

    await conn.query(
      `
        UPDATE reward_redemption
        SET voucher_code = ?, qr_payload = ?, qr_image_url = ?, expires_at = ?, status = 'approved'
        WHERE id = ?
      `.trim(),
      [voucherCode, qrPayload, signedQrUrl, expiresAt, redemptionId],
    );

    await conn.commit();

    return res.status(201).json({
      redemption_id: redemptionId,
      voucher_code: voucherCode,
      qr_payload: qrPayload,
      qr_image_url: signedQrUrl,
      expires_at: expiresAt,
      status: 'approved',
    });
  } catch (error) {
    await conn.rollback();
    console.error('[rewardController] redeemReward error:', error);
    return res.status(500).json({ error: 'Failed to redeem reward' });
  } finally {
    conn.release();
  }
};

exports.validateVoucher = async function validateVoucher(req, res) {
  const code = String(req.body?.voucher_code || req.body?.code || '').trim();
  if (!code) {
    return res.status(400).json({ error: 'voucher_code is required' });
  }

  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();

    const [rows] = await conn.query(
      `
        SELECT id, status, expires_at, used_at
        FROM reward_redemption
        WHERE voucher_code = ?
        FOR UPDATE
      `.trim(),
      [code],
    );
    const redemption = Array.isArray(rows) ? rows[0] : null;

    if (!redemption) {
      await conn.rollback();
      return res.status(404).json({ error: 'Voucher not found' });
    }

    const now = nowInBangkok();
    const expiresAt = redemption.expires_at ? new Date(redemption.expires_at) : null;

    if (redemption.used_at) {
      await conn.rollback();
      return res.status(400).json({ error: 'Voucher already used', status: 'used' });
    }
    if (expiresAt && expiresAt.getTime() <= now.getTime()) {
      await conn.query(
        `UPDATE reward_redemption SET status = 'expired' WHERE id = ?`,
        [redemption.id],
      );
      await conn.commit();
      return res.status(400).json({
        error: 'Voucher expired',
        status: 'expired',
        redemption_id: redemption.id,
      });
    }
    if (String(redemption.status) !== 'approved') {
      await conn.rollback();
      return res.status(400).json({ error: 'Voucher not valid for use', status: redemption.status });
    }

    const usedAt = toMysqlDatetime(now);
    await conn.query(
      `
        UPDATE reward_redemption
        SET used_at = ?, status = 'used'
        WHERE id = ?
      `.trim(),
      [usedAt, redemption.id],
    );

    await conn.commit();
    return res.status(200).json({
      redemption_id: redemption.id,
      status: 'used',
      used_at: usedAt,
    });
  } catch (error) {
    await conn.rollback();
    console.error('[rewardController] validateVoucher error:', error);
    return res.status(500).json({ error: 'Failed to validate voucher' });
  } finally {
    conn.release();
  }
};
