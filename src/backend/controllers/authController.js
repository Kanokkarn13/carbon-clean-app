const db = require('../config/db');
const bcrypt = require('bcrypt');

// Helpers
const toIntOrNull = (v) => {
  const n = Number(v);
  return Number.isFinite(n) ? Math.floor(n) : null;
};

const shapeUser = (row) => {
  if (!row) return null;
  return {
    user_id: row.user_id,
    fname: row.fname,
    lname: row.lname,
    email: row.email,
    phone: row.phone,
    vehicle: row.vehicle ?? null,
    // 👇 ensure number (or null) and consistent snake_case key
    house_member: toIntOrNull(row.house_member),
    walk_goal: toIntOrNull(row.walk_goal),
    bic_goal: toIntOrNull(row.bic_goal),
    // never send password hash to the client
  };
};

// 🔐 Login
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

    const safeUser = shapeUser(user);
    console.log('✅ Login successful for:', safeUser.email, 'house_member=', safeUser.house_member);

    // ✅ return normalized user so the app reads user.house_member as a number
    return res.json({ success: true, message: 'Login successful', data: safeUser });
  } catch (err) {
    console.error('❌ Error during login:', err.message);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

// 📌 REGISTER 
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

    const newUser = { fname, lname, email, password: hashedPassword, phone };
    await db.query('INSERT INTO users SET ?', newUser);

    res.status(201).json({ success: true, message: 'User registered successfully' });
  } catch (error) {
    console.error('❌ Register error:', error.message);
    res.status(500).json({ message: 'Server error' });
  }
};

// 📌 UPDATE (parse house_member to int)
exports.updateUser = async (req, res) => {
  const { user_id, fname, lname, email, phone, vehicle, house_member } = req.body;
  console.log('📥 Received body:', req.body);

  if (!user_id || !fname || !lname || !email || !phone) {
    return res.status(400).json({ message: 'Missing required fields' });
  }

  try {
    const hm = toIntOrNull(house_member); // 👈 parse once here
    const query = `
      UPDATE users 
      SET fname = ?, lname = ?, email = ?, phone = ?, vehicle = ?, house_member = ?
      WHERE user_id = ?
    `;
    await db.query(query, [fname, lname, email, phone, vehicle ?? null, hm, user_id]);

    // optionally return the updated user
    const [rows] = await db.query('SELECT * FROM users WHERE user_id = ?', [user_id]);
    const safeUser = shapeUser(rows[0]);

    return res.json({ success: true, message: 'User updated successfully', data: safeUser });
  } catch (err) {
    console.error('❌ Error updating user:', err.message);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

// 🎯 Goals
exports.setGoal = async (req, res) => {
  const { user_id, goalType, value } = req.body;
  console.log('📥 Received body:', req.body);

  if (!user_id || !goalType || value === undefined) {
    return res.status(400).json({ message: 'Missing required fields' });
  }

  const column = goalType === 'walking' ? 'walk_goal' : 'bic_goal';
  try {
    await db.query(`UPDATE users SET ${column} = ? WHERE user_id = ?`, [toIntOrNull(value), user_id]);

    // return shaped user (optional)
    const [rows] = await db.query('SELECT * FROM users WHERE user_id = ?', [user_id]);
    return res.json({ success: true, message: 'Goal updated', data: shapeUser(rows[0]) });
  } catch (err) {
    console.error('❌ DB Error:', err.message);
    return res.status(500).json({ message: 'Server error' });
  }
};
