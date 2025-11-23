// src/backend/controllers/emissionFactorController.js
const db = require('../config/db');

const EMISSION_TABLE = process.env.EMISSION_TABLE || 'emission';

exports.listEmissionFactors = async (_req, res) => {
  try {
    const sql = `
      SELECT ef_id, activity, type, class, unit, ef_point, refer, update_at
      FROM \`${EMISSION_TABLE}\`
    `;
    const [rows] = await db.query(sql);
    res.json({ items: rows });
  } catch (err) {
    console.error('[listEmissionFactors] error:', err);
    res.status(500).json({ error: 'Failed to load emission factors' });
  }
};
