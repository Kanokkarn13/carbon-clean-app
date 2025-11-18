const express = require('express');
const router = express.Router();
const db = require('../config/db');
const { verifyToken, verifyAdmin } = require('../middleware/auth');

/* ---------------------- helpers ---------------------- */
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
function normalizeUsers(rows) {
  return rows.map((r) => ({ ...r, status: Number(r.status) }));
}

function pickTable(type) {
  // map type -> table and nice label
  if (type === 'bike' || type === 'bic' || type === 'bicycle') {
    return { table: 'bic_history', label: 'bike' };
  }
  return { table: 'walk_history', label: 'walk' }; // default
}
function parseWindowToSql(windowStr) {
  // returns SQL condition on record_date
  // '7d','30d','90d','all' (default 30d)
  const w = String(windowStr || '').toLowerCase();
  if (w === '7d') return "record_date >= DATE_SUB(NOW(), INTERVAL 7 DAY)";
  if (w === '90d') return "record_date >= DATE_SUB(NOW(), INTERVAL 90 DAY)";
  if (w === 'all') return "1=1";
  // default 30d
  return "record_date >= DATE_SUB(NOW(), INTERVAL 30 DAY)";
}

/* ====================== Users APIs ====================== */
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
    res.json({ data: normalizeUsers(rows) });
  } catch (err) {
    console.error('GET /admin/users error:', err);
    res.status(500).json({ message: 'DB error' });
  }
});

