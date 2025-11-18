require('dotenv').config(); // โหลดตัวแปรจาก .env

const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const path = require('path');

const db = require('./config/db');
const authController = require('./controllers/authController');
const { saveWalking } = require('./controllers/saveWalkingController');
const { saveCycling } = require('./controllers/saveCyclingController');

const activityRoutes = require('./routes/activityRoutes');
const adminRoutes = require('./routes/admin');
const blogRoutes = require('./routes/blogs');
const rewardsRoutes = require('./routes/rewards'); // ถ้ามี route แยกของ reward ไว้

const app = express();

/* ---------------------- Static uploads ---------------------- */
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

/* ---------------------- Body parser ---------------------- */
app.use(bodyParser.json());

/* ---------------------- CORS control ---------------------- */
/**
 * ALLOWED_ORIGINS: คั่นด้วย comma เช่น
 * http://localhost:5173,https://your-frontend.vercel.app
 *
 * ถ้าอยากอนุญาต subdomain ของ Vercel ทั้งหมดสำหรับโปรเจกต์เดียว
 * ให้ตั้ง ALLOW_VERCEL_SUBDOMAINS=true (ค่า default=false)
 * แล้วตั้ง VERCEL_PROJECT_PREFIX=admin-dashboard-forcar
 * จะยอมรับ origin ที่เป็น https://<อะไรก็ได้>.admin-dashboard-forcar-*.vercel.app
 */
const allowedOrigins = (process.env.ALLOWED_ORIGINS || '')
  .split(',')
  .map(s => s.trim())
  .filter(Boolean);

const ALLOW_VERCEL_SUBDOMAINS = String(process.env.ALLOW_VERCEL_SUBDOMAINS || 'false').toLowerCase() === 'true';
const VERCEL_PROJECT_PREFIX = process.env.VERCEL_PROJECT_PREFIX || ''; // e.g. 'admin-dashboard-forcar'

function isLocalhost(origin) {
  return !!origin && (
    origin.startsWith('http://localhost:') ||
    origin.startsWith('http://127.0.0.1:')
  );
}

function isAllowedVercel(origin) {
  if (!ALLOW_VERCEL_SUBDOMAINS || !VERCEL_PROJECT_PREFIX) return false;
  try {
    const u = new URL(origin);
    // ตัวอย่าง host: admin-dashboard-forcar-xxxxx.vercel.app หรือ <preview>.admin-dashboard-forcar-xxxxx.vercel.app
    // เช็คว่ามีชิ้นส่วนที่ขึ้นต้นด้วย prefix
    // ใช้ includes/startsWith แบบคร่าวๆตามรูปแบบของ Vercel
    return u.hostname.includes(`${VERCEL_PROJECT_PREFIX}`) && u.hostname.endsWith('.vercel.app');
  } catch {
    return false;
  }
}

function isExplicitAllowed(origin) {
  return allowedOrigins.includes(origin);
}

function isAllowedOrigin(origin) {
  // อนุญาต request ที่ไม่มี origin (เช่น curl/health-check)
  if (!origin) return true;
  if (isExplicitAllowed(origin)) return true;
  if (isLocalhost(origin)) return true;
  if (isAllowedVercel(origin)) return true;
  return false;
}

const corsOptions = {
  origin: (origin, cb) => {
    const ok = isAllowedOrigin(origin);
    if (ok) return cb(null, true);
    console.warn('❌ Blocked CORS Origin:', origin, '| allowed:', allowedOrigins);
    return cb(new Error('Not allowed by CORS'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  maxAge: 86400, // cache preflight 24 ชม.
};

// จัดการ preflight ให้ทุกเส้นทาง
app.options('*', cors(corsOptions));
// เปิด CORS สำหรับทุก request
app.use(cors(corsOptions));

/* ---------------------- Debug log (สั้นๆ) ---------------------- */
app.use((req, res, next) => {
  console.log(`📥 ${req.method} ${req.url} from ${req.headers.origin || 'unknown origin'}`);
  next();
});

/* ---------------------- DB ping ---------------------- */
(async () => {
  try {
    await db.query('SELECT 1');
    console.log('✅ Connected to MySQL DB');
  } catch (err) {
    console.error('❌ DB connection failed:', err);
  }
})();

/* ---------------------- Health ---------------------- */
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    time: new Date().toISOString(),
    allowedOrigins,
    allowVercelWildcards: ALLOW_VERCEL_SUBDOMAINS,
    vercelPrefix: VERCEL_PROJECT_PREFIX || null,
  });
});

/* ---------------------- Auth ---------------------- */
app.post('/api/check-user', authController.login);
app.post('/api/register', authController.register);
app.post('/api/update-user', authController.updateUser);
app.post('/api/set-goal', authController.setGoal);

/* ---------------------- Activity save ---------------------- */
app.post('/api/save-walking', saveWalking);
app.post('/api/save-cycling', saveCycling);

/* ---------------------- Admin APIs ---------------------- */
app.use('/api/admin', adminRoutes);
app.use('/api/admin', blogRoutes);

// ถ้าไฟล์ routes/admin.js รวม reward แล้ว “ไม่ต้อง” mount ซ้ำ
// แต่ถ้าคุณแยก rewardsRoutes ออกมาเฉพาะ ให้คงบรรทัดนี้ไว้
app.use('/api/admin', rewardsRoutes);

/* ---------------------- Activity read APIs ---------------------- */
app.use('/api', activityRoutes);

/* ---------------------- Root ---------------------- */
app.get('/', (req, res) => {
  res.send('🌐 CarbonClean API is running successfully!');
});

/* ---------------------- Start ---------------------- */
const PORT = process.env.PORT || 3000;
const HOST = '0.0.0.0';
app.listen(PORT, HOST, () => {
  console.log(`🚀 Server running on http://${HOST}:${PORT}`);
  console.log('🔐 CORS allow list:', allowedOrigins);
  if (ALLOW_VERCEL_SUBDOMAINS) {
    console.log(`🔓 Allow Vercel subdomains for project prefix: ${VERCEL_PROJECT_PREFIX}*.vercel.app`);
  }
});
