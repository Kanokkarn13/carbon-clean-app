// src/index.js
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');

const db = require('./config/db');
const authController = require('./controllers/authController');
const { saveWalking } = require('./controllers/saveWalkingController');
const { saveCycling } = require('./controllers/saveCyclingController');
const activityRoutes = require('./routes/activityRoutes');
const rewardRoutes = require('./routes/rewardRoutes');

// Emission (transport)
const {
  saveTransportEmission,
  listSavedActivities,
} = require('./controllers/saveEmissionController');

// Reduction (carbon offset)
const {
  saveReduction,
  listReductions,
} = require('./controllers/saveReductionController');

const app = express();

/* -------------------- Middleware -------------------- */
app.use(
  cors({
    origin: '*', // ✅ เปิดให้เรียกจาก Expo / Web ได้หมด (แก้ทีหลังตอน production)
  })
);
app.use(bodyParser.json({ limit: '1mb' }));
app.use((req, _res, next) => {
  console.log(`📥 ${req.method} ${req.url}`);
  next();
});

/* -------------------- DB Health Check -------------------- */
(async () => {
  try {
    await db.query('SELECT 1'); // simple ping
    console.log('✅ Successfully connected to the database!');
  } catch (err) {
    console.error('❌ Failed to connect to DB:', err);
  }
})();

/* -------------------- Auth Routes -------------------- */
app.post(
  '/api/check-user',
  (req, _res, next) => {
    console.log('🧾 /api/check-user body:', req.body);
    next();
  },
  authController.login
);
app.post('/api/register', authController.register);
app.post('/api/update-user', authController.updateUser);
app.post('/api/set-goal', authController.setGoal);

/* -------------------- Activity Save Routes -------------------- */
app.post('/api/save-walking', saveWalking);
app.post('/api/save-cycling', saveCycling);

/* -------------------- Emission Save/List (e_point) -------------------- */
// POST body: { user_id, activity_type, distance_km, emission_kgco2e, parameters? }
app.post('/api/emission', saveTransportEmission);
// GET saved by user id
app.get('/api/saved/:user_id', listSavedActivities);

/* -------------------- Reduction Save/List (rc_point) -------------------- */
app.post('/api/reduction', saveReduction);
app.get('/api/reduction/:user_id', listReductions);        // legacy
app.get('/api/reduction/saved/:user_id', listReductions);  // new (your app uses this)

/* -------------------- Recent Activity (walking/cycling history) -------------------- */
app.use('/api', activityRoutes);
app.use('/api', rewardRoutes);

/* -------------------- Utilities -------------------- */
app.get('/api/health', async (_req, res) => {
  try {
    const out = await db.query('SELECT NOW() AS now');
    const rows = Array.isArray(out) ? out[0] : out;
    const now =
      Array.isArray(rows) && rows.length
        ? rows[0].now || rows[0].NOW
        : null;

    res.json({ ok: true, db_time: now });
  } catch (e) {
    res.status(500).json({ ok: false, error: String(e?.message || e) });
  }
});

/* -------------------- Root & 404 -------------------- */
app.get('/', (_req, res) => res.send('🌐 Server is up and running!'));

app.use((req, res) => {
  res.status(404).json({ error: 'Not found', path: req.originalUrl });
});

/* -------------------- Start Server -------------------- */
// ✅ ✅ IMPORTANT: for Render (or any cloud hosting)
const PORT = process.env.PORT || 3000;
const HOST = '0.0.0.0'; // ✅ ต้องใช้ 0.0.0.0 เพื่อให้ Render ฟัง request ภายนอกได้

app.listen(PORT, HOST, () => {
  console.log(`🚀 Server running on http://${HOST}:${PORT}`);
});