// 🔹 Minimal user list for selectors: /admin/users/min
router.get('/users/min', verifyToken, verifyAdmin, async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT user_id, fname, lname, email
      FROM users
      ORDER BY user_id DESC
      LIMIT 1000
    `);
    const data = rows.map(r => ({
      user_id: r.user_id,
      name: [r.fname, r.lname].filter(Boolean).join(' ') || r.email || `user_${r.user_id}`,
      email: r.email
    }));
    res.json({ success: true, data });
  } catch (err) {
    console.error('GET /admin/users/min error:', err);
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

    res.json({ success: true, data: normalizeUsers(rows)[0] || null });
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

/* ====================== Summary API ====================== */
// แทนที่ทั้ง router.get('/summary', ...) เดิมใน src/backend/routes/admin.js

router.get('/summary', verifyToken, verifyAdmin, async (req, res) => {
  try {
    // ----- 1) ผู้ใช้ -----
    const [ovRows] = await db.query(`
      SELECT
        COUNT(*) AS total_users,
        SUM(CAST(status AS UNSIGNED)) AS active_users,
        SUM(CASE WHEN CAST(status AS UNSIGNED)=0 THEN 1 ELSE 0 END) AS blocked_users,
        COUNT(CASE WHEN role='admin' THEN 1 END) AS admins,
        COUNT(CASE WHEN created_at >= (CURRENT_DATE - INTERVAL 7 DAY) THEN 1 END) AS new_7d,
        AVG(house_member) AS avg_household,
        AVG(walk_goal) AS avg_walk_goal,
        AVG(bic_goal)  AS avg_bic_goal
      FROM users
    `);
    const ov = ovRows[0] || {};

    const [mon] = await db.query(`
      SELECT DATE_FORMAT(created_at, '%Y-%m') AS ym, COUNT(*) AS users
      FROM users
      WHERE created_at >= DATE_SUB(CURDATE(), INTERVAL 12 MONTH)
      GROUP BY ym
      ORDER BY ym
    `);

    const [statusRows] = await db.query(`
      SELECT CAST(status AS UNSIGNED) AS status, COUNT(*) AS cnt
      FROM users GROUP BY CAST(status AS UNSIGNED)
    `);
    const [roleRows] = await db.query(`SELECT role, COUNT(*) AS cnt FROM users GROUP BY role`);
    const [vehicleRows] = await db.query(`
      SELECT COALESCE(NULLIF(TRIM(vehicle), ''), '(none)') AS vehicle, COUNT(*) AS cnt
      FROM users
      GROUP BY vehicle
      ORDER BY cnt DESC
      LIMIT 8
    `);

    // ----- 2) กิจกรรม (Walk + Bike) -----
    // รวมทั้งหมด + ของเดือนนี้ + นับรายการ + ค่าเฉลี่ยระยะ/pace
    const [aggAll] = await db.query(`
      SELECT
        -- รวมระยะทางทั้งหมด (กม.)
        COALESCE((SELECT SUM(distance_km) FROM walk_history),0)
          + COALESCE((SELECT SUM(distance_km) FROM bic_history),0) AS total_km_all,
        -- รวมคาร์บอนทั้งหมด (กก. CO2e)
        COALESCE((SELECT SUM(carbonReduce) FROM walk_history),0)
          + COALESCE((SELECT SUM(carbonReduce) FROM bic_history),0) AS carbon_total_all,

        -- ระยะทางเดือนนี้
        COALESCE((SELECT SUM(distance_km) FROM walk_history
                  WHERE YEAR(record_date)=YEAR(CURDATE())
                    AND MONTH(record_date)=MONTH(CURDATE())),0)
          + COALESCE((SELECT SUM(distance_km) FROM bic_history
                  WHERE YEAR(record_date)=YEAR(CURDATE())
                    AND MONTH(record_date)=MONTH(CURDATE())),0) AS total_km_month,
        -- คาร์บอนเดือนนี้
        COALESCE((SELECT SUM(carbonReduce) FROM walk_history
                  WHERE YEAR(record_date)=YEAR(CURDATE())
                    AND MONTH(record_date)=MONTH(CURDATE())),0)
          + COALESCE((SELECT SUM(carbonReduce) FROM bic_history
                  WHERE YEAR(record_date)=YEAR(CURDATE())
                    AND MONTH(record_date)=MONTH(CURDATE())),0) AS carbon_total_month,

        -- นับจำนวนกิจกรรม
        (SELECT COUNT(*) FROM walk_history) AS walk_count,
        (SELECT COUNT(*) FROM bic_history)  AS bike_count
    `);

    const [avgRows] = await db.query(`
      SELECT
        (SELECT AVG(distance_km) FROM walk_history WHERE distance_km > 0) AS walk_avg_km,
        (SELECT AVG(distance_km) FROM bic_history  WHERE distance_km > 0) AS bike_avg_km,

        (SELECT AVG(distance_km / (duration_sec/3600))
           FROM walk_history
          WHERE duration_sec IS NOT NULL AND duration_sec > 0 AND distance_km IS NOT NULL) AS walk_avg_pace_kmh,

        (SELECT AVG(distance_km / (duration_sec/3600))
           FROM bic_history
          WHERE duration_sec IS NOT NULL AND duration_sec > 0 AND distance_km IS NOT NULL) AS bike_avg_pace_kmh
    `);

    const [activeRows] = await db.query(`
      SELECT
        (SELECT COUNT(DISTINCT user_id) FROM (
           SELECT user_id, record_date FROM walk_history
           UNION ALL
           SELECT user_id, record_date FROM bic_history
         ) u WHERE u.record_date >= DATE_SUB(NOW(), INTERVAL 7 DAY))  AS active7,
        (SELECT COUNT(DISTINCT user_id) FROM (
           SELECT user_id, record_date FROM walk_history
           UNION ALL
           SELECT user_id, record_date FROM bic_history
         ) u WHERE u.record_date >= DATE_SUB(NOW(), INTERVAL 30 DAY)) AS active30
    `);

    // ----- 3) ส่งกลับ -----
    res.json({
      success: true,
      data: {
        overview: {
          total_users: Number(ov.total_users) || 0,
          active_users: Number(ov.active_users) || 0,
          blocked_users: Number(ov.blocked_users) || 0,
          admins: Number(ov.admins) || 0,
          new_7d: Number(ov.new_7d) || 0,
          avg_household: ov.avg_household == null ? null : Number(ov.avg_household),
          avg_walk_goal: ov.avg_walk_goal == null ? null : Number(ov.avg_walk_goal),
          avg_bic_goal:  ov.avg_bic_goal  == null ? null : Number(ov.avg_bic_goal),
        },
        monthly_signups: mon.map(r => ({ month: r.ym, users: Number(r.users) })),
        status_breakdown: statusRows.map(r => ({ status: Number(r.status), count: Number(r.cnt) })),
        role_breakdown: roleRows.map(r => ({ role: r.role || '(unknown)', count: Number(r.cnt) })),
        vehicle_distribution: vehicleRows.map(r => ({ vehicle: r.vehicle, count: Number(r.cnt) })),
        activity: {
          walk_count: Number(aggAll[0].walk_count) || 0,
          bike_count: Number(aggAll[0].bike_count) || 0,
          total_km_all: Number(aggAll[0].total_km_all) || 0,
          total_km_month: Number(aggAll[0].total_km_month) || 0,
          carbon_total_all: Number(aggAll[0].carbon_total_all) || 0,
          carbon_total_month: Number(aggAll[0].carbon_total_month) || 0,
          walk_avg_km:        avgRows[0].walk_avg_km        == null ? 0 : Number(avgRows[0].walk_avg_km),
          bike_avg_km:        avgRows[0].bike_avg_km        == null ? 0 : Number(avgRows[0].bike_avg_km),
          walk_avg_pace_kmh:  avgRows[0].walk_avg_pace_kmh  == null ? 0 : Number(avgRows[0].walk_avg_pace_kmh),
          bike_avg_pace_kmh:  avgRows[0].bike_avg_pace_kmh  == null ? 0 : Number(avgRows[0].bike_avg_pace_kmh),
          active7:  Number(activeRows[0].active7)  || 0,
          active30: Number(activeRows[0].active30) || 0,
        }
      }
    });
  } catch (err) {
    console.error('GET /admin/summary error:', err);
    res.status(500).json({ message: 'DB error' });
  }
});


/* ====================== Insights APIs (NEW) ====================== */
/**
 * GET /admin/insights/hourly?type=walk|bike
 * กลุ่มจำนวนกิจกรรมตามชั่วโมง (0-23)
 */
router.get('/insights/hourly', verifyToken, verifyAdmin, async (req, res) => {
  try {
    const { type = 'walk' } = req.query;
    const { table } = pickTable(String(type).toLowerCase());

    const [rows] = await db.query(`
      SELECT HOUR(record_date) AS h, COUNT(*) AS cnt
      FROM ${table}
      GROUP BY HOUR(record_date)
      ORDER BY h
    `);
    const data = Array.from({ length: 24 }, (_, h) => {
      const r = rows.find(x => Number(x.h) === h);
      return { hour: h, count: r ? Number(r.cnt) : 0 };
    });
    res.json({ success: true, data });
  } catch (err) {
    console.error('GET /admin/insights/hourly error:', err);
    res.status(500).json({ message: 'DB error' });
  }
});

/**
 * GET /admin/insights/weekday?type=walk|bike
 * กลุ่มจำนวนกิจกรรมตามวันในสัปดาห์ (0-6) อา=0 … ส=6
 */
router.get('/insights/weekday', verifyToken, verifyAdmin, async (req, res) => {
  try {
    const { type = 'walk' } = req.query;
    const { table } = pickTable(String(type).toLowerCase());

    const [rows] = await db.query(`
      SELECT DAYOFWEEK(record_date) - 1 AS wd, COUNT(*) AS cnt
      FROM ${table}
      GROUP BY DAYOFWEEK(record_date) - 1
      ORDER BY wd
    `);
    const data = Array.from({ length: 7 }, (_, wd) => {
      const r = rows.find(x => Number(x.wd) === wd);
      return { weekday: wd, count: r ? Number(r.cnt) : 0 };
    });
    res.json({ success: true, data });
  } catch (err) {
    console.error('GET /admin/insights/weekday error:', err);
    res.status(500).json({ message: 'DB error' });
  }
});

/**
 * GET /admin/insights/distance_hist?type=walk|bike
 * ฮิสโตแกรมระยะทาง (bin size 1 กม. 0–1,1–2,..., >=20 รวมเป็น 20+)
 */
router.get('/insights/distance_hist', verifyToken, verifyAdmin, async (req, res) => {
  try {
    const { type = 'walk' } = req.query;
    const { table } = pickTable(String(type).toLowerCase());

    const [rows] = await db.query(`
      SELECT
        CASE
          WHEN distance_km >= 20 THEN 20
          ELSE FLOOR(distance_km)
        END AS bin,
        COUNT(*) AS cnt
      FROM ${table}
      WHERE distance_km IS NOT NULL
      GROUP BY bin
      ORDER BY bin
    `);
    // bins 0..20 (20 = 20+)
    const data = Array.from({ length: 21 }, (_, b) => {
      const r = rows.find(x => Number(x.bin) === b);
      return { bin: b, label: b === 20 ? '20+' : `${b}-${b+1}`, count: r ? Number(r.cnt) : 0 };
    });
    res.json({ success: true, data });
  } catch (err) {
    console.error('GET /admin/insights/distance_hist error:', err);
    res.status(500).json({ message: 'DB error' });
  }
});

/**
 * GET /admin/insights/leaderboard?window=7d|30d|90d|all&metric=carbon|distance
 * สรุป top ผู้ใช้ตาม metric ในช่วงเวลาที่กำหนด
 */
router.get('/insights/leaderboard', verifyToken, verifyAdmin, async (req, res) => {
  try {
    const windowStr = String(req.query.window || '30d').toLowerCase();
    const metric = String(req.query.metric || 'carbon').toLowerCase(); // 'carbon' | 'distance'
    const whereWindow = parseWindowToSql(windowStr);

    // รวม 2 ตาราง (เดิน+ปั่น) แล้ว sum ตาม metric
    // metric=carbon -> SUM(carbonReduce), metric=distance -> SUM(distance_km)
    const metricExpr = metric === 'distance' ? 'distance_km' : 'carbonReduce';

    const [rows] = await db.query(`
      SELECT u.user_id,
             CONCAT(COALESCE(u.fname,''), ' ', COALESCE(u.lname,'')) AS name,
             u.email,
             SUM(x.${metricExpr}) AS total_value
      FROM (
          SELECT user_id, ${metricExpr}, record_date FROM walk_history WHERE ${whereWindow}
          UNION ALL
          SELECT user_id, ${metricExpr}, record_date FROM bic_history  WHERE ${whereWindow}
      ) AS x
      JOIN users u ON u.user_id = x.user_id
      GROUP BY u.user_id, name, u.email
      ORDER BY total_value DESC
      LIMIT 20
    `);

    const data = rows.map(r => ({
      user_id: r.user_id,
      name: (r.name || '').trim() || r.email || `user_${r.user_id}`,
      total: Number(r.total_value || 0)
    }));
    res.json({ success: true, data, meta: { window: windowStr, metric } });
  } catch (err) {
    console.error('GET /admin/insights/leaderboard error:', err);
    res.status(500).json({ message: 'DB error' });
  }
});

/* ====================== Rewards Management ====================== */
const REWARD_TABLE = 'reward'; // ใช้ชื่อ table เอกพจน์ตาม DB ของคุณ

// List
router.get('/rewards', verifyToken, verifyAdmin, async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT
        id, title, description, image_url, cost_points,
        expires_at, CAST(active AS UNSIGNED) AS active,
        stock, created_at, updated_at
      FROM ${REWARD_TABLE}
      ORDER BY created_at DESC, id DESC
    `);
    res.json({ success: true, data: rows });
  } catch (err) {
    console.error('GET /admin/rewards error:', err);
    res.status(500).json({ message: 'DB error on rewards list' });
  }
});

