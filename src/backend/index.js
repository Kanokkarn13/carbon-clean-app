// routes/admin.js
const express = require('express');
const router = express.Router();
const db = require('../config/db');
const { verifyToken, verifyAdmin } = require('../middleware/auth');

/* ---------------- helpers ---------------- */
function normalizeUsers(rows) {
  return rows.map(r => ({ ...r, status: Number(r.status) }));
}

/* ===================== USERS ===================== */

// รายการผู้ใช้เต็ม
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
    res.json({ success: true, data: normalizeUsers(rows) });
  } catch (err) {
    console.error('GET /admin/users error:', err);
    res.status(500).json({ message: 'DB error' });
  }
});

// minimal users สำหรับตัวกรอง/selector
router.get('/users/min', verifyToken, verifyAdmin, async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT user_id,
             TRIM(CONCAT_WS(' ', fname, lname)) AS name
      FROM users
      ORDER BY created_at DESC
      LIMIT 500
    `);
    res.json({ success: true, data: rows });
  } catch (err) {
    console.error('GET /admin/users/min error:', err);
    res.status(500).json({ message: 'DB error' });
  }
});

/* (อัพเดต/บล็อค/ลบ user ฟังก์ชันเดิมของคุณคงไว้ได้ ถ้าต้องการให้ย้ายจากไฟล์เก่ามาแปะตรงนี้) */

/* ===================== SUMMARY + ACTIVITY ===================== */

router.get('/summary', verifyToken, verifyAdmin, async (req, res) => {
  try {
    // ----- Overview จาก users -----
    const [ovRows] = await db.query(`
      SELECT
        COUNT(*) AS total_users,
        SUM(CAST(status AS UNSIGNED)) AS active_users,
        SUM(CASE WHEN CAST(status AS UNSIGNED)=0 THEN 1 ELSE 0 END) AS blocked_users,
        COUNT(CASE WHEN role='admin' THEN 1 END) AS admins,
        COUNT(CASE WHEN created_at >= (CURRENT_DATE - INTERVAL 7 DAY) THEN 1 END) AS new_7d,
        AVG(house_member) AS avg_household,
        AVG(walk_goal)    AS avg_walk_goal,
        AVG(bic_goal)     AS avg_bic_goal
      FROM users
    `);
    const ov = ovRows[0] || {};

    // signups 12 เดือนล่าสุด
    const [monthlyRows] = await db.query(`
      SELECT DATE_FORMAT(created_at, '%Y-%m') AS month, COUNT(*) AS users
      FROM users
      WHERE created_at >= DATE_SUB(CURDATE(), INTERVAL 12 MONTH)
      GROUP BY month
      ORDER BY month
    `);

    // status / role / vehicle
    const [statusRows] = await db.query(`
      SELECT CAST(status AS UNSIGNED) AS status, COUNT(*) AS count
      FROM users
      GROUP BY CAST(status AS UNSIGNED)
    `);
    const [roleRows] = await db.query(`
      SELECT role, COUNT(*) AS count
      FROM users
      GROUP BY role
    `);
    const [vehicleRows] = await db.query(`
      SELECT COALESCE(NULLIF(TRIM(vehicle), ''), '(none)') AS vehicle, COUNT(*) AS count
      FROM users
      GROUP BY vehicle
      ORDER BY count DESC
      LIMIT 8
    `);

    // ----- Activity รวม walk + bike -----
    // day 1 of this month (อิง record_date)
    const [[{ mstart }]] = await db.query(
      `SELECT DATE_FORMAT(CURDATE(), '%Y-%m-01') AS mstart`
    );

    // รวมทั้งหมด
    const [[tot]] = await db.query(`
      SELECT
        COALESCE(SUM(w_c),0) + COALESCE(SUM(b_c),0) AS carbon_total_all,
        COALESCE(SUM(w_d),0) + COALESCE(SUM(b_d),0) AS total_km_all
      FROM (
        SELECT SUM(carbonReduce) AS w_c, SUM(distance_km) AS w_d FROM walk_history
      ) w,
      (
        SELECT SUM(carbonReduce) AS b_c, SUM(distance_km) AS b_d FROM bic_history
      ) b
    `);

    // ของเดือนนี้
    const [[mon]] = await db.query(`
      SELECT
        COALESCE(SUM(w_c),0) + COALESCE(SUM(b_c),0) AS carbon_total_month,
        COALESCE(SUM(w_d),0) + COALESCE(SUM(b_d),0) AS total_km_month
      FROM (
        SELECT SUM(carbonReduce) AS w_c, SUM(distance_km) AS w_d
        FROM walk_history WHERE record_date >= ?
      ) w,
      (
        SELECT SUM(carbonReduce) AS b_c, SUM(distance_km) AS b_d
        FROM bic_history WHERE record_date >= ?
      ) b
    `, [mstart, mstart]);

    // ค่าเฉลี่ยระยะต่อ activity และ pace (km/h)
    const [[avgRows]] = await db.query(`
      SELECT
        (SELECT COALESCE(AVG(NULLIF(distance_km,0)),0) FROM walk_history) AS walk_avg_km,
        (SELECT COALESCE(AVG(NULLIF(distance_km,0)),0) FROM bic_history ) AS bike_avg_km,
        (SELECT COALESCE(AVG(distance_km / NULLIF(duration_sec,0) * 3600),0) FROM walk_history) AS walk_avg_pace_kmh,
        (SELECT COALESCE(AVG(distance_km / NULLIF(duration_sec,0) * 3600),0) FROM bic_history ) AS bike_avg_pace_kmh,
        (SELECT COUNT(*) FROM walk_history) AS walk_count,
        (SELECT COUNT(*) FROM bic_history ) AS bike_count
    `);

    // ผู้ใช้ที่ “มี activity อย่างน้อย 1 ครั้ง” ในช่วง 7/30 วันล่าสุด (active users count)
    const [[act7]] = await db.query(`
      SELECT COUNT(DISTINCT user_id) AS active7
      FROM (
        SELECT user_id, record_date FROM walk_history WHERE record_date >= NOW()-INTERVAL 7 DAY
        UNION ALL
        SELECT user_id, record_date FROM bic_history  WHERE record_date >= NOW()-INTERVAL 7 DAY
      ) t
    `);
    const [[act30]] = await db.query(`
      SELECT COUNT(DISTINCT user_id) AS active30
      FROM (
        SELECT user_id, record_date FROM walk_history WHERE record_date >= NOW()-INTERVAL 30 DAY
        UNION ALL
        SELECT user_id, record_date FROM bic_history  WHERE record_date >= NOW()-INTERVAL 30 DAY
      ) t
    `);

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
        monthly_signups: monthlyRows.map(r => ({ month: r.month, users: Number(r.users) })),
        status_breakdown: statusRows.map(r => ({ status: Number(r.status), count: Number(r.count) })),
        role_breakdown: roleRows.map(r => ({ role: r.role || '(unknown)', count: Number(r.count) })),
        vehicle_distribution: vehicleRows.map(r => ({ vehicle: r.vehicle, count: Number(r.count) })),
        activity: {
          walk_count: Number(avgRows.walk_count) || 0,
          bike_count: Number(avgRows.bike_count) || 0,
          total_km_all: Number(tot.total_km_all) || 0,
          total_km_month: Number(mon.total_km_month) || 0,
          walk_avg_km: Number(avgRows.walk_avg_km) || 0,
          bike_avg_km: Number(avgRows.bike_avg_km) || 0,
          walk_avg_pace_kmh: Number(avgRows.walk_avg_pace_kmh) || 0,
          bike_avg_pace_kmh: Number(avgRows.bike_avg_pace_kmh) || 0,
          carbon_total_all: Number(tot.carbon_total_all) || 0,
          carbon_total_month: Number(mon.carbon_total_month) || 0,
          active7: Number(act7.active7) || 0,
          active30: Number(act30.active30) || 0,
        }
      }
    });
  } catch (err) {
    console.error('GET /admin/summary error:', err);
    res.status(500).json({ message: 'DB error' });
  }
});

/* ===================== INSIGHTS ===================== */

// กราฟตามชั่วโมง
router.get('/insights/hourly', verifyToken, verifyAdmin, async (req, res) => {
  try {
    const type = (req.query.type || 'walk').toString() === 'bike' ? 'bic' : 'walk';
    const table = type === 'walk' ? 'walk_history' : 'bic_history';
    const [rows] = await db.query(`
      SELECT HOUR(record_date) AS hour, COUNT(*) AS count
      FROM ${table}
      GROUP BY HOUR(record_date)
      ORDER BY hour
    `);
    res.json({ success: true, data: rows.map(r => ({ hour: Number(r.hour), count: Number(r.count) })) });
  } catch (err) {
    console.error('GET /admin/insights/hourly error:', err);
    res.status(500).json({ message: 'DB error' });
  }
});

// กราฟตามวันในสัปดาห์ (1=Sun … 7=Sat)
router.get('/insights/weekday', verifyToken, verifyAdmin, async (req, res) => {
  try {
    const type = (req.query.type || 'walk').toString() === 'bike' ? 'bic' : 'walk';
    const table = type === 'walk' ? 'walk_history' : 'bic_history';
    const [rows] = await db.query(`
      SELECT DAYOFWEEK(record_date) AS dow, COUNT(*) AS count
      FROM ${table}
      GROUP BY DAYOFWEEK(record_date)
      ORDER BY dow
    `);
    res.json({ success: true, data: rows.map(r => ({ dow: Number(r.dow), count: Number(r.count) })) });
  } catch (err) {
    console.error('GET /admin/insights/weekday error:', err);
    res.status(500).json({ message: 'DB error' });
  }
});

// ฮิสโตแกรมระยะทาง (bin = FLOOR(distance_km))
router.get('/insights/distance_hist', verifyToken, verifyAdmin, async (req, res) => {
  try {
    const type = (req.query.type || 'walk').toString() === 'bike' ? 'bic' : 'walk';
    const table = type === 'walk' ? 'walk_history' : 'bic_history';
    const [rows] = await db.query(`
      SELECT FLOOR(COALESCE(distance_km,0)) AS bin, COUNT(*) AS count
      FROM ${table}
      GROUP BY FLOOR(COALESCE(distance_km,0))
      ORDER BY bin
      LIMIT 50
    `);
    res.json({ success: true, data: rows.map(r => ({ bin: Number(r.bin), count: Number(r.count) })) });
  } catch (err) {
    console.error('GET /admin/insights/distance_hist error:', err);
    res.status(500).json({ message: 'DB error' });
  }
});

// Leaderboard (รวม walk+bike)
router.get('/insights/leaderboard', verifyToken, verifyAdmin, async (req, res) => {
  try {
    const window = (req.query.window || '30d').toString(); // '7d' | '30d' | '90d'
    const metric = (req.query.metric || 'carbon').toString(); // 'carbon' | 'distance'
    const days = window === '7d' ? 7 : window === '90d' ? 90 : 30;

    const metricCol = metric === 'distance' ? 'distance_km' : 'carbonReduce';

    const [rows] = await db.query(`
      SELECT
        u.user_id,
        TRIM(CONCAT_WS(' ', u.fname, u.lname)) AS name,
        SUM(val) AS total
      FROM (
        SELECT user_id, COALESCE(${metricCol},0) AS val, record_date
        FROM walk_history
        WHERE record_date >= NOW() - INTERVAL ? DAY
        UNION ALL
        SELECT user_id, COALESCE(${metricCol},0) AS val, record_date
        FROM bic_history
        WHERE record_date >= NOW() - INTERVAL ? DAY
      ) t
      JOIN users u ON u.user_id = t.user_id
      GROUP BY u.user_id, name
      ORDER BY total DESC
      LIMIT 20
    `, [days, days]);

    res.json({
      success: true,
      data: rows.map(r => ({ user_id: r.user_id, name: r.name, total: Number(r.total) }))
    });
  } catch (err) {
    console.error('GET /admin/insights/leaderboard error:', err);
    res.status(500).json({ message: 'DB error' });
  }
});

module.exports = router;
