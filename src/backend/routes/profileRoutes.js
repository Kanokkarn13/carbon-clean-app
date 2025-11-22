const express = require('express');
const { uploadProfilePicture } = require('../controllers/profileController');

const router = express.Router();

router.post('/users/:user_id/profile-picture', uploadProfilePicture);

module.exports = router;