// Create
router.post('/rewards', verifyToken, verifyAdmin, async (req, res) => {
  try {
    let { title, description, image_url, cost_points, expires_at, active, stock } = req.body;

    title = String(title || '').slice(0, 120);
    description = description ?? '';
    image_url = image_url ? String(image_url).slice(0, 255) : null;
    cost_points = Number.isFinite(Number(cost_points)) ? Number(cost_points) : 0;
    stock = Number.isFinite(Number(stock)) ? Number(stock) : 0;
    active = Number(active) ? 1 : 0;
    expires_at = expires_at || null; // 'YYYY-MM-DD HH:mm:ss' หรือ null

    const [result] = await db.query(
      `INSERT INTO ${REWARD_TABLE}
        (title, description, image_url, cost_points, expires_at, active, stock, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
      [title, description, image_url, cost_points, expires_at, active, stock]
    );

    const [rows] = await db.query(`
      SELECT
        id, title, description, image_url, cost_points,
        expires_at, CAST(active AS UNSIGNED) AS active,
        stock, created_at, updated_at
      FROM ${REWARD_TABLE}
      WHERE id = ?
    `, [result.insertId]);

    res.json({ success: true, data: rows[0] });
  } catch (err) {
    console.error('POST /admin/rewards error:', err);
    res.status(500).json({ message: 'DB error on reward create' });
  }
});

// Update
router.put('/rewards/:id', verifyToken, verifyAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    let { title, description, image_url, cost_points, expires_at, active, stock } = req.body;

    const fields = [];
    const values = [];
    if (title !== undefined) { fields.push('title = ?'); values.push(String(title).slice(0,120)); }
    if (description !== undefined) { fields.push('description = ?'); values.push(String(description)); }
    if (image_url !== undefined) { fields.push('image_url = ?'); values.push(image_url ? String(image_url).slice(0,255) : null); }
    if (cost_points !== undefined) { fields.push('cost_points = ?'); values.push(Number(cost_points) || 0); }
    if (expires_at !== undefined) { fields.push('expires_at = ?'); values.push(expires_at || null); }
    if (active !== undefined) { fields.push('active = ?'); values.push(Number(active) ? 1 : 0); }
    if (stock !== undefined) { fields.push('stock = ?'); values.push(Number(stock) || 0); }

    if (!fields.length) return res.status(400).json({ message: 'No fields to update' });
    fields.push('updated_at = NOW()');

    await db.query(
      `UPDATE ${REWARD_TABLE} SET ${fields.join(', ')} WHERE id = ?`,
      [...values, id]
    );

    const [rows] = await db.query(`
      SELECT
        id, title, description, image_url, cost_points,
        expires_at, CAST(active AS UNSIGNED) AS active,
        stock, created_at, updated_at
      FROM ${REWARD_TABLE}
      WHERE id = ?
    `, [id]);

    res.json({ success: true, data: rows[0] || null });
  } catch (err) {
    console.error('PUT /admin/rewards/:id error:', err);
    res.status(500).json({ message: 'DB error on reward update' });
  }
});

// Toggle active
router.patch('/rewards/:id/toggle', verifyToken, verifyAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    await db.query(`UPDATE ${REWARD_TABLE} SET active = 1 - active, updated_at = NOW() WHERE id = ?`, [id]);
    res.json({ success: true });
  } catch (err) {
    console.error('PATCH /admin/rewards/:id/toggle error:', err);
    res.status(500).json({ message: 'DB error on toggle' });
  }
});

// Delete
router.delete('/rewards/:id', verifyToken, verifyAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    await db.query(`DELETE FROM ${REWARD_TABLE} WHERE id = ?`, [id]);
    res.json({ success: true });
  } catch (err) {
    console.error('DELETE /admin/rewards/:id error:', err);
    res.status(500).json({ message: 'DB error on reward delete' });
  }
});

module.exports = router;
