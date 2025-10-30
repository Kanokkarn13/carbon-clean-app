const jwt = require('jsonwebtoken');

const verifyToken = (req, res, next) => {
  const token = req.headers['authorization']?.split(' ')[1];
  if (!token) return res.status(401).json({ message: 'No token provided' });

  // ✅ เพิ่มตรงนี้เพื่อเก็บ SECRET จริงจาก .env
  const SECRET = process.env.JWT_SECRET || 'mysecretkey';

  try {
    const decoded = jwt.verify(token, SECRET);
    req.user = decoded; // { user_id, role }

    // ✅ log ค่า SECRET ที่ใช้ตอน verify
    console.log('✅ JWT SECRET used in verify:', SECRET);

    next();
  } catch (err) {
    console.error('❌ JWT verify error:', err.message);
    return res.status(403).json({ message: 'Invalid token' });
  }
};

const verifyAdmin = (req, res, next) => {
  if (req.user?.role !== 'admin') {
    return res.status(403).json({ message: 'Admins only' });
  }
  next();
};

module.exports = { verifyToken, verifyAdmin };
