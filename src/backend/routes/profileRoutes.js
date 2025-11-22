const express = require('express');
const { uploadProfilePicture, getUserById } = require('../controllers/profileController');

const router = express.Router();

router.post('/users/:user_id/profile-picture', uploadProfilePicture);
router.get('/users/:user_id', getUserById);

module.exports = router;
