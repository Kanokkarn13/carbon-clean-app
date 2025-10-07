const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const path = require('path');                // ✅ ใช้สำหรับ resolve path
const db = require('./config/db');
const authController = require('./controllers/authController');
const { saveWalking } = require('./controllers/saveWalkingController');
const { saveCycling } = require('./controllers/saveCyclingController');
const activityRoutes = require('./routes/activityRoutes');
const adminRoutes = require('./routes/admin');
const blogRoutes = require('./routes/blogs');
   

const app = express();

/* ✅ 1.2 เปิด static path สำหรับรูปอัปโหลด (เช่น cover / รูปในเนื้อหา blog)
   รูปที่อยู่ใน uploads/blogs/... จะเข้าได้จาก URL http://localhost:3000/uploads/blogs/filename.jpg
*/
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// --- Middleware ---
app.use(bodyParser.json());
app.use(cors());
app.use((req, res, next) => {
  console.log(`📥 Incoming ${req.method} request to ${req.url}`);
  next();
});

// --- ตรวจสอบการเชื่อมต่อฐานข้อมูล ---
(async () => {
  try {
    await db.query('SELECT 1');
    console.log('✅ Connected to DB');
  } catch (err) {
    console.error('❌ Failed to connect to DB:', err);
  }
})();

// --- Auth Routes ---
app.post('/api/check-user', authController.login);
app.post('/api/register', authController.register);
app.post('/api/update-user', authController.updateUser);
app.post('/api/set-goal', authController.setGoal);

// --- Save Activity ---
app.post('/api/save-walking', saveWalking);
app.post('/api/save-cycling', saveCycling);

// --- Admin Routes (รวมข้อ 1.4 ที่นี่) ---
app.use('/api/admin', adminRoutes);
app.use('/api/admin', blogRoutes); // ✅ ข้อ 1.4 mount blogRoutes

// --- Activity Routes (อ่านกิจกรรม) ---
app.use('/api', activityRoutes);

// --- Default route ---
app.get('/', (req, res) => {
  res.send('🌐 Server is up and running!');
});

// --- Start server ---
const PORT = 3000;
const HOST = '0.0.0.0';
app.listen(PORT, HOST, () => {
  console.log(`🚀 Server is running on http://${HOST}:${PORT}`);
});
