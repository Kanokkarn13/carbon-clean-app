const express = require('express');
const { listRewards } = require('../controllers/rewardController');

const router = express.Router();

router.get('/rewards', listRewards);

module.exports = router;

