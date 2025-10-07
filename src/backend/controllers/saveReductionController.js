// src/backend/controllers/saveReductionController.js
const db = require('../config/db');

const TABLE = process.env.RC_POINT_TABLE || 'rc_point';
const ALLOWED = new Set(['Car', 'Motorbike', 'Bus', 'Taxi', 'Cars', 'Taxis']); // be forgiving

function nowGMT7() {
  const now = new Date();
  const gmt7 = new Date(now.getTime() + 7 * 60 * 60 * 1000);
  // MySQL DATETIME/TIMESTAMP 'YYYY-MM-DD HH:mm:ss'
  return gmt7.toISOString().slice(0, 19).replace('T', ' ');
}

function bad(res, details) {
  return res.status(400).json({ error: 'Invalid payload', details });
}

// --- helpers to normalize mysql2 / wrapper return shapes ---
function unwrapQueryResult(out) {
  // For SELECT: returns `rows`
  // For INSERT/UPDATE: returns `result` (object with insertId, affectedRows, etc.)
  if (Array.isArray(out)) {
    // mysql2/promise: [rows, fields]
    return out[0];
  }
  return out;
}

exports.saveReduction = async (req, res) => {
  try {
    const b = req.body || {};
    const user_id = Number(b.user_id);
    const point_value_raw = b.point_value ?? '';
    const distance_km = Number(b.distance_km);

    const activity_from = String(b.activity_from || '');
    const param_from = b.param_from == null || b.param_from === '' ? null : String(b.param_from);
    const activity_to = String(b.activity_to || '');
    const param_to = b.param_to == null || b.param_to === '' ? null : String(b.param_to);

    const errs = [];
    if (!Number.isInteger(user_id) || user_id <= 0) errs.push('user_id must be a positive integer');
    if (point_value_raw === '' || isNaN(Number(point_value_raw))) errs.push('point_value (kgCO2e) required');
    if (!Number.isFinite(distance_km) || distance_km <= 0) errs.push('distance_km must be > 0');
    if (!activity_from) errs.push('activity_from required');
    if (!activity_to) errs.push('activity_to required');

    // soft checks
    if (activity_from && !ALLOWED.has(activity_from)) {
      console.log('[saveReduction] unusual activity_from:', activity_from);
    }
    if (activity_to && !ALLOWED.has(activity_to)) {
      console.log('[saveReduction] unusual activity_to:', activity_to);
    }

    if (errs.length) return bad(res, errs);

    const fixedPoint = String(Number(point_value_raw).toFixed(2));
    const createAt = nowGMT7();
    const updateAt = createAt;

    const sql = `
      INSERT INTO \`${TABLE}\`
        (user_id, point_value, distance_km, activity_from, param_from, activity_to, param_to, create_at, update_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
    const params = [
      user_id,
      fixedPoint,
      distance_km,
      activity_from,
      param_from, // can be null
      activity_to,
      param_to,   // can be null
      createAt,
      updateAt,
    ];

    console.log('[saveReduction] INSERT', TABLE, params);
    const out = await db.query(sql, params);
    const result = unwrapQueryResult(out);
    const insertId = result?.insertId;

    return res.status(201).json({
      ok: true,
      id: insertId,
      user_id,
      point_value: fixedPoint,
      distance_km,
      activity_from,
      param_from,
      activity_to,
      param_to,
      created_at: createAt, // response field name (read-only)
    });
  } catch (err) {
    console.error('[saveReduction] error:', err);
    return res
      .status(500)
      .json({ error: 'Failed to save reduction', details: String(err?.message || err) });
  }
};

exports.listReductions = async (req, res) => {
  try {
    const userId = Number(req.params.user_id);
    if (!Number.isInteger(userId) || userId <= 0) {
      return bad(res, ['user_id must be a positive integer']);
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
    const rows = unwrapQueryResult(out) || [];

    console.log('[listReductions] rows count =', Array.isArray(rows) ? rows.length : 0);
    return res.json({ items: rows });
  } catch (e) {
    console.error('[listReductions] error:', e);
    return res.status(500).json({ error: 'Failed to load reductions', details: String(e?.message || e) });
  }
};
