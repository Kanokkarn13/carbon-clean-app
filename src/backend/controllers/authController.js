const db = require('../config/db'); // ✅ ตรวจสอบว่า path ตรงกับที่อยู่จริง
const bcrypt = require('bcrypt');

// 🔐 Login Controller
exports.login = async (req, res) => {
  console.log('💡 [Login] authController.login was called');

  const { email, password } = req.body;

  const query = 'SELECT * FROM users WHERE email = ?';
  console.log('🔍 SQL Query:', query);

  try {
    const [results] = await db.query(query, [email]);
    console.log('✅ Query Result:', results);

    if (results.length === 0) {
      console.warn('❌ No user found');
      return res.status(404).json({ success: false, message: 'Invalid email or password' });
    }

    const user = results[0];
    const isMatch = await bcrypt.compare(password, user.password);
    console.log('🔑 Password Match:', isMatch);

    if (!isMatch) {
      console.warn('❌ Password does not match');
      return res.status(401).json({ success: false, message: 'Invalid email or password' });
    }

    console.log('✅ Login successful for:', user.email);
    return res.json({ success: true, message: 'Login successful', data: user });
  } catch (err) {
    console.error('❌ Error during login:', err.message);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

// 📌 REGISTER (แก้ name → fname)
exports.register = async (req, res) => {
  const { fname, lname, email, password, phone } = req.body;

  if (!fname || !lname || !email || !password || !phone) {
    return res.status(400).json({ message: 'All fields are required' });
  }

  try {
    const [existingUser] = await db.query('SELECT * FROM users WHERE email = ?', [email]);
    if (existingUser.length > 0) {
      return res.status(400).json({ message: 'Email already exists' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = { fname, lname, email, password: hashedPassword, phone }; // ✅ ใช้ fname
    await db.query('INSERT INTO users SET ?', newUser);

    res.status(201).json({ success: true, message: 'User registered successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};


// 📌 UPDATE
exports.updateUser = async (req, res) => {
  const { user_id, fname, lname, email, phone } = req.body;
  console.log('📥 Received body:', req.body);

  if (!user_id || !fname || !lname || !email || !phone) {
    return res.status(400).json({ message: 'Missing required fields' });
  }

  try {
    const query = 'UPDATE users SET fname = ?, lname = ?, email = ?, phone = ? WHERE user_id = ?';
    await db.query(query, [fname, lname, email, phone, user_id]);

    return res.json({ success: true, message: 'User updated successfully' });
  } catch (err) {
    console.error('❌ Error updating user:', err.message);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

exports.setGoal = async (req, res) => {
  const { user_id, goalType, value } = req.body;
  console.log('📥 Received body:', req.body);

  if (!user_id || !goalType || value === undefined) {
    return res.status(400).json({ message: 'Missing required fields' });
  }

  const column = goalType === 'walking' ? 'walk_goal' : 'bic_goal';
  try {
    await db.query(`UPDATE users SET ${column} = ? WHERE user_id = ?`, [value, user_id]);
    return res.json({ success: true, message: 'Goal updated' });
  } catch (err) {
    console.error('❌ DB Error:', err.message);
    return res.status(500).json({ message: 'Server error' });
  }
};







  
  
  