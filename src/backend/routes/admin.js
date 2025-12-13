// src/backend/routes/admin.js
const express = require('express');
const router = express.Router();

const db = require('../config/db');
const { verifyToken, verifyAdmin } = require('../middleware/auth');

const multer = require('multer');
const path = require('path');
const crypto = require('crypto');
const { uploadBufferToS3, getSignedGetObjectUrl } = require('../utils/s3');

/* ====================== MULTER (memory) ====================== */
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
});

/* ====================== HELPERS ====================== */
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
  return rows.map((r) => ({
    ...r,
    status: Number(r.status),
    profile_picture: r.profile_pic_url || null,
  }));
}
function pickTable(type) {
  if (type === 'bike' || type === 'bic' || type === 'bicycle') {
    return { table: 'bic_history', label: 'bike' };
  }
  return { table: 'walk_history', label: 'walk' };
}
function whereByWindowOrRange({ window, from, to }, column = 'record_date') {
  const hasRange = from || to;
  if (hasRange) {
    const f = from ? `${from} 00:00:00` : '1970-01-01 00:00:00';
    const t = to   ? `${to} 23:59:59` : '2999-12-31 23:59:59';
    return `${column} BETWEEN '${f}' AND '${t}'`;
  }
  const w = String(window || '').toLowerCase();
  if (w === '7d') return `${column} >= DATE_SUB(NOW(), INTERVAL 7 DAY)`;
  if (w === '30d') return `${column} >= DATE_SUB(NOW(), INTERVAL 30 DAY)`;
  if (w === '90d') return `${column} >= DATE_SUB(NOW(), INTERVAL 90 DAY)`;
  if (w === 'this_week') return `YEARWEEK(${column}, 1) = YEARWEEK(CURDATE(), 1)`;
  if (w === 'this_month') return `DATE_FORMAT(${column}, '%Y-%m') = DATE_FORMAT(CURDATE(), '%Y-%m')`;
  if (w === 'all') return "1=1";
  return `${column} >= DATE_SUB(NOW(), INTERVAL 30 DAY)`;
}
function safeInt(v, def = 0) {
  const n = Number(v);
  return Number.isFinite(n) ? n : def;
}
function makePublicFileUrl(req, key, group) {
  const base = `${req.protocol}://${req.get('host')}`;
  return `${base}/api/admin/${group}/file?key=${encodeURIComponent(key)}`;
}

function normalizeType(raw) {
  const t = String(raw || 'all').toLowerCase();
  if (t === 'walk') return 'walk';
  if (t === 'bike' || t === 'bic' || t === 'bicycle') return 'bike';
  return 'all';
}

function parseFilters(query) {
  const type = normalizeType(query.type);
  const window = query.window;
  const from = query.date_from || query.from;
  const to = query.date_to || query.to;
  const metric = String(query.metric || 'carbon').toLowerCase() === 'distance' ? 'distance' : 'carbon';
  return { type, window, from, to, metric };
}

// Optional override for point tables date columns; if unset, skip date filtering to avoid DB errors
const RC_POINT_DATE_COL = process.env.RC_POINT_DATE_COL || null;
const E_POINT_DATE_COL = process.env.E_POINT_DATE_COL || null;

/* ============================================================
 * USERS
 * ============================================================ */
