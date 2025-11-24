const POINT_COLUMNS = [
  'points',
  'point',
  'point_balance',
  'total_points',
  'available_points',
  'balance_points',
];

function nowInBangkok() {
  return new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Bangkok' }));
}

function toMysqlDatetime(date) {
  return date.toISOString().slice(0, 19).replace('T', ' ');
}

function expiresInBangkok(days = 7) {
  const base = nowInBangkok();
  base.setDate(base.getDate() + days);
  return toMysqlDatetime(base);
}

async function generateUniqueVoucherCode(conn) {
  if (!conn || typeof conn.query !== 'function') {
    throw new Error('A DB connection with .query is required');
  }
  // Try a handful of times to avoid rare collision
  for (let i = 0; i < 20; i += 1) {
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const [rows] = await conn.query(
      'SELECT id FROM reward_redemption WHERE voucher_code = ? LIMIT 1',
      [code],
    );
    if (!Array.isArray(rows) || rows.length === 0) return code;
  }
  throw new Error('Failed to generate a unique voucher code');
}

function buildQrPayload(userId, redemptionId, voucherCode) {
  return `${userId}-${redemptionId}-${voucherCode}`;
}

function pickPointColumn(userRow = {}) {
  return POINT_COLUMNS.find((col) => Object.prototype.hasOwnProperty.call(userRow, col));
}

module.exports = {
  POINT_COLUMNS,
  nowInBangkok,
  toMysqlDatetime,
  expiresInBangkok,
  generateUniqueVoucherCode,
  buildQrPayload,
  pickPointColumn,
};
