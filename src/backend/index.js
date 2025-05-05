const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const db = require('./config/db');
const authController = require('./controllers/authController');
const { saveWalking } = require('./controllers/saveWalkingController');
const { saveCycling } = require('./controllers/saveCyclingController');
const activityRoutes = require('./routes/activityRoutes'); // << ensure this file exists

const app = express();

// Middleware
app.use(bodyParser.json());
app.use(cors());
app.use((req, res, next) => {
  console.log(`📥 Incoming ${req.method} request to ${req.url}`);
  next();
});

// ตรวจสอบการเชื่อมต่อฐานข้อมูล
(async () => {
  try {
    await db.query('SELECT 1');
    console.log('✅ Connected to DB');
  } catch (err) {
    console.error('❌ Failed to connect to DB:', err);
  }
})();

// ✅ Auth routes
app.post('/api/check-user', (req, res, next) => {
  console.log('📥 Incoming /api/check-user');
  console.log('🧾 Request body:', req.body);
  next();
}, authController.login);

app.post('/api/register', authController.register);
app.post('/api/update-user', authController.updateUser);
app.post('/api/set-goal', authController.setGoal);

// ✅ Save activity routes
app.post('/api/save-walking', saveWalking);
app.post('/api/save-cycling', saveCycling);

// ✅ Read activity routes (recent activity)
app.use('/api', activityRoutes);

// Default route
app.get('/', (req, res) => {
  res.send('🌐 Server is up and running!');
});

// Start server
const PORT = 3000;
const HOST = '0.0.0.0';

app.listen(PORT, HOST, () => {
  console.log(`🚀 Server is running on http://${HOST}:${PORT}`);
});
