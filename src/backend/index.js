require('dotenv').config(); // ✅ โหลดตัวแปรจาก .env
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
const rewardsRoutes = require('./routes/rewards');

const app = express();

/* ✅ Static Path สำหรับไฟล์อัปโหลด (เช่น cover blog)
   ตัวอย่าง: https://backend.onrender.com/uploads/blogs/image.jpg
*/
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// ✅ Middleware
app.use(bodyParser.json());

// ✅ CORS — อ่าน allowed origins จาก env
const allowedOrigins = (process.env.ALLOWED_ORIGINS || '').split(',').map(s => s.trim()).filter(Boolean);
app.use(cors({
  origin: (origin, cb) => {
    if (!origin || allowedOrigins.length === 0 || allowedOrigins.includes(origin)) return cb(null, true);
    console.warn('❌ Blocked CORS Origin:', origin);
    return cb(new Error('Not allowed by CORS'));
  },
  credentials: true,
}));

// ✅ Debug log สั้นๆ
app.use((req, res, next) => {
  console.log(`📥 ${req.method} ${req.url} from ${req.headers.origin || 'unknown origin'}`);
  next();
});

// ✅ ทดสอบการเชื่อมต่อฐานข้อมูล
(async () => {
  try {
    await db.query('SELECT 1');
    console.log('✅ Connected to MySQL DB');
  } catch (err) {
    console.error('❌ DB connection failed:', err);
  }
})();

// ✅ Health Check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

// ✅ Auth routes
app.post('/api/check-user', authController.login);
app.post('/api/register', authController.register);
app.post('/api/update-user', authController.updateUser);
app.post('/api/set-goal', authController.setGoal);

// ✅ Save activity routes
app.post('/api/save-walking', saveWalking);
app.post('/api/save-cycling', saveCycling);

// ✅ Admin + Blog routes
app.use('/api/admin', adminRoutes);
app.use('/api/admin', blogRoutes);
app.use('/api/admin', rewardsRoutes);

// ✅ Activity routes
app.use('/api', activityRoutes);

// ✅ Default root
app.get('/', (req, res) => {
  res.send('🌐 CarbonClean API is running successfully!');
});

// ✅ Port & Host สำหรับ Render / local
const PORT = process.env.PORT || 3000;
const HOST = '0.0.0.0';

app.listen(PORT, HOST, () => {
  console.log(`🚀 Server running on http://${HOST}:${PORT}`);
});
