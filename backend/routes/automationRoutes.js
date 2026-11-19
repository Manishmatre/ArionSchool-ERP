const express = require('express');
const router = express.Router();
const automationController = require('../controllers/automationController');
const { protect } = require('../middlewares/auth');
const roleCheck = require('../middlewares/roleCheck');

router.use(protect);

router.post(
  '/trigger-absentee',
  roleCheck(['super_admin', 'school_admin', 'franchise_admin', 'principal']),
  automationController.runAbsenteeTrigger
);

router.post(
  '/trigger-fee-reminders',
  roleCheck(['super_admin', 'school_admin', 'franchise_admin', 'principal', 'accountant']),
  automationController.runFeeReminderTrigger
);

router.post(
  '/trigger-birthdays',
  roleCheck(['super_admin', 'school_admin', 'franchise_admin', 'principal']),
  automationController.runBirthdayTrigger
);

module.exports = router;
