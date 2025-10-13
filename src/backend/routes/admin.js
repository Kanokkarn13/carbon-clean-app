// routes/admin.js
const express = require('express');
const router = express.Router();
const db = require('../config/db');
const { verifyToken, verifyAdmin } = require('../middleware/auth');

function buildUpdateSet(allowed, payload) {
  const keys = [];
  const vals = [];
  for (const k of allowed) {
    if (payload[k] !== undefined) {
      keys.push(`${k} = ?`);
      vals.push(payload[k]);
    }
  }
  return { setSql: keys.join(', '), values: vals };
}

// 🔧 บังคับให้ status เป็นตัวเลข 0/1 เสมอ
function normalizeUsers(rows) {
  return rows.map((r) => ({
    ...r,
    status: Number(r.status), // <— กันทุกเคส
  }));
}

router.get('/users', verifyToken, verifyAdmin, async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT
        user_id, fname, lname, email, phone, role,
        CAST(status AS UNSIGNED) AS status,
        created_at, updated_at,
        bic_goal, walk_goal, house_member,
        profile_pic_url, vehicle
      FROM users
      ORDER BY user_id DESC
    `);
    const data = normalizeUsers(rows);
    res.json({ data });
  } catch (err) {
    console.error('GET /admin/users error:', err);
    res.status(500).json({ message: 'DB error' });
  }
});

router.put('/users/:id', verifyToken, verifyAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const allowed = [
      'fname', 'lname', 'phone', 'role', 'vehicle',
      'profile_pic_url', 'bic_goal', 'walk_goal', 'house_member', 'status'
    ];

    const payload = { ...req.body };

    // 🔒 sanitize ให้ตรง schema
    if (payload.status !== undefined) payload.status = Number(payload.status) ? 1 : 0;
    if (payload.phone !== undefined) payload.phone = String(payload.phone).slice(0, 10);
    if (payload.role !== undefined) payload.role = String(payload.role).slice(0, 5);
    if (payload.vehicle !== undefined) payload.vehicle = payload.vehicle === '' ? null : String(payload.vehicle).slice(0, 50);
    if (payload.profile_pic_url !== undefined) payload.profile_pic_url = payload.profile_pic_url === '' ? null : String(payload.profile_pic_url).slice(0, 255);
    if (payload.bic_goal !== undefined) payload.bic_goal = payload.bic_goal === '' ? null : Number(payload.bic_goal);
    if (payload.walk_goal !== undefined) payload.walk_goal = payload.walk_goal === '' ? null : Number(payload.walk_goal);
    if (payload.house_member !== undefined) payload.house_member = payload.house_member === '' ? null : Number(payload.house_member);

    const { setSql, values } = buildUpdateSet(allowed, payload);
    if (!setSql) return res.status(400).json({ message: 'No valid fields to update' });

    await db.query(`UPDATE users SET ${setSql} WHERE user_id = ?`, [...values, id]);

    // ดึงกลับมาส่งคืน (พร้อม normalize)
    const [rows] = await db.query(`
      SELECT
        user_id, fname, lname, email, phone, role,
        CAST(status AS UNSIGNED) AS status,
        created_at, updated_at,
        bic_goal, walk_goal, house_member,
        profile_pic_url, vehicle
      FROM users
      WHERE user_id = ?
    `, [id]);

    const data = normalizeUsers(rows)[0] || null;
    res.json({ success: true, data });
  } catch (err) {
    console.error('PUT /admin/users/:id error:', err);
    res.status(500).json({ message: 'DB error' });
  }
});

router.patch('/users/:id/block', verifyToken, verifyAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    await db.query(`UPDATE users SET status = 0 WHERE user_id = ?`, [id]);
    res.json({ success: true, message: 'User blocked' });
  } catch (err) {
    console.error('PATCH /admin/users/:id/block error:', err);
    res.status(500).json({ message: 'DB error' });
  }
});

router.patch('/users/:id/unblock', verifyToken, verifyAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    await db.query(`UPDATE users SET status = 1 WHERE user_id = ?`, [id]);
    res.json({ success: true, message: 'User unblocked' });
  } catch (err) {
    console.error('PATCH /admin/users/:id/unblock error:', err);
    res.status(500).json({ message: 'DB error' });
  }
});

router.delete('/users/:id', verifyToken, verifyAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    await db.query(`DELETE FROM users WHERE user_id = ?`, [id]);
    res.json({ success: true, message: 'User deleted' });
  } catch (err) {
    console.error('DELETE /admin/users/:id error:', err);
    res.status(500).json({ message: 'DB error' });
  }
});

router.get('/summary', verifyToken, verifyAdmin, async (req, res) => {
  try {
    // 1) ตัวเลขรวม/เฉลี่ย
    const [overviewRows] = await db.query(`
      SELECT
        COUNT(*) AS total_users,
        SUM(CAST(status AS UNSIGNED)) AS active_users,
        SUM(CASE WHEN CAST(status AS UNSIGNED)=0 THEN 1 ELSE 0 END) AS blocked_users,
        AVG(house_member) AS avg_household,
        AVG(walk_goal) AS avg_walk_goal,
        AVG(bic_goal) AS avg_bic_goal,
        COUNT(CASE WHEN role='admin' THEN 1 END) AS admins,
        COUNT(CASE WHEN created_at >= (CURRENT_DATE - INTERVAL 7 DAY) THEN 1 END) AS new_7d
      FROM users
    `);

    const overview = overviewRows[0] || {
      total_users: 0, active_users: 0, blocked_users: 0,
      avg_household: null, avg_walk_goal: null, avg_bic_goal: null,
      admins: 0, new_7d: 0
    };

    // 2) signups รายเดือน (12 เดือนล่าสุด)
    const [monthlyRows] = await db.query(`
      SELECT DATE_FORMAT(created_at, '%Y-%m') AS ym, COUNT(*) AS users
      FROM users
      WHERE created_at >= DATE_SUB(CURDATE(), INTERVAL 12 MONTH)
      GROUP BY ym
      ORDER BY ym
    `);

    // 3) breakdown สถานะ
    const [statusRows] = await db.query(`
      SELECT CAST(status AS UNSIGNED) AS status, COUNT(*) AS cnt
      FROM users
      GROUP BY CAST(status AS UNSIGNED)
    `);

    // 4) breakdown role
    const [roleRows] = await db.query(`
      SELECT role, COUNT(*) AS cnt
      FROM users
      GROUP BY role
    `);

    // 5) vehicle distribution
    const [vehicleRows] = await db.query(`
      SELECT COALESCE(NULLIF(TRIM(vehicle), ''), '(none)') AS vehicle, COUNT(*) AS cnt
      FROM users
      GROUP BY vehicle
      ORDER BY cnt DESC
      LIMIT 8
    `);

    res.json({
      success: true,
      data: {
        overview: {
          total_users: Number(overview.total_users) || 0,
          active_users: Number(overview.active_users) || 0,
          blocked_users: Number(overview.blocked_users) || 0,
          admins: Number(overview.admins) || 0,
          new_7d: Number(overview.new_7d) || 0,
          avg_household: overview.avg_household === null ? null : Number(overview.avg_household),
          avg_walk_goal: overview.avg_walk_goal === null ? null : Number(overview.avg_walk_goal),
          avg_bic_goal: overview.avg_bic_goal === null ? null : Number(overview.avg_bic_goal),
        },
        monthly_signups: monthlyRows.map(r => ({ month: r.ym, users: Number(r.users) })),
        status_breakdown: statusRows.map(r => ({ status: Number(r.status), count: Number(r.cnt) })),
        role_breakdown: roleRows.map(r => ({ role: r.role || '(unknown)', count: Number(r.cnt) })),
        vehicle_distribution: vehicleRows.map(r => ({ vehicle: r.vehicle, count: Number(r.cnt) })),
      }
    });
  } catch (err) {
    console.error('GET /admin/summary error:', err);
    res.status(500).json({ message: 'DB error' });
  }
});

module.exports = router;
