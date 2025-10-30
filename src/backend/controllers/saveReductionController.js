// src/backend/controllers/saveReductionController.js
const db = require('../config/db');

const TABLE = process.env.RC_POINT_TABLE || 'rc_point';
const ALLOWED = new Set(['Car', 'Motorbike', 'Bus', 'Taxi', 'Cars', 'Taxis']); // lenient aliases

/* ---------- helpers ---------- */
function nowGMT7() {
  // MySQL DATETIME 'YYYY-MM-DD HH:mm:ss' in GMT+7
  const now = new Date();
  const gmt7 = new Date(now.getTime() + 7 * 60 * 60 * 1000);
  return gmt7.toISOString().slice(0, 19).replace('T', ' ');
}
function bad(res, details) {
  return res.status(400).json({ error: 'Invalid payload', details });
}
function unwrap(out) {
  // mysql2/promise returns [rows, fields]; some wrappers return just rows/result
  return Array.isArray(out) ? out[0] : out;
}

/* ---------- POST /api/reduction ---------- */
exports.saveReduction = async (req, res) => {
  try {
    const b = req.body || {};

    const user_id = Number(b.user_id);
    const point_value_raw = b.point_value; // can be string or number
    const distance_km = Number(b.distance_km);

    const activity_from = String(b.activity_from || '');
    const activity_to = String(b.activity_to || '');

    // allow nulls for params
    const param_from =
      b.param_from === undefined || b.param_from === null || b.param_from === ''
        ? null
        : String(b.param_from);
    const param_to =
      b.param_to === undefined || b.param_to === null || b.param_to === ''
        ? null
        : String(b.param_to);

    const errs = [];
    if (!Number.isInteger(user_id) || user_id <= 0)
      errs.push('user_id must be a positive integer');
    if (point_value_raw === '' || point_value_raw === undefined || isNaN(Number(point_value_raw)))
      errs.push('point_value (kgCO2e) required');
    if (!Number.isFinite(distance_km) || distance_km <= 0)
      errs.push('distance_km must be > 0');
    if (!activity_from) errs.push('activity_from required');
    if (!activity_to) errs.push('activity_to required');

    // soft warnings (don’t block)
    if (activity_from && !ALLOWED.has(activity_from)) {
      console.log('[saveReduction] unusual activity_from:', activity_from);
    }
    if (activity_to && !ALLOWED.has(activity_to)) {
      console.log('[saveReduction] unusual activity_to:', activity_to);
    }

    if (errs.length) return bad(res, errs);

    const point_value = String(Number(point_value_raw).toFixed(2));
    const createAt = nowGMT7();
    const updateAt = createAt;

    const sql = `
      INSERT INTO \`${TABLE}\`
        (user_id, point_value, distance_km, activity_from, param_from, activity_to, param_to, create_at, update_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
    const params = [
      user_id,
      point_value,
      distance_km,
      activity_from,
      param_from, // nullable
      activity_to,
      param_to,   // nullable
      createAt,
      updateAt,
    ];

    console.log('[saveReduction] INSERT', TABLE, params);
    const out = await db.query(sql, params);
    const result = unwrap(out);

    return res.status(201).json({
      ok: true,
      id: result?.insertId,
      user_id,
      point_value,
      distance_km,
      activity_from,
      param_from,
      activity_to,
      param_to,
      created_at: createAt,
    });
  } catch (err) {
    console.error('[saveReduction] error:', err);
    return res
      .status(500)
      .json({ error: 'Failed to save reduction', details: String(err?.message || err) });
  }
};

/* ---------- GET /api/reduction/:user_id  (and /api/reduction/saved/:user_id) ---------- */
exports.listReductions = async (req, res) => {
  try {
    const userId = Number(req.params.user_id);
    if (!Number.isInteger(userId) || userId <= 0) {
      // Keep shape consistent with frontend expectations
      return res.status(200).json({ items: [] });
    }

    const sql = `
      SELECT id,
             user_id,
             point_value,
             distance_km,
             activity_from,
             param_from,
             activity_to,
             param_to,
             create_at,
             update_at
      FROM \`${TABLE}\`
      WHERE user_id = ?
      ORDER BY create_at DESC, id DESC
      LIMIT 200
    `;
    const out = await db.query(sql, [userId]);
    const rows = unwrap(out) || [];
    const items = Array.isArray(rows) ? rows : [];

    console.log('[listReductions]', { userId, count: items.length });
    return res.json({ items });
  } catch (e) {
    console.error('[listReductions] error:', e);
    return res
      .status(500)
      .json({ error: 'Failed to load reductions', details: String(e?.message || e) });
  }
};

/* ---------- DELETE /api/reduction/:id ---------- */
exports.deleteReduction = async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) return bad(res, ['id must be a positive integer']);

    const userId = Number(req.query.user_id);
    const params = [id];
    let sql = `DELETE FROM \`${TABLE}\` WHERE id = ?`;
    if (Number.isInteger(userId) && userId > 0) {
      sql += ' AND user_id = ?';
      params.push(userId);
    }

    const out = await db.query(sql, params);
    const result = unwrap(out);
    if (!result || result.affectedRows === 0) {
      return res.status(404).json({ error: 'Reduction not found' });
    }
    return res.status(204).send();
  } catch (err) {
    console.error('[deleteReduction] error:', err);
    return res.status(500).json({ error: 'Failed to delete reduction' });
  }
};