router.get('/users', verifyToken, verifyAdmin, async (_req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT user_id, fname, lname, email, phone, role,
             CAST(status AS UNSIGNED) AS status,
             created_at, updated_at, bic_goal, walk_goal, house_member,
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

router.get('/users/min', verifyToken, verifyAdmin, async (_req, res) => {
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
      'fname','lname','phone','role','vehicle',
      'profile_pic_url','bic_goal','walk_goal','house_member','status'
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
      SELECT user_id, fname, lname, email, phone, role,
             CAST(status AS UNSIGNED) AS status,
             created_at, updated_at, bic_goal, walk_goal, house_member,
             profile_pic_url, vehicle
      FROM users WHERE user_id = ?
    `, [id]);

    res.json({ success: true, data: normalizeUsers(rows)[0] || null });
  } catch (err) {
    console.error('PUT /admin/users/:id error:', err);
    res.status(500).json({ message: 'DB error' });
  }
});

router.patch('/users/:id/block', verifyToken, verifyAdmin, async (req, res) => {
  try { await db.query(`UPDATE users SET status = 0 WHERE user_id = ?`, [req.params.id]); res.json({ success:true }); }
  catch (err) { console.error(err); res.status(500).json({ message:'DB error' }); }
});
router.patch('/users/:id/unblock', verifyToken, verifyAdmin, async (req, res) => {
  try { await db.query(`UPDATE users SET status = 1 WHERE user_id = ?`, [req.params.id]); res.json({ success:true }); }
  catch (err) { console.error(err); res.status(500).json({ message:'DB error' }); }
});
router.delete('/users/:id', verifyToken, verifyAdmin, async (req, res) => {
  try { await db.query(`DELETE FROM users WHERE user_id = ?`, [req.params.id]); res.json({ success:true }); }
  catch (err) { console.error(err); res.status(500).json({ message:'DB error' }); }
});

/* ============== WHO AM I ============== */
router.get('/me', verifyToken, verifyAdmin, async (req, res) => {
  try {
    const uid = Number(req.user?.user_id || 0);
    if (!uid) return res.status(401).json({ message: 'unauthorized' });
    const [rows] = await db.query(`SELECT user_id, fname, lname, email FROM users WHERE user_id = ?`, [uid]);
    const u = rows[0] || {};
    res.json({
      success: true,
      data: {
        user_id: u.user_id,
        name: [u.fname, u.lname].filter(Boolean).join(' ') || u.email || `user_${u.user_id}`,
        email: u.email
      }
    });
  } catch (err) {
    console.error('GET /admin/me error:', err);
    res.status(500).json({ message: 'DB error' });
  }
});

/* ============================================================
 * SUMMARY / INSIGHTS / RECENT
 * ============================================================ */
router.get('/summary', verifyToken, verifyAdmin, async (req, res) => {
  try {
    const filters = parseFilters(req.query);
    const includeWalk = filters.type === 'all' || filters.type === 'walk';
    const includeBike = filters.type === 'all' || filters.type === 'bike';

    const whereWalk = whereByWindowOrRange(filters, 'record_date');
    const whereBike = whereByWindowOrRange(filters, 'record_date');
    const userDateFilters = (filters.window || filters.from || filters.to) ? filters : { ...filters, window: 'all' };
    const whereUsers = whereByWindowOrRange(userDateFilters, 'u.created_at');
    const whereEPoint = E_POINT_DATE_COL ? whereByWindowOrRange(filters, E_POINT_DATE_COL) : '1=1';
    const whereRcPoint = RC_POINT_DATE_COL ? whereByWindowOrRange(filters, RC_POINT_DATE_COL) : '1=1';

    const [walkAggRows] = includeWalk
      ? await db.query(`
          SELECT
            COALESCE(SUM(distance_km),0) AS dist,
            COALESCE(SUM(carbonReduce),0) AS carbon,
            COUNT(*) AS cnt
          FROM walk_history WHERE ${whereWalk}
        `)
      : [[{ dist: 0, carbon: 0, cnt: 0 }]];
    const [bikeAggRows] = includeBike
      ? await db.query(`
          SELECT
            COALESCE(SUM(distance_km),0) AS dist,
            COALESCE(SUM(carbonReduce),0) AS carbon,
            COUNT(*) AS cnt
          FROM bic_history WHERE ${whereBike}
        `)
      : [[{ dist: 0, carbon: 0, cnt: 0 }]];

    const walkAgg = walkAggRows[0] || { dist: 0, carbon: 0, cnt: 0 };
    const bikeAgg = bikeAggRows[0] || { dist: 0, carbon: 0, cnt: 0 };

    // Active users for filter scope (based on filtered activities)
    const activityUnions = [];
    const activityUnionsWithDate = [];
    if (includeWalk) {
      activityUnionsWithDate.push(`SELECT user_id, record_date FROM walk_history WHERE ${whereWalk}`);
    }
    if (includeBike) {
      activityUnionsWithDate.push(`SELECT user_id, record_date FROM bic_history WHERE ${whereBike}`);
    }
    const activeWithDateSql = activityUnionsWithDate.length
      ? activityUnionsWithDate.join(' UNION ALL ')
      : 'SELECT NULL AS user_id, NULL AS record_date WHERE 0';

    const [ovRows] = await db.query(`
      SELECT COUNT(*) AS total_users,
             SUM(CAST(u.status AS UNSIGNED)) AS active_users,
             SUM(CASE WHEN CAST(u.status AS UNSIGNED)=0 THEN 1 ELSE 0 END) AS blocked_users,
             COUNT(CASE WHEN u.role='admin' THEN 1 END) AS admins,
             COUNT(CASE WHEN u.created_at >= (CURRENT_DATE - INTERVAL 7 DAY) THEN 1 END) AS new_7d,
             AVG(u.house_member) AS avg_household,
             AVG(u.walk_goal) AS avg_walk_goal,
             AVG(u.bic_goal)  AS avg_bic_goal
      FROM users u
      WHERE ${whereUsers}
    `);
    const ov = ovRows[0] || {};

    const [mon] = await db.query(`
      SELECT DATE_FORMAT(u.created_at, '%Y-%m') AS ym, COUNT(*) AS users
      FROM users u
      WHERE ${whereUsers}
      GROUP BY ym ORDER BY ym
    `);
    const [statusRows] = await db.query(`
      SELECT CAST(u.status AS UNSIGNED) AS status, COUNT(*) AS cnt
      FROM users u
      WHERE ${whereUsers}
      GROUP BY CAST(u.status AS UNSIGNED)
    `);
    const [roleRows] = await db.query(`
      SELECT u.role, COUNT(*) AS cnt
      FROM users u
      WHERE ${whereUsers}
      GROUP BY u.role
    `);
    const [vehicleRows] = await db.query(`
      SELECT COALESCE(NULLIF(TRIM(u.vehicle), ''), '(none)') AS vehicle, COUNT(*) AS cnt
      FROM users u
      WHERE ${whereUsers}
      GROUP BY vehicle ORDER BY cnt DESC LIMIT 8
    `);

    // Unfiltered user totals (all time) so KPI shows full user base
    const [allUserTotalsRows] = await db.query(`
      SELECT COUNT(*) AS total_users_alltime,
             SUM(CAST(status AS UNSIGNED)) AS active_users_alltime,
             SUM(CASE WHEN CAST(status AS UNSIGNED)=0 THEN 1 ELSE 0 END) AS blocked_users_alltime,
             COUNT(CASE WHEN role='admin' THEN 1 END) AS admins_alltime
      FROM users
    `);
    const allUserTotals = allUserTotalsRows[0] || {};

    const [rcPointRows] = await db.query(`
      SELECT COALESCE(SUM(point_value),0) AS total FROM rc_point WHERE ${whereRcPoint}
    `);
    const [ePointRows] = await db.query(`
      SELECT COALESCE(SUM(point_value),0) AS total FROM e_point WHERE ${whereEPoint}
    `);

    const [avgRows] = await db.query(`
      SELECT
        (SELECT AVG(distance_km) FROM walk_history WHERE distance_km > 0 AND ${whereWalk}) AS walk_avg_km,
        (SELECT AVG(distance_km) FROM bic_history  WHERE distance_km > 0 AND ${whereBike}) AS bike_avg_km,
        (SELECT AVG(distance_km / (duration_sec/3600))
           FROM walk_history WHERE duration_sec IS NOT NULL AND duration_sec > 0 AND distance_km IS NOT NULL AND ${whereWalk}) AS walk_avg_pace_kmh,
        (SELECT AVG(distance_km / (duration_sec/3600))
           FROM bic_history  WHERE duration_sec IS NOT NULL AND duration_sec > 0 AND distance_km IS NOT NULL AND ${whereBike}) AS bike_avg_pace_kmh
    `);

    const [activeRows] = await db.query(`
      SELECT
        (SELECT COUNT(DISTINCT user_id) FROM (
           ${activeWithDateSql}
         ) u WHERE u.record_date >= DATE_SUB(NOW(), INTERVAL 7 DAY))  AS active7,
        (SELECT COUNT(DISTINCT user_id) FROM (
           ${activeWithDateSql}
         ) u WHERE u.record_date >= DATE_SUB(NOW(), INTERVAL 30 DAY)) AS active30
    `);

    res.json({
      success: true,
      data: {
        overview: {
          total_users: Number(allUserTotals.total_users_alltime) || 0,
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
          walk_count: includeWalk ? Number(walkAgg.cnt) || 0 : 0,
          bike_count: includeBike ? Number(bikeAgg.cnt) || 0 : 0,
          total_km_all: (includeWalk ? Number(walkAgg.dist) : 0) + (includeBike ? Number(bikeAgg.dist) : 0),
          total_km_month: (includeWalk ? Number(walkAgg.dist) : 0) + (includeBike ? Number(bikeAgg.dist) : 0),
          carbon_total_all: (includeWalk ? Number(walkAgg.carbon) : 0) + (includeBike ? Number(bikeAgg.carbon) : 0) + Number(rcPointRows[0]?.total || 0),
          carbon_total_month: Number(ePointRows[0]?.total || 0),
          walk_avg_km:        includeWalk && avgRows[0].walk_avg_km        != null ? Number(avgRows[0].walk_avg_km) : 0,
          bike_avg_km:        includeBike && avgRows[0].bike_avg_km        != null ? Number(avgRows[0].bike_avg_km) : 0,
          walk_avg_pace_kmh:  includeWalk && avgRows[0].walk_avg_pace_kmh  != null ? Number(avgRows[0].walk_avg_pace_kmh) : 0,
          bike_avg_pace_kmh:  includeBike && avgRows[0].bike_avg_pace_kmh  != null ? Number(avgRows[0].bike_avg_pace_kmh) : 0,
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

router.get('/insights/hourly', verifyToken, verifyAdmin, async (req, res) => {
  try {
    const filters = parseFilters(req.query);
    const { table } = pickTable(filters.type);
    const whereTime = whereByWindowOrRange(filters, 'record_date');
    const [rows] = await db.query(`
      SELECT HOUR(record_date) AS h, COUNT(*) AS cnt
      FROM ${table} WHERE ${whereTime}
      GROUP BY HOUR(record_date) ORDER BY h
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

router.get('/insights/weekday', verifyToken, verifyAdmin, async (req, res) => {
  try {
    const filters = parseFilters(req.query);
    const { table } = pickTable(filters.type);
    const whereTime = whereByWindowOrRange(filters, 'record_date');
    const [rows] = await db.query(`
      SELECT (DAYOFWEEK(record_date) - 1) AS wd, COUNT(*) AS cnt
      FROM ${table} WHERE ${whereTime}
      GROUP BY (DAYOFWEEK(record_date) - 1) ORDER BY wd
    `);
    const data = Array.from({ length: 7 }, (_, wd) => {
      const r = rows.find(x => Number(x.wd) === wd);
      return { dow: wd, count: r ? Number(r.cnt) : 0 };
    });
    res.json({ success: true, data });
  } catch (err) {
    console.error('GET /admin/insights/weekday error:', err);
    res.status(500).json({ message: 'DB error' });
  }
});

router.get('/insights/distance_hist', verifyToken, verifyAdmin, async (req, res) => {
  try {
    const filters = parseFilters(req.query);
    const { table } = pickTable(filters.type);
    const whereTime = whereByWindowOrRange(filters, 'record_date');
    const [rows] = await db.query(`
      SELECT CASE WHEN distance_km >= 20 THEN 20 ELSE FLOOR(distance_km) END AS bin,
             COUNT(*) AS cnt
      FROM ${table}
      WHERE ${whereTime} AND distance_km IS NOT NULL
      GROUP BY bin ORDER BY bin
    `);
    const data = Array.from({ length: 21 }, (_, b) => {
      const r = rows.find(x => Number(x.bin) === b);
      return { bin: b, count: r ? Number(r.cnt) : 0 };
    });
    res.json({ success: true, data });
  } catch (err) {
    console.error('GET /admin/insights/distance_hist error:', err);
    res.status(500).json({ message: 'DB error' });
  }
});

router.get('/insights/leaderboard', verifyToken, verifyAdmin, async (req, res) => {
  try {
    const filters = parseFilters(req.query);
    const metricExpr = filters.metric === 'distance' ? 'distance_km' : 'carbonReduce';
    const whereWindow = whereByWindowOrRange(filters, 'record_date');

    const parts = [];
    if (filters.type === 'all' || filters.type === 'walk') {
      parts.push(`SELECT user_id, ${metricExpr} AS val, record_date FROM walk_history WHERE ${whereWindow}`);
    }
    if (filters.type === 'all' || filters.type === 'bike') {
      parts.push(`SELECT user_id, ${metricExpr} AS val, record_date FROM bic_history WHERE ${whereWindow}`);
    }
    const unionSql = parts.length ? parts.join(' UNION ALL ') : 'SELECT NULL AS user_id, 0 AS val, NULL AS record_date WHERE 0';

    const [rows] = await db.query(`
      SELECT u.user_id,
             CONCAT(COALESCE(u.fname,''), ' ', COALESCE(u.lname,'')) AS name,
             u.email, SUM(x.val) AS total_value
      FROM (${unionSql}) x
      JOIN users u ON u.user_id = x.user_id
      GROUP BY u.user_id, name, u.email
      ORDER BY total_value DESC LIMIT 10
    `);
    const data = rows.map(r => ({
      user_id: r.user_id,
      name: (r.name || '').trim() || r.email || `user_${r.user_id}`,
      total: Number(r.total_value || 0),
    }));
    res.json({ success: true, data, meta: { window: filters.window, metric: filters.metric, from: filters.from, to: filters.to, type: filters.type } });
  } catch (err) {
    console.error('GET /admin/insights/leaderboard error:', err);
    res.status(500).json({ message: 'DB error' });
  }
});

router.get('/insights/aggregates', verifyToken, verifyAdmin, async (req, res) => {
  try {
    const filters = parseFilters(req.query);

    // activity tables ใช้ record_date เหมือนเดิม
    const whereTime = whereByWindowOrRange(filters, 'record_date');

    // ✅ รองรับ RC_POINT_DATE_COL / E_POINT_DATE_COL ถ้ามีตั้งไว้
    // ✅ ถ้าไม่ตั้ง ให้ลอง create_at / created_at อัตโนมัติ (กัน DB schema ไม่เหมือนกัน)
    const rcCandidates = RC_POINT_DATE_COL ? [RC_POINT_DATE_COL] : ['create_at', 'created_at'];
    const eCandidates  = E_POINT_DATE_COL  ? [E_POINT_DATE_COL]  : ['create_at', 'created_at'];

    const includeWalk = filters.type === 'all' || filters.type === 'walk';
    const includeBike = filters.type === 'all' || filters.type === 'bike';

    // ลองคอมโบ column จนกว่าจะ query ผ่าน
    let rows = null;
    let lastErr = null;

    for (const rcCol of rcCandidates) {
      for (const eCol of eCandidates) {
        try {
          const whereRcPointAgg = whereByWindowOrRange(filters, rcCol);
          const whereEPointAgg  = whereByWindowOrRange(filters, eCol);

          const [r] = await db.query(`
            SELECT
              ${
                includeWalk
                  ? `COALESCE((SELECT SUM(w.carbonReduce) FROM walk_history w WHERE ${whereTime}), 0)`
                  : '0'
              }
              +
              ${
                includeBike
                  ? `COALESCE((SELECT SUM(b.carbonReduce) FROM bic_history  b WHERE ${whereTime}), 0)`
                  : '0'
              }
              +
              COALESCE((SELECT SUM(point_value) FROM rc_point WHERE ${whereRcPointAgg}), 0) AS carbon_reduced,

              COALESCE((SELECT SUM(point_value) FROM e_point  WHERE ${whereEPointAgg}), 0) AS carbon_emitted
          `);

          rows = r;
          lastErr = null;
          break;
        } catch (err) {
          lastErr = err;
          // ถ้าเป็น Unknown column ให้ลองชื่อ column อื่นต่อ
          const msg = String(err?.message || '');
          if (!msg.toLowerCase().includes('unknown column')) {
            // ถ้า error ไม่ใช่เรื่องคอลัมน์ ให้โยนขึ้นไปเลย
            throw err;
          }
        }
      }
      if (rows) break;
    }

    if (!rows) {
      console.error('GET /admin/insights/aggregates error (column candidates failed):', lastErr);
      return res.status(500).json({ message: 'DB error' });
    }

    res.json({
      success: true,
      data: {
        carbon_reduced: Number(rows[0]?.carbon_reduced || 0),
        carbon_emitted: Number(rows[0]?.carbon_emitted || 0),
      },
    });
  } catch (err) {
    console.error('GET /admin/insights/aggregates error:', err);
    res.status(500).json({ message: 'DB error' });
  }
});


// Ledger of activities contributing to carbon reduced
router.get('/insights/ledger/reduced', verifyToken, verifyAdmin, async (req, res) => {
  try {
    const filters = parseFilters(req.query);
    const whereTime = whereByWindowOrRange(filters, 'record_date');
    const includeWalk = filters.type === 'all' || filters.type === 'walk';
    const includeBike = filters.type === 'all' || filters.type === 'bike';
    const rcDateCol = RC_POINT_DATE_COL || 'create_at';
    const whereRcTime = whereByWindowOrRange(filters, rcDateCol);
    const limit = Math.min(Number(req.query.limit || 10), 100);

    const parts = [];
    if (includeWalk) {
      parts.push(`
        SELECT w.record_date, 'walk' AS type, w.distance_km, w.carbonReduce,
               u.user_id, CONCAT(COALESCE(u.fname,''),' ',COALESCE(u.lname,'')) AS name, u.email,
               NULL AS activity_from, NULL AS param_from, NULL AS activity_to, NULL AS param_to
        FROM walk_history w JOIN users u ON u.user_id = w.user_id
        WHERE ${whereTime}
      `);
    }
    if (includeBike) {
      parts.push(`
        SELECT b.record_date, 'bike' AS type, b.distance_km, b.carbonReduce,
               u.user_id, CONCAT(COALESCE(u.fname,''),' ',COALESCE(u.lname,'')) AS name, u.email,
               NULL AS activity_from, NULL AS param_from, NULL AS activity_to, NULL AS param_to
        FROM bic_history b JOIN users u ON u.user_id = b.user_id
        WHERE ${whereTime}
      `);
    }
    // rc_point entries with both activity_from and activity_to present
    parts.push(`
      SELECT r.${rcDateCol} AS record_date, 'rc_point' AS type, r.distance_km, r.point_value AS carbonReduce,
             u.user_id, CONCAT(COALESCE(u.fname,''),' ',COALESCE(u.lname,'')) AS name, u.email,
             r.activity_from, r.param_from, r.activity_to, r.param_to
      FROM rc_point r JOIN users u ON u.user_id = r.user_id
      WHERE ${whereRcTime}
        AND COALESCE(NULLIF(TRIM(r.activity_from),''), '') <> ''
        AND COALESCE(NULLIF(TRIM(r.activity_to),''), '') <> ''
    `);
    const unionSql = parts.length ? parts.join(' UNION ALL ') : 'SELECT NULL AS record_date, NULL AS type, NULL AS distance_km, NULL AS carbonReduce, NULL AS user_id, NULL AS name, NULL AS email WHERE 0';

    const [rows] = await db.query(`
      SELECT * FROM (${unionSql}) x
      ORDER BY record_date DESC
      LIMIT ${limit}
    `);

    const [totals] = await db.query(`
      SELECT
        ${includeWalk ? `COALESCE((SELECT SUM(carbonReduce) FROM walk_history WHERE ${whereTime}),0)` : '0'}
        +
        ${includeBike ? `COALESCE((SELECT SUM(carbonReduce) FROM bic_history WHERE ${whereTime}),0)` : '0'}
        +
        COALESCE((SELECT SUM(point_value) FROM rc_point WHERE ${whereRcTime}
                  AND COALESCE(NULLIF(TRIM(activity_from),''), '') <> ''
                  AND COALESCE(NULLIF(TRIM(activity_to),''), '') <> ''),0) AS carbon_total
    `);

    const data = rows.map(r => ({
      date: r.record_date,
      type: r.type,
      distance_km: r.distance_km == null ? null : Number(r.distance_km),
      carbon_reduced: r.carbonReduce == null ? null : Number(r.carbonReduce),
      user_id: r.user_id,
      user_name: (r.name || '').trim() || r.email || (r.user_id ? `user_${r.user_id}` : ''),
      email: r.email,
      activity_from: r.activity_from || null,
      param_from: r.param_from || null,
      activity_to: r.activity_to || null,
      param_to: r.param_to || null,
    }));

    res.json({
      success: true,
      data,
      totals: { carbon_reduced: Number(totals[0]?.carbon_total || 0) },
      meta: { window: filters.window, from: filters.from, to: filters.to, type: filters.type, limit }
    });
  } catch (err) {
    console.error('GET /admin/insights/ledger/reduced error:', err);
    res.status(500).json({ message: 'DB error' });
  }
});

// Ledger of activities contributing to carbon emitted (from e_point)
router.get('/insights/ledger/emitted', verifyToken, verifyAdmin, async (req, res) => {
  try {
    const filters = parseFilters(req.query);
    const eDateCol = E_POINT_DATE_COL || 'create_at';
    const whereETime = whereByWindowOrRange(filters, eDateCol);
    const limit = Math.min(Number(req.query.limit || 10), 100);

    const [rows] = await db.query(`
      SELECT
        e.${eDateCol} AS record_date,
        'e_point' AS type,
        e.activity,
        e.point_value AS carbon_emitted,
        e.distance_km,
        u.user_id,
        CONCAT(COALESCE(u.fname,''),' ',COALESCE(u.lname,'')) AS name,
        u.email
      FROM e_point e
      JOIN users u ON u.user_id = e.user_id
      WHERE ${whereETime}
      ORDER BY e.${eDateCol} DESC
      LIMIT ${limit}
    `);

    const [totals] = await db.query(`
      SELECT COALESCE(SUM(point_value),0) AS carbon_total
      FROM e_point
      WHERE ${whereETime}
    `);

    const data = rows.map(r => ({
      date: r.record_date,
      type: r.type,
      activity: r.activity || null,
      distance_km: r.distance_km == null ? null : Number(r.distance_km),
      carbon_emitted: r.carbon_emitted == null ? null : Number(r.carbon_emitted),
      user_id: r.user_id,
      user_name: (r.name || '').trim() || r.email || (r.user_id ? `user_${r.user_id}` : ''),
      email: r.email,
    }));

    res.json({
      success: true,
      data,
      totals: { carbon_emitted: Number(totals[0]?.carbon_total || 0) },
      meta: { window: filters.window, from: filters.from, to: filters.to, limit }
    });
  } catch (err) {
    console.error('GET /admin/insights/ledger/emitted error:', err);
    res.status(500).json({ message: 'DB error' });
  }
});

router.get('/recent-activities', verifyToken, verifyAdmin, async (req, res) => {
  try {
    const { window, from, to } = req.query;
    const limit = Math.min(Number(req.query.limit || 50), 200);
    const whereTime = whereByWindowOrRange({ window, from, to });
    const [rows] = await db.query(`
      SELECT * FROM (
        SELECT w.id AS id, w.user_id,
               CONCAT(COALESCE(u.fname,''),' ',COALESCE(u.lname,'')) AS name,
               u.email, 'walk' AS type, w.distance_km, w.carbonReduce,
               (CASE WHEN w.duration_sec>0 AND w.distance_km IS NOT NULL
                     THEN (w.distance_km/(w.duration_sec/3600)) ELSE NULL END) AS pace_kmh,
               w.record_date
        FROM walk_history w JOIN users u ON u.user_id = w.user_id
        WHERE ${whereTime}
        UNION ALL
        SELECT b.id AS id, b.user_id,
               CONCAT(COALESCE(u.fname,''),' ',COALESCE(u.lname,'')) AS name,
               u.email, 'bike' AS type, b.distance_km, b.carbonReduce,
               (CASE WHEN b.duration_sec>0 AND b.distance_km IS NOT NULL
                     THEN (b.distance_km/(b.duration_sec/3600)) ELSE NULL END) AS pace_kmh,
               b.record_date
        FROM bic_history b JOIN users u ON u.user_id = b.user_id
        WHERE ${whereTime}
      ) x
      ORDER BY record_date DESC
      LIMIT ${limit}
    `);
    const data = rows.map(r => ({
      id: r.id, user_id: r.user_id,
      name: (r.name || '').trim() || r.email || `user_${r.user_id}`,
      type: r.type,
      distance_km: Number(r.distance_km || 0),
      carbon: Number(r.carbonReduce || 0),
      pace_kmh: r.pace_kmh == null ? null : Number(r.pace_kmh),
      record_date: r.record_date
    }));
    res.json({ success: true, data });
  } catch (err) {
    console.error('GET /admin/recent-activities error:', err);
    res.status(500).json({ message: 'DB error' });
  }
});

/* ===================== NEW: Activity Explorer (per user) ===================== */
/*  GET /api/admin/activity?user_id=19&type=all|walk|bike&limit=20&offset=0
 *  รองรับ date_from, date_to, window (เหมือนส่วน insights อื่น ๆ)
 */
router.get('/activity', verifyToken, verifyAdmin, async (req, res) => {
  try {
    const userId = safeInt(req.query.user_id, 0);
    if (!userId) {
      return res.status(400).json({ message: 'user_id is required' });
    }

    const type   = String(req.query.type || 'all').toLowerCase();
    const limit  = Math.min(safeInt(req.query.limit, 20), 200);
    const offset = Math.max(safeInt(req.query.offset, 0), 0);

    // ✅ รองรับ filter เวลา: ใช้ date_from/date_to จาก frontend
    const window = req.query.window || 'all';
    const from   = req.query.date_from || req.query.from || '';
    const to     = req.query.date_to   || req.query.to   || '';

    // ใช้ helper เดิม (ใช้กับ summary/insights อยู่แล้ว)
    const whereTime = whereByWindowOrRange({ window, from, to });

    let dataSql = '';
    let countSql = '';
    let params = [];
    let countParams = [];

    if (type === 'walk') {
      // ----- WALK ONLY -----
      dataSql = `
        SELECT w.id, w.user_id, 'walk' AS type,
               w.distance_km, w.carbonReduce, w.duration_sec, w.step_total,
               w.title, w.description,
               (CASE WHEN w.duration_sec > 0 AND w.distance_km IS NOT NULL
                     THEN (w.distance_km / (w.duration_sec/3600)) ELSE NULL END) AS pace_kmh,
               w.record_date
        FROM walk_history w
        WHERE w.user_id = ? AND ${whereTime}
        ORDER BY w.record_date DESC
        LIMIT ? OFFSET ?
      `;
      params = [userId, limit, offset];

      countSql = `
        SELECT COUNT(*) AS cnt
        FROM walk_history
        WHERE user_id = ? AND ${whereTime}
      `;
      countParams = [userId];
    } else if (type === 'bike' || type === 'bic' || type === 'bicycle') {
      // ----- BIKE ONLY -----
      dataSql = `
        SELECT b.id, b.user_id, 'bike' AS type,
               b.distance_km, b.carbonReduce, b.duration_sec, NULL AS step_total,
               b.title, b.description,
               (CASE WHEN b.duration_sec > 0 AND b.distance_km IS NOT NULL
                     THEN (b.distance_km / (b.duration_sec/3600)) ELSE NULL END) AS pace_kmh,
               b.record_date
        FROM bic_history b
        WHERE b.user_id = ? AND ${whereTime}
        ORDER BY b.record_date DESC
        LIMIT ? OFFSET ?
      `;
      params = [userId, limit, offset];

      countSql = `
        SELECT COUNT(*) AS cnt
        FROM bic_history
        WHERE user_id = ? AND ${whereTime}
      `;
      countParams = [userId];
    } else {
      // ----- ALL (walk + bike) -----
      dataSql = `
        SELECT * FROM (
          SELECT w.id, w.user_id, 'walk' AS type,
                 w.distance_km, w.carbonReduce, w.duration_sec, w.step_total,
                 w.title, w.description,
                 (CASE WHEN w.duration_sec > 0 AND w.distance_km IS NOT NULL
                       THEN (w.distance_km / (w.duration_sec/3600)) ELSE NULL END) AS pace_kmh,
                 w.record_date
          FROM walk_history w
          WHERE w.user_id = ? AND ${whereTime}

          UNION ALL

          SELECT b.id, b.user_id, 'bike' AS type,
                 b.distance_km, b.carbonReduce, b.duration_sec, NULL AS step_total,
                 b.title, b.description,
                 (CASE WHEN b.duration_sec > 0 AND b.distance_km IS NOT NULL
                       THEN (b.distance_km / (b.duration_sec/3600)) ELSE NULL END) AS pace_kmh,
                 b.record_date
          FROM bic_history b
          WHERE b.user_id = ? AND ${whereTime}
        ) x
        ORDER BY x.record_date DESC
        LIMIT ? OFFSET ?
      `;
      params = [userId, userId, limit, offset];

      countSql = `
        SELECT
          (
            (SELECT COUNT(*) FROM walk_history WHERE user_id = ? AND ${whereTime})
            +
            (SELECT COUNT(*) FROM bic_history  WHERE user_id = ? AND ${whereTime})
          ) AS cnt
      `;
      countParams = [userId, userId];
    }

    const [rows] = await db.query(dataSql, params);
    const [[cntRow]] = await db.query(countSql, countParams);

    const total = Number(cntRow?.cnt || 0);

    const data = rows.map(r => ({
      id: r.id,
      user_id: r.user_id,
      type: r.type,
      distance_km: r.distance_km == null ? null : Number(r.distance_km),
      carbonReduce: r.carbonReduce == null ? null : Number(r.carbonReduce),
      duration_sec: r.duration_sec == null ? null : Number(r.duration_sec),
      step_total: r.step_total == null ? null : Number(r.step_total),
      title: r.title || null,
      description: r.description || null,
      pace_kmh: r.pace_kmh == null ? null : Number(r.pace_kmh),
      record_date: r.record_date
    }));

    const meta = {
      user_id: userId,
      type,
      limit,
      offset,
      total,
      window,
      from,
      to
    };

    res.json({
      success: true,
      data,
      meta,
      pagination: {
        total,
        limit,
        offset
      }
    });
  } catch (err) {
    console.error('GET /admin/activity error:', err);
    res.status(500).json({ message: 'DB error' });
  }
});


/* ============================================================
 * REWARDS + S3 PUBLIC
 * ============================================================ */
const REWARD_TABLE = 'reward';

router.get('/rewards', verifyToken, verifyAdmin, async (_req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT id, title, description, image_url, cost_points,
             start_at, expires_at, CAST(active AS UNSIGNED) AS active,
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

router.post('/rewards', verifyToken, verifyAdmin, async (req, res) => {
  try {
    let {
      title,
      description,
      image_url,
      cost_points,
      start_at,
      expires_at,
      active,
      stock
    } = req.body;

    title = String(title || '').slice(0, 120);
    description = description ?? '';
    image_url = image_url ? String(image_url).slice(0, 255) : null;
    cost_points = Number.isFinite(Number(cost_points)) ? Number(cost_points) : 0;
    stock = Number.isFinite(Number(stock)) ? Number(stock) : 0;
    active = Number(active) ? 1 : 0;
    start_at = start_at || null;
    expires_at = expires_at || null;

    const [result] = await db.query(
      `INSERT INTO ${REWARD_TABLE}
        (title, description, image_url, cost_points, start_at, expires_at, active, stock, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
      [title, description, image_url, cost_points, start_at, expires_at, active, stock]
    );

    const [rows] = await db.query(`
      SELECT id, title, description, image_url, cost_points,
             start_at, expires_at, CAST(active AS UNSIGNED) AS active,
             stock, created_at, updated_at
      FROM ${REWARD_TABLE} WHERE id = ?
    `, [result.insertId]);

    res.json({ success: true, data: rows[0] });
  } catch (err) {
    console.error('POST /admin/rewards error:', err);
    res.status(500).json({ message: 'DB error on reward create' });
  }
});

router.put('/rewards/:id', verifyToken, verifyAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    let {
      title,
      description,
      image_url,
      cost_points,
      start_at,
      expires_at,
      active,
      stock
    } = req.body;

    const fields = [], values = [];
    if (title !== undefined)      { fields.push('title = ?');       values.push(String(title).slice(0,120)); }
    if (description !== undefined){ fields.push('description = ?'); values.push(String(description)); }
    if (image_url !== undefined)  { fields.push('image_url = ?');   values.push(image_url ? String(image_url).slice(0,255) : null); }
    if (cost_points !== undefined){ fields.push('cost_points = ?'); values.push(Number(cost_points) || 0); }
    if (start_at !== undefined)   { fields.push('start_at = ?');    values.push(start_at || null); }
    if (expires_at !== undefined) { fields.push('expires_at = ?');  values.push(expires_at || null); }
    if (active !== undefined)     { fields.push('active = ?');      values.push(Number(active) ? 1 : 0); }
    if (stock !== undefined)      { fields.push('stock = ?');       values.push(Number(stock) || 0); }

    if (!fields.length) return res.status(400).json({ message: 'No fields to update' });
    fields.push('updated_at = NOW()');

    await db.query(
      `UPDATE ${REWARD_TABLE} SET ${fields.join(', ')} WHERE id = ?`,
      [...values, id]
    );

    const [rows] = await db.query(`
      SELECT id, title, description, image_url, cost_points,
             start_at, expires_at, CAST(active AS UNSIGNED) AS active,
             stock, created_at, updated_at
      FROM ${REWARD_TABLE} WHERE id = ?
    `, [id]);

    res.json({ success: true, data: rows[0] || null });
  } catch (err) {
    console.error('PUT /admin/rewards/:id error:', err);
    res.status(500).json({ message: 'DB error on reward update' });
  }
});

router.patch('/rewards/:id/toggle', verifyToken, verifyAdmin, async (req, res) => {
  try {
    await db.query(
      `UPDATE ${REWARD_TABLE} SET active = 1 - active, updated_at = NOW() WHERE id = ?`,
      [req.params.id]
    );
    res.json({ success:true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message:'DB error on toggle' });
  }
});

router.delete('/rewards/:id', verifyToken, verifyAdmin, async (req, res) => {
  try {
    await db.query(`DELETE FROM ${REWARD_TABLE} WHERE id = ?`, [req.params.id]);
    res.json({ success:true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message:'DB error on reward delete' });
  }
});

router.post('/rewards/upload', verifyToken, verifyAdmin, upload.single('file'), async (req, res) => {
  try {
    const file = req.file;
    if (!file) return res.status(400).json({ message: 'file is required' });
    const ext = path.extname(file.originalname || '').toLowerCase() || '.bin';
    const filename = `${Date.now()}-${crypto.randomBytes(6).toString('hex')}${ext}`;
    const theKey = `reward/${filename}`;
    await uploadBufferToS3({ buffer: file.buffer, contentType: file.mimetype, key: theKey });
    const publicUrl = makePublicFileUrl(req, theKey, 'rewards');
    return res.json({ success: true, url: publicUrl, key: theKey });
  } catch (err) {
    console.error('POST /admin/rewards/upload error:', err);
    return res.status(500).json({ message: err?.message || 'upload failed' });
  }
});

// PUBLIC (no auth): redirect to signed S3 URL
router.get('/rewards/file', async (req, res) => {
  try {
    const key = decodeURIComponent(String(req.query.key || ''));
    if (!key.startsWith('reward/')) return res.status(400).send('invalid key');
    const signed = await getSignedGetObjectUrl(key, 60 * 60); // 1h
    return res.redirect(302, signed);
  } catch (err) {
    console.error('GET /admin/rewards/file error:', err);
    return res.status(500).send('cannot get file');
  }
});

/* ============================================================
 * BLOGS (knowledge_article) + S3 PUBLIC
 * ============================================================ */
const BLOG_TABLE = 'knowledge_article';

// List
router.get('/blogs', verifyToken, verifyAdmin, async (_req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT ka.id, ka.title, ka.content, ka.author_id,
             ka.create_at, ka.update_at, ka.cover_image_url,
             CONCAT(COALESCE(u.fname,''),' ',COALESCE(u.lname,'')) AS author_name
      FROM ${BLOG_TABLE} ka
      LEFT JOIN users u ON u.user_id = ka.author_id
      ORDER BY ka.id DESC
    `);
    res.json({ success: true, data: rows });
  } catch (err) {
    console.error('GET /admin/blogs error:', err);
    res.status(500).json({ message: 'DB error' });
  }
});

// Create (multipart)
router.post('/blogs', verifyToken, verifyAdmin, upload.single('cover'), async (req, res) => {
  try {
    let coverUrl = null;
    if (req.file) {
      const ext = path.extname(req.file.originalname || '').toLowerCase() || '.bin';
      const filename = `${Date.now()}-${crypto.randomBytes(6).toString('hex')}${ext}`;
      const key = `blog/${filename}`;
      await uploadBufferToS3({ buffer: req.file.buffer, contentType: req.file.mimetype, key });
      coverUrl = makePublicFileUrl(req, key, 'blogs');
    }
    const title = String(req.body.title || '').slice(0, 150);
    const content = String(req.body.content || '');
    const author_id = safeInt(req.body.author_id, 0);
    if (!title || !content || !author_id) {
      return res.status(400).json({ message: 'title, content, author_id are required' });
    }

    const [rs] = await db.query(
      `INSERT INTO ${BLOG_TABLE} (title, content, author_id, create_at, update_at, cover_image_url)
       VALUES (?, ?, ?, CURDATE(), CURDATE(), ?)`,
      [title, content, author_id, coverUrl]
    );
    const [rows] = await db.query(`SELECT * FROM ${BLOG_TABLE} WHERE id = ?`, [rs.insertId]);
    res.json({ success: true, data: rows[0] });
  } catch (err) {
    console.error('POST /admin/blogs error:', err);
    res.status(500).json({ message: 'Create failed' });
  }
});

// Update (multipart)
router.put('/blogs/:id', verifyToken, verifyAdmin, upload.single('cover'), async (req, res) => {
  try {
    const { id } = req.params;
    const fields = [], values = [];
    if (req.body.title !== undefined)   { fields.push('title = ?');   values.push(String(req.body.title).slice(0,150)); }
    if (req.body.content !== undefined) { fields.push('content = ?'); values.push(String(req.body.content)); }
    if (req.body.author_id !== undefined) {
      const a = safeInt(req.body.author_id, 0);
      if (!a) return res.status(400).json({ message: 'Invalid author_id' });
      fields.push('author_id = ?'); values.push(a);
    }
    if (req.file) {
      const ext = path.extname(req.file.originalname || '').toLowerCase() || '.bin';
      const filename = `${Date.now()}-${crypto.randomBytes(6).toString('hex')}${ext}`;
      const key = `blog/${filename}`;
      await uploadBufferToS3({ buffer: req.file.buffer, contentType: req.file.mimetype, key });
      fields.push('cover_image_url = ?'); values.push(makePublicFileUrl(req, key, 'blogs'));
    }
    if (!fields.length) return res.status(400).json({ message: 'No fields to update' });
    fields.push('update_at = CURDATE()');

    await db.query(`UPDATE ${BLOG_TABLE} SET ${fields.join(', ')} WHERE id = ?`, [...values, id]);
    const [rows] = await db.query(`
      SELECT ka.id, ka.title, ka.content, ka.author_id,
             ka.create_at, ka.update_at, ka.cover_image_url,
             CONCAT(COALESCE(u.fname,''),' ',COALESCE(u.lname,'')) AS author_name
      FROM ${BLOG_TABLE} ka
      LEFT JOIN users u ON u.user_id = ka.author_id
      WHERE ka.id = ?`, [id]);
    res.json({ success: true, data: rows[0] || null });
  } catch (err) {
    console.error('PUT /admin/blogs/:id error:', err);
    res.status(500).json({ message: 'Update failed' });
  }
});

// Delete
router.delete('/blogs/:id', verifyToken, verifyAdmin, async (req, res) => {
  try {
    await db.query(`DELETE FROM ${BLOG_TABLE} WHERE id = ?`, [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    console.error('DELETE /admin/blogs/:id error:', err);
    res.status(500).json({ message: 'Delete failed' });
  }
});

// Inline image upload for Quill
router.post('/blogs/upload', verifyToken, verifyAdmin, upload.single('image'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: 'image is required' });
    const ext = path.extname(req.file.originalname || '').toLowerCase() || '.bin';
    const filename = `${Date.now()}-${crypto.randomBytes(6).toString('hex')}${ext}`;
    const key = `blog/${filename}`;
    await uploadBufferToS3({ buffer: req.file.buffer, contentType: req.file.mimetype, key });
    return res.json({ success: true, url: makePublicFileUrl(req, key, 'blogs'), key });
  } catch (err) {
    console.error('POST /admin/blogs/upload error:', err);
    res.status(500).json({ message: 'Upload failed' });
  }
});

// PUBLIC (no auth): redirect to signed S3 URL for blog images
router.get('/blogs/file', async (req, res) => {
  try {
    const key = decodeURIComponent(String(req.query.key || ''));
    if (!key.startsWith('blog/')) return res.status(400).send('invalid key');
    const signed = await getSignedGetObjectUrl(key, 60 * 60);
    return res.redirect(302, signed);
  } catch (err) {
    console.error('GET /admin/blogs/file error:', err);
    res.status(500).send('cannot get file');
  }
});

module.exports = router;
