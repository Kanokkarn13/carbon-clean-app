const multer = require('multer');
const path = require('path');
const db = require('../config/db');
const { uploadToS3, getSignedUrlForKey } = require('../config/s3');
const { shapeUser } = require('./authController');

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: { fileSize: MAX_FILE_SIZE },
});

/**
 * POST /api/users/:user_id/profile-picture
 * Body: multipart/form-data { file }
 */
const uploadProfilePicture = [
  upload.single('file'),
  async (req, res) => {
    const { user_id } = req.params;

    if (!user_id) {
      return res.status(400).json({ success: false, message: 'user_id is required' });
    }

    if (!req.file) {
      return res.status(400).json({ success: false, message: 'file is required' });
    }

    try {
      const parsed = path.parse(req.file.originalname || 'photo.jpg');
      const safeName = (parsed.name || 'photo').replace(/[^a-zA-Z0-9._-]/g, '') || 'photo';
      const safeExt = parsed.ext || '.jpg';
      const key = `profilepicture/user-${user_id}-${Date.now()}-${safeName}${safeExt}`;

      const { key: uploadedKey } = await uploadToS3(req.file.buffer, key, req.file.mimetype);
      const signedUrl = await getSignedUrlForKey(uploadedKey);

      await db.query('UPDATE users SET profile_picture = ? WHERE user_id = ?', [uploadedKey, user_id]);

      const [rows] = await db.query('SELECT * FROM users WHERE user_id = ? LIMIT 1', [user_id]);
      const user = await shapeUser(rows[0]);

      return res.json({
        success: true,
        message: 'Profile picture updated',
        data: { url: signedUrl, user },
      });
    } catch (err) {
      console.error('❌ Upload profile picture error:', err);
      const message =
        err?.message === 'S3 bucket is not configured (missing S3_BUCKET)'
          ? 'Server is missing S3 bucket config. Please set S3_BUCKET and restart.'
          : err?.message || 'Failed to upload profile picture';
      return res.status(500).json({
        success: false,
        message,
      });
    }
  },
];

/**
 * GET /api/users/:user_id
 * Returns shaped user with signed profile picture URL (if present).
 */
const getUserById = async (req, res) => {
  const { user_id } = req.params;
  if (!user_id) {
    return res.status(400).json({ success: false, message: 'user_id is required' });
  }

  try {
    const [rows] = await db.query('SELECT * FROM users WHERE user_id = ? LIMIT 1', [user_id]);
    if (!rows || !rows.length) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    const user = await shapeUser(rows[0]);
    return res.json({ success: true, data: user });
  } catch (err) {
    console.error('❌ Error fetching user:', err);
    return res
      .status(500)
      .json({ success: false, message: err?.message || 'Failed to fetch user' });
  }
};

module.exports = {
  uploadProfilePicture,
  getUserById,
};
