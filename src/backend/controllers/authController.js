// controllers/authController.js
const db = require('../config/db');
const bcrypt = require('bcrypt');

/* ------------------------------- Helpers ------------------------------- */
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
    house_member: toIntOrNull(row.house_member),
    walk_goal: toIntOrNull(row.walk_goal),
    bic_goal: toIntOrNull(row.bic_goal),
    role: row.role ?? 'user',
    // never include row.password
  };
};

/* -------------------------------- Login -------------------------------- */
exports.login = async (req, res) => {
  console.log('💡 [Login] authController.login called');
  const { email, password } = req.body;

  if (!email || !password) {
    return res
      .status(400)
      .json({ success: false, message: 'Email and password are required' });
  }

  try {
    const [rows] = await db.query('SELECT * FROM users WHERE email = ? LIMIT 1', [email]);
    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Invalid email or password' });
    }

    const user = rows[0];

    // ✅ compare plain vs stored bcrypt hash
    const ok = await bcrypt.compare(password, user.password);
    if (!ok) {
      return res.status(401).json({ success: false, message: 'Invalid email or password' });
    }

    const safeUser = shapeUser(user);
    return res.json({ success: true, message: 'Login successful', data: safeUser });
  } catch (err) {
    console.error('❌ Error during login:', err.message);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

/* ------------------------------- Register ------------------------------ */
exports.register = async (req, res) => {
  const { fname, lname, email, password, phone } = req.body;

  if (!fname || !lname || !email || !password || !phone) {
    return res.status(400).json({ success: false, message: 'All fields are required' });
  }

  try {
    // duplicate email
    const [dups] = await db.query('SELECT 1 FROM users WHERE email = ? LIMIT 1', [email]);
    if (dups.length > 0) {
      return res.status(400).json({ success: false, message: 'Email already exists' });
    }

    // ✅ bcrypt hash
    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = {
      fname,
      lname,
      email,
      password: hashedPassword,
      phone,
      role: 'user',
    };

    const [result] = await db.query('INSERT INTO users SET ?', newUser);

    // fetch & shape created user
    const insertedId = result.insertId;
    const [rows] = await db.query('SELECT * FROM users WHERE user_id = ? LIMIT 1', [insertedId]);
    const safeUser = shapeUser(rows[0]);

    return res.status(201).json({
      success: true,
      message: 'User registered successfully',
      data: safeUser,
    });
  } catch (error) {
    console.error('❌ Register error:', error.message);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

/* ------------------------------- Update User --------------------------- */
exports.updateUser = async (req, res) => {
  const { user_id, fname, lname, email, phone, vehicle, house_member } = req.body;
  console.log('📥 [UpdateUser] Body:', req.body);

  if (!user_id || !fname || !lname || !email || !phone) {
    return res.status(400).json({ success: false, message: 'Missing required fields' });
  }

  try {
    const hm = toIntOrNull(house_member);

    const query = `
      UPDATE users 
      SET fname = ?, lname = ?, email = ?, phone = ?, vehicle = ?, house_member = ?
      WHERE user_id = ?
    `;
    await db.query(query, [fname, lname, email, phone, vehicle ?? null, hm, user_id]);

    const [rows] = await db.query('SELECT * FROM users WHERE user_id = ? LIMIT 1', [user_id]);
    const safeUser = shapeUser(rows[0]);

    return res.json({ success: true, message: 'User updated successfully', data: safeUser });
  } catch (err) {
    console.error('❌ Error updating user:', err.message);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

/* --------------------------------- Goals -------------------------------- */
exports.setGoal = async (req, res) => {
  const { user_id, goalType, value } = req.body;
  console.log('📥 [SetGoal] Body:', req.body);

  if (!user_id || !goalType || value === undefined) {
    return res.status(400).json({ success: false, message: 'Missing required fields' });
  }

  const column = goalType === 'walking' ? 'walk_goal' : 'bic_goal';

  try {
    await db.query(`UPDATE users SET ${column} = ? WHERE user_id = ?`, [
      toIntOrNull(value),
      user_id,
    ]);

    const [rows] = await db.query('SELECT * FROM users WHERE user_id = ? LIMIT 1', [user_id]);
    const safeUser = shapeUser(rows[0]);

    return res.json({ success: true, message: 'Goal updated', data: safeUser });
  } catch (err) {
    console.error('❌ DB Error (setGoal):', err.message);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};
