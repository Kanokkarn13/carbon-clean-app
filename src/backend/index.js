// src/index.js
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');

const db = require('./config/db');
const authController = require('./controllers/authController');
const { saveWalking } = require('./controllers/saveWalkingController');
const { saveCycling } = require('./controllers/saveCyclingController');
const activityRoutes = require('./routes/activityRoutes');

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
app.use(cors());
app.use(bodyParser.json({ limit: '1mb' }));
app.use((req, _res, next) => {
  console.log(`📥 ${req.method} ${req.url}`);
  next();
});

/* -------------------- DB Health Check -------------------- */
(async () => {
  try {
    await db.query('SELECT 1'); // simple ping
    console.log('✅ Connected to DB');
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
// POST body: { user_id, point_value, distance_km, activity_from, param_from, activity_to, param_to }
app.post('/api/reduction', saveReduction);

// ✅ Match the frontend: GET /api/reduction/:user_id
app.get('/api/reduction/:user_id', listReductions);

/* -------------------- Recent Activity (walking/cycling history) -------------------- */
app.use('/api', activityRoutes);

/* -------------------- Utilities -------------------- */
app.get('/api/health', async (_req, res) => {
  try {
    const out = await db.query('SELECT NOW() AS now');
    const rows = Array.isArray(out) ? out[0] : out;
    const now = Array.isArray(rows) && rows.length ? rows[0].now : null;
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
const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || '0.0.0.0';
app.listen(PORT, HOST, () => {
  console.log(`🚀 Server running at http://${HOST}:${PORT}`);
});
