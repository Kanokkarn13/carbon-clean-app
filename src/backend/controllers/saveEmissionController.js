// src/backend/controllers/saveEmissionController.js
const db = require('../config/db');

const ACTIVITY_TABLE = process.env.ACTIVITY_TABLE || 'e_point';
const ALLOWED = new Set(['Car', 'Motorcycle', 'Taxi', 'Bus']);

/* ---------- helpers ---------- */
function badRequest(res, details) {
  return res.status(400).json({ error: 'Invalid payload', details });
}

const toPointValue = (n) => {
  const x = Number(n);
  if (!Number.isFinite(x) || x < 0) return null;
  return x.toFixed(2); // varchar(20) in DB
};

// Build a compact param string to store in param_type
const buildParamType = (parameters = {}) => {
  if (!parameters || typeof parameters !== 'object') return null;
  const { fuel, size, type } = parameters;
  const bits = [];
  if (fuel) bits.push(String(fuel));
  if (size) bits.push(String(size));
  if (!fuel && !size && type) bits.push(String(type));
  const s = bits.join(' ').trim();
  return s || null;
};

// Generate a MySQL DATETIME (YYYY-MM-DD HH:mm:ss) in GMT+7
function nowGMT7() {
  const now = new Date();
  const gmt7 = new Date(now.getTime() + 7 * 60 * 60 * 1000);
  return gmt7.toISOString().slice(0, 19).replace('T', ' ');
}

/* ---------- POST /api/emission/transport ---------- */
exports.saveTransportEmission = async (req, res) => {
  try {
    const b = req.body || {};

    // If you later add middleware, swap to: const user_id = Number(req.userId);
    const user_id = Number(b.user_id);
    const activity_type = String(b.activity_type || '');
    const emission_kgco2e = Number(b.emission_kgco2e);
    const distance_km = Number(b.distance_km);
    const parameters = (b.parameters && typeof b.parameters === 'object') ? b.parameters : {};

    const errors = [];
    if (!Number.isInteger(user_id) || user_id <= 0) errors.push('user_id must be a positive integer');
    if (!ALLOWED.has(activity_type)) errors.push(`activity_type must be one of: ${[...ALLOWED].join(', ')}`);
    if (!Number.isFinite(emission_kgco2e) || emission_kgco2e < 0) errors.push('emission_kgco2e must be a nonnegative number');
    if (!Number.isFinite(distance_km) || distance_km <= 0) errors.push('distance_km must be a positive number');
    if (errors.length) return badRequest(res, errors);

    const point_value = toPointValue(emission_kgco2e); // store emission as string
    const param_type = buildParamType(parameters);

    // activity is just the label (no distance/params)
    const activity = activity_type;

    // ✅ Use GMT+7 from code (no CURDATE()/NOW())
    const createAt = nowGMT7();
    const updateAt = createAt;

    const sql = `
      INSERT INTO \`${ACTIVITY_TABLE}\`
        (user_id, point_value, distance_km, activity, param_type, create_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `;
    const params = [user_id, point_value, distance_km, activity, param_type, createAt, updateAt];

    console.log('[saveEmission] INSERT', ACTIVITY_TABLE, params);
    const [result] = await db.query(sql, params);

    return res.status(201).json({
      id: result?.insertId,
      user_id,
      point_value,     // emission stored here
      distance_km,
      activity,        // 'Car' / 'Motorcycle' / 'Taxi' / 'Bus'
      param_type,      // e.g. 'Diesel Large' or 'Regular taxi'
      created_at: createAt,
      updated_at: updateAt,
      created: true
    });
  } catch (err) {
    console.error('[saveTransportEmission] error:', err);
    return res.status(500).json({
      error: 'Failed to save activity',
      details: String(err?.sqlMessage || err?.message || err),
    });
  }
};

/* ---------- GET /api/emission/saved/:user_id ---------- */
exports.listSavedActivities = async (req, res) => {
  try {
    const userId = Number(req.params.user_id);
    if (!Number.isInteger(userId) || userId <= 0) return badRequest(res, ['user_id must be a positive integer']);
    const limit = Math.min(Number(req.query.limit || 50), 200);
    const offset = Math.max(Number(req.query.offset || 0), 0);

    const sql = `
      SELECT id, user_id, point_value, distance_km, activity, param_type, create_at, updated_at
      FROM \`${ACTIVITY_TABLE}\`
      WHERE user_id = ?
      ORDER BY create_at DESC, id DESC
      LIMIT ? OFFSET ?
    `;
    const [rows] = await db.query(sql, [userId, limit, offset]);
    return res.json({ items: rows, limit, offset });
  } catch (err) {
    console.error('[listSavedActivities] error:', err);
    return res.status(500).json({ error: 'Failed to load activities' });
  }
};
