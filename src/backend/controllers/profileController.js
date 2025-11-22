const multer = require('multer');
const path = require('path');
const db = require('../config/db');
const { uploadToS3 } = require('../config/s3');
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

      const url = await uploadToS3(req.file.buffer, key, req.file.mimetype);

      await db.query('UPDATE users SET profile_picture = ? WHERE user_id = ?', [url, user_id]);

      const [rows] = await db.query('SELECT * FROM users WHERE user_id = ? LIMIT 1', [user_id]);
      const user = shapeUser(rows[0]);

      return res.json({
        success: true,
        message: 'Profile picture updated',
        data: { url, user },
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

module.exports = {
  uploadProfilePicture,
};
