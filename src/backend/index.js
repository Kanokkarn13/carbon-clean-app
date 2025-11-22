// src/backend/index.js
require('dotenv').config();

const express = require('express');
const bodyParser = require('body-parser');
const path = require('path');

// ✅ modules
const db = require('./config/db');
const authController = require('./controllers/authController');
const { saveWalking } = require('./controllers/saveWalkingController');
const { saveCycling } = require('./controllers/saveCyclingController');

const activityRoutes = require('./routes/activityRoutes');
const adminRoutes = require('./routes/admin');
const blogRoutes = require('./routes/blogs');        // ถ้ามีของเดิม
const blogAdminRoutes = require('./routes/blogAdmin'); // ✅ ใหม่ (S3 โฟลเดอร์ blog)

let rewardsRoutes = null;
try {
  rewardsRoutes = require('./routes/rewards');
  console.log('[info] rewardsRoutes loaded');
} catch {
  console.log('[info] rewardsRoutes not found (skip)');
}

// ---------- สร้าง app ก่อนใช้ app.use ทุกจุด ----------
const app = express();

/* ---------- Static uploads ---------- */
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

/* ---------- Body parser ---------- */
app.use(bodyParser.json());

/* ---------- CORS Gate ---------- */
const allowedOrigins = (process.env.ALLOWED_ORIGINS || '')
  .split(',')
  .map(s => s.trim())
  .filter(Boolean);

const ALLOW_VERCEL_SUBDOMAINS =
  String(process.env.ALLOW_VERCEL_SUBDOMAINS || 'false').toLowerCase() === 'true';
const VERCEL_PROJECT_PREFIX = process.env.VERCEL_PROJECT_PREFIX || '';

function isLocal(origin) {
  return !!origin && (origin.startsWith('http://localhost:') || origin.startsWith('http://127.0.0.1:'));
}
function isExplicit(origin) {
  return allowedOrigins.includes(origin);
}
function isVercel(origin) {
  if (!ALLOW_VERCEL_SUBDOMAINS || !VERCEL_PROJECT_PREFIX || !origin) return false;
  try {
    const h = new URL(origin).hostname;
    return h.includes(VERCEL_PROJECT_PREFIX) && h.endsWith('.vercel.app');
  } catch { return false; }
}
function isAllowed(origin) {
  if (!origin) return true; // health-check/curl
  return isExplicit(origin) || isLocal(origin) || isVercel(origin);
}

app.use((req, res, next) => {
  const origin = req.headers.origin;

  if (!isAllowed(origin)) {
    console.warn('❌ Blocked CORS Origin:', origin, '| allowed:', allowedOrigins);
    return res.status(403).send('Not allowed by CORS');
  }

  if (origin) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Vary', 'Origin');
  } else {
    res.setHeader('Access-Control-Allow-Origin', '*');
  }
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Max-Age', '86400');

  if (req.method === 'OPTIONS') return res.sendStatus(204);
  next();
});

/* ---------- Debug log ---------- */
app.use((req, res, next) => {
  console.log(`📥 ${req.method} ${req.url} from ${req.headers.origin || 'no-origin'}`);
  next();
});

/* ---------- DB ping ---------- */
(async () => {
  try {
    await db.query('SELECT 1');
    console.log('✅ Connected to MySQL DB');
  } catch (err) {
    console.error('❌ DB connection failed:', err);
  }
})();

/* ---------- Health ---------- */
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    time: new Date().toISOString(),
    allowedOrigins,
    allowVercelWildcards: ALLOW_VERCEL_SUBDOMAINS,
    vercelPrefix: VERCEL_PROJECT_PREFIX || null,
  });
});

/* ---------- Auth ---------- */
app.post('/api/check-user', authController.login);
app.post('/api/register', authController.register);
app.post('/api/update-user', authController.updateUser);
app.post('/api/set-goal', authController.setGoal);

/* ---------- Save activities ---------- */
app.post('/api/save-walking', saveWalking);
app.post('/api/save-cycling', saveCycling);

/* ---------- Admin APIs ---------- */
// ของเดิม
app.use('/api/admin', adminRoutes);
app.use('/api/admin', blogRoutes);     // ถ้ามี route เก่าอยู่

// ✅ อันใหม่ที่เพิ่งเพิ่ม (S3 folder blog + signed URL via /admin/blogs/file)
app.use('/api/admin', blogAdminRoutes);

if (rewardsRoutes) app.use('/api/admin', rewardsRoutes);

/* ---------- Activity read APIs ---------- */
app.use('/api', activityRoutes);

/* ---------- Root ---------- */
app.get('/', (req, res) => {
  res.send('🌐 CarbonClean API is running successfully!');
});

/* ---------- Start ---------- */
const PORT = process.env.PORT || 3000;
const HOST = '0.0.0.0';
app.listen(PORT, HOST, () => {
  console.log(`🚀 Server running on http://${HOST}:${PORT}`);
  console.log('🔐 CORS allow list:', allowedOrigins);
  if (ALLOW_VERCEL_SUBDOMAINS) {
    console.log(`🔓 Allow Vercel subdomains for prefix: ${VERCEL_PROJECT_PREFIX}*.vercel.app`);
  }
});
