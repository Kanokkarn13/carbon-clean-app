const express = require('express');
const {
  listRewards,
  listRedemptions,
  redeemReward,
  validateVoucher,
  getPointsBalance,
} = require('../controllers/rewardController');

const router = express.Router();

router.get('/rewards', listRewards);
router.get('/rewards/redemptions/:user_id', listRedemptions);
router.get('/rewards/points/:user_id', getPointsBalance);
router.post('/rewards/redeem', redeemReward);
router.post('/rewards/validate-voucher', validateVoucher);

module.exports = router;
