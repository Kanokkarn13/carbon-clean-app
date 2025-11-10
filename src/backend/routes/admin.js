// routes/admin.js
const express = require('express');
const router = express.Router();
const db = require('../config/db');
const { verifyToken, verifyAdmin } = require('../middleware/auth');

/* Utility */
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
const normalizeUsers = (rows) =>
  rows.map(r => ({ ...r, status: Number(r.status) }));

/* ---------- Users (เหมือนเดิม) ---------- */
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

router.put('/users/:id', verifyToken, verifyAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const payload = { ...req.body };

    // sanitize
    if (payload.status !== undefined) payload.status = Number(payload.status) ? 1 : 0;
    if (payload.phone !== undefined) payload.phone = String(payload.phone).slice(0, 10);
    if (payload.role !== undefined) payload.role = String(payload.role).slice(0, 5);
    if (payload.vehicle !== undefined) payload.vehicle = payload.vehicle === '' ? null : String(payload.vehicle).slice(0, 50);
    if (payload.profile_pic_url !== undefined) payload.profile_pic_url = payload.profile_pic_url === '' ? null : String(payload.profile_pic_url).slice(0, 255);
    if (payload.bic_goal !== undefined) payload.bic_goal = payload.bic_goal === '' ? null : Number(payload.bic_goal);
    if (payload.walk_goal !== undefined) payload.walk_goal = payload.walk_goal === '' ? null : Number(payload.walk_goal);
    if (payload.house_member !== undefined) payload.house_member = payload.house_member === '' ? null : Number(payload.house_member);

    const allowed = [
      'fname','lname','phone','role','vehicle',
      'profile_pic_url','bic_goal','walk_goal','house_member','status'
    ];
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

/* ---------- SUMMARY หลัก (เพิ่มกิจกรรม/คาร์บอน) ---------- */
router.get('/summary', verifyToken, verifyAdmin, async (req, res) => {
  try {
    // Users – overview
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
    const ov = overviewRows[0] || {};

    // Users – monthly signups
    const [monthlyRows] = await db.query(`
      SELECT DATE_FORMAT(created_at, '%Y-%m') AS ym, COUNT(*) AS users
      FROM users
      WHERE created_at >= DATE_SUB(CURDATE(), INTERVAL 12 MONTH)
      GROUP BY ym
      ORDER BY ym
    `);

    // Users – status breakdown / role breakdown / vehicle
    const [statusRows] = await db.query(`
      SELECT CAST(status AS UNSIGNED) AS status, COUNT(*) AS cnt
      FROM users
      GROUP BY CAST(status AS UNSIGNED)
    `);
    const [roleRows] = await db.query(`
      SELECT role, COUNT(*) AS cnt
      FROM users
      GROUP BY role
    `);
    const [vehicleRows] = await db.query(`
      SELECT COALESCE(NULLIF(TRIM(vehicle), ''), '(none)') AS vehicle, COUNT(*) AS cnt
      FROM users
      GROUP BY vehicle
      ORDER BY cnt DESC
      LIMIT 8
    `);

    // Activities – totals/averages/pace
    const [actTotals] = await db.query(`
      SELECT
        -- count
        (SELECT COUNT(*) FROM walk_history) AS walk_count,
        (SELECT COUNT(*) FROM bic_history ) AS bike_count,
        -- distance all
        COALESCE((SELECT SUM(distance_km) FROM walk_history),0) AS walk_km_all,
        COALESCE((SELECT SUM(distance_km) FROM bic_history ),0) AS bike_km_all,
        -- distance this month
        COALESCE((SELECT SUM(distance_km) FROM walk_history WHERE record_date >= DATE_FORMAT(CURDATE(),'%Y-%m-01')),0) AS walk_km_month,
        COALESCE((SELECT SUM(distance_km) FROM bic_history  WHERE record_date >= DATE_FORMAT(CURDATE(),'%Y-%m-01')),0) AS bike_km_month,
        -- avg distance per activity
        COALESCE((SELECT AVG(distance_km) FROM walk_history),0) AS walk_avg_km,
        COALESCE((SELECT AVG(distance_km) FROM bic_history ),0) AS bike_avg_km,
        -- avg pace km/h
        COALESCE((SELECT AVG(distance_km / NULLIF(duration_sec,0) * 3600) FROM walk_history),0) AS walk_avg_pace_kmh,
        COALESCE((SELECT AVG(distance_km / NULLIF(duration_sec,0) * 3600) FROM bic_history ),0) AS bike_avg_pace_kmh,
        -- carbon totals
        COALESCE((SELECT SUM(carbonReduce) FROM walk_history),0) AS walk_carbon_all,
        COALESCE((SELECT SUM(carbonReduce) FROM bic_history ),0) AS bike_carbon_all,
        COALESCE((SELECT SUM(carbonReduce) FROM walk_history WHERE record_date >= DATE_FORMAT(CURDATE(),'%Y-%m-01')),0) AS walk_carbon_month,
        COALESCE((SELECT SUM(carbonReduce) FROM bic_history  WHERE record_date >= DATE_FORMAT(CURDATE(),'%Y-%m-01')),0) AS bike_carbon_month
    `);

    // Activities – active users 7/30 วัน
    const [active7Rows] = await db.query(`
      SELECT COUNT(DISTINCT user_id) AS active7
      FROM (
        SELECT user_id FROM walk_history WHERE record_date >= NOW() - INTERVAL 7 DAY
        UNION ALL
        SELECT user_id FROM bic_history  WHERE record_date >= NOW() - INTERVAL 7 DAY
      ) t
    `);
    const [active30Rows] = await db.query(`
      SELECT COUNT(DISTINCT user_id) AS active30
      FROM (
        SELECT user_id FROM walk_history WHERE record_date >= NOW() - INTERVAL 30 DAY
        UNION ALL
        SELECT user_id FROM bic_history  WHERE record_date >= NOW() - INTERVAL 30 DAY
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
          avg_bic_goal: ov.avg_bic_goal == null ? null : Number(ov.avg_bic_goal),
        },
        monthly_signups: monthlyRows.map(r => ({ month: r.ym, users: Number(r.users) })),
        status_breakdown: statusRows.map(r => ({ status: Number(r.status), count: Number(r.cnt) })),
        role_breakdown: roleRows.map(r => ({ role: r.role || '(unknown)', count: Number(r.cnt) })),
        vehicle_distribution: vehicleRows.map(r => ({ vehicle: r.vehicle, count: Number(r.cnt) })),
        activity: {
          walk_count: Number(actTotals[0].walk_count) || 0,
          bike_count: Number(actTotals[0].bike_count) || 0,
          total_km_all: Number(actTotals[0].walk_km_all) + Number(actTotals[0].bike_km_all),
          total_km_month: Number(actTotals[0].walk_km_month) + Number(actTotals[0].bike_km_month),
          walk_avg_km: Number(actTotals[0].walk_avg_km) || 0,
          bike_avg_km: Number(actTotals[0].bike_avg_km) || 0,
          walk_avg_pace_kmh: Number(actTotals[0].walk_avg_pace_kmh) || 0,
          bike_avg_pace_kmh: Number(actTotals[0].bike_avg_pace_kmh) || 0,
          carbon_total_all: Number(actTotals[0].walk_carbon_all) + Number(actTotals[0].bike_carbon_all),
          carbon_total_month: Number(actTotals[0].walk_carbon_month) + Number(actTotals[0].bike_carbon_month),
          active7: Number(active7Rows[0].active7) || 0,
          active30: Number(active30Rows[0].active30) || 0,
        }
      }
    });
  } catch (err) {
    console.error('GET /admin/summary error:', err);
    res.status(500).json({ message: 'DB error' });
  }
});

/* ---------- Insights (กราฟ/ตาราง) ---------- */
router.get('/insights/hourly', verifyToken, verifyAdmin, async (req, res) => {
  try {
    const type = (req.query.type || 'walk').toString().toLowerCase(); // walk | bike
    const table = type === 'bike' || type === 'bic' ? 'bic_history' : 'walk_history';
    const [rows] = await db.query(`
      SELECT HOUR(record_date) AS hour_of_day, COUNT(*) AS cnt
      FROM ${table}
      GROUP BY HOUR(record_date)
      ORDER BY hour_of_day
    `);
    res.json({ success: true, data: rows.map(r => ({ hour: Number(r.hour_of_day), count: Number(r.cnt) })) });
  } catch (err) {
    console.error('GET /admin/insights/hourly error:', err);
    res.status(500).json({ message: 'DB error' });
  }
});

router.get('/insights/weekday', verifyToken, verifyAdmin, async (req, res) => {
  try {
    const type = (req.query.type || 'walk').toString().toLowerCase();
    const table = type === 'bike' || type === 'bic' ? 'bic_history' : 'walk_history';
    // 1=Sunday (MySQL) → map เป็นชื่อวัน
    const [rows] = await db.query(`
      SELECT DAYOFWEEK(record_date) AS dow, COUNT(*) AS cnt
      FROM ${table}
      GROUP BY DAYOFWEEK(record_date)
      ORDER BY dow
    `);
    res.json({
      success: true,
      data: rows.map(r => ({ dow: Number(r.dow), count: Number(r.cnt) }))
    });
  } catch (err) {
    console.error('GET /admin/insights/weekday error:', err);
    res.status(500).json({ message: 'DB error' });
  }
});

router.get('/insights/distance_hist', verifyToken, verifyAdmin, async (req, res) => {
  try {
    const type = (req.query.type || 'walk').toString().toLowerCase();
    const table = type === 'bike' || type === 'bic' ? 'bic_history' : 'walk_history';
    const [rows] = await db.query(`
      SELECT FLOOR(distance_km) AS bin_km, COUNT(*) AS cnt
      FROM ${table}
      GROUP BY FLOOR(distance_km)
      ORDER BY bin_km
      LIMIT 50
    `);
    res.json({ success: true, data: rows.map(r => ({ bin: Number(r.bin_km), count: Number(r.cnt) })) });
  } catch (err) {
    console.error('GET /admin/insights/distance_hist error:', err);
    res.status(500).json({ message: 'DB error' });
  }
});

router.get('/insights/leaderboard', verifyToken, verifyAdmin, async (req, res) => {
  try {
    const window = (req.query.window || '30d').toString().toLowerCase(); // 7d|30d|90d
    const metric = (req.query.metric || 'carbon').toString().toLowerCase(); // carbon|distance
    const days = window === '7d' ? 7 : window === '90d' ? 90 : 30;

    const metricCol = metric === 'distance' ? 'distance_km' : 'carbonReduce';

    const [rows] = await db.query(`
      SELECT u.user_id, u.fname, u.lname,
             SUM(t.${metricCol}) AS total_metric
      FROM users u
      JOIN (
        SELECT user_id, ${metricCol}, record_date FROM walk_history
        UNION ALL
        SELECT user_id, ${metricCol}, record_date FROM bic_history
      ) t ON t.user_id = u.user_id
      WHERE t.record_date >= NOW() - INTERVAL ? DAY
      GROUP BY u.user_id
      ORDER BY total_metric DESC
      LIMIT 10
    `, [days]);

    res.json({
      success: true,
      data: rows.map(r => ({
        user_id: r.user_id,
        name: `${r.fname} ${r.lname}`,
        total: Number(r.total_metric)
      }))
    });
  } catch (err) {
    console.error('GET /admin/insights/leaderboard error:', err);
    res.status(500).json({ message: 'DB error' });
  }
});

// ---------------------- NEW: dropdown รายชื่อผู้ใช้แบบเบา ----------------------
router.get('/users/min', verifyToken, verifyAdmin, async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT user_id, CONCAT(fname, ' ', lname) AS name, email
      FROM users
      ORDER BY user_id DESC
      LIMIT 1000
    `);
    res.json({ success: true, data: rows });
  } catch (err) {
    console.error('GET /admin/users/min error:', err);
    res.status(500).json({ message: 'DB error' });
  }
});

// ---------------------- NEW: Activity Explorer (รวม walk + bike) ----------------------
router.get('/activity', verifyToken, verifyAdmin, async (req, res) => {
  try {
    // query params: user_id (required), type: 'all'|'walk'|'bike', date_from, date_to, limit, offset
    const userId = Number(req.query.user_id);
    const type = (req.query.type || 'all').toString().toLowerCase(); // all | walk | bike
    const dateFrom = req.query.date_from ? new Date(req.query.date_from) : null;
    const dateTo   = req.query.date_to   ? new Date(req.query.date_to)   : null;
    const limit  = Math.min(Math.max(Number(req.query.limit) || 20, 1), 200);
    const offset = Math.max(Number(req.query.offset) || 0, 0);

    if (!Number.isFinite(userId)) {
      return res.status(400).json({ message: 'user_id is required' });
    }

    // สร้างเงื่อนไขวันที่แบบยืดหยุ่น
    const walkConds = ['w.user_id = ?'];
    const bikeConds = ['b.user_id = ?'];
    const paramsWalk = [userId];
    const paramsBike = [userId];

    if (dateFrom) {
      walkConds.push('w.record_date >= ?');
      bikeConds.push('b.record_date >= ?');
      paramsWalk.push(dateFrom);
      paramsBike.push(dateFrom);
    }
    if (dateTo) {
      walkConds.push('w.record_date <= ?');
      bikeConds.push('b.record_date <= ?');
      paramsWalk.push(dateTo);
      paramsBike.push(dateTo);
    }

    // แต่ละ SELECT ให้ column เดียวกัน เพื่อ UNION ได้ง่าย
    const walkSql = `
      SELECT
        'walk' AS type,
        w.id,
        w.record_date,
        w.distance_km,
        w.carbonReduce,
        w.duration_sec,
        w.step_total,
        NULL AS title_bike,
        w.title AS title,
        w.description AS description
      FROM walk_history w
      WHERE ${walkConds.join(' AND ')}
    `;

    const bikeSql = `
      SELECT
        'bike' AS type,
        b.id,
        b.record_date,
        b.distance_km,
        b.carbonReduce,
        b.duration_sec,
        NULL AS step_total,
        b.title AS title_bike,
        b.title AS title,
        b.description AS description
      FROM bic_history b
      WHERE ${bikeConds.join(' AND ')}
    `;

    // เลือก type
    let unionSql = '';
    let unionParams = [];
    if (type === 'walk') {
      unionSql = walkSql;
      unionParams = paramsWalk;
    } else if (type === 'bike') {
      unionSql = bikeSql;
      unionParams = paramsBike;
    } else {
      // all
      unionSql = `${walkSql} UNION ALL ${bikeSql}`;
      unionParams = [...paramsWalk, ...paramsBike];
    }

    // ต้อง wrap แล้ว ORDER BY + LIMIT ให้ทั้งกอง
    const finalSql = `
      SELECT *
      FROM (
        ${unionSql}
      ) t
      ORDER BY t.record_date DESC
      LIMIT ? OFFSET ?
    `;

    const [rows] = await db.query(finalSql, [...unionParams, limit, offset]);

    // แยกนับรวมหมด (เพื่อ pagination)
    const countSql = `
      SELECT COUNT(*) AS total FROM (
        ${unionSql}
      ) x
    `;
    const [countRows] = await db.query(countSql, unionParams);
    const total = Number(countRows?.[0]?.total || 0);

    res.json({
      success: true,
      data: rows.map(r => ({
        ...r,
        distance_km: r.distance_km == null ? null : Number(r.distance_km),
        carbonReduce: r.carbonReduce == null ? null : Number(r.carbonReduce),
        duration_sec: r.duration_sec == null ? null : Number(r.duration_sec),
        step_total: r.step_total == null ? null : Number(r.step_total),
      })),
      pagination: { total, limit, offset }
    });
  } catch (err) {
    console.error('GET /admin/activity error:', err);
    res.status(500).json({ message: 'DB error' });
  }
});

module.exports = router;
