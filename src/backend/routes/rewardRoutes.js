const express = require('express');
const { listRewards, listRedemptions } = require('../controllers/rewardController');

const router = express.Router();

router.get('/rewards', listRewards);
router.get('/rewards/redemptions/:user_id', listRedemptions);

module.exports = router;
