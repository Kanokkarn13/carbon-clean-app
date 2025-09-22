const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');


router.post('/check-user', authController.login);
router.post('/register', authController.register);



module.exports = router;
