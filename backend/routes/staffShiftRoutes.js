const express = require('express');
const router = express.Router();
const staffShiftController = require('../controllers/staffShiftController');
const { protect } = require('../middlewares/auth');
const roleCheck = require('../middlewares/roleCheck');

router.use(protect);

router.get('/', staffShiftController.getShifts);
router.post(
  '/',
  roleCheck(['super_admin', 'school_admin', 'franchise_admin', 'principal', 'hr_manager']),
  staffShiftController.createShift
);
router.delete(
  '/:id',
  roleCheck(['super_admin', 'school_admin', 'franchise_admin', 'principal', 'hr_manager']),
  staffShiftController.deleteShift
);

router.post(
  '/punch',
  roleCheck(['super_admin', 'school_admin', 'franchise_admin', 'principal', 'hr_manager', 'teacher', 'staff']),
  staffShiftController.recordStaffPunch
);

module.exports = router;
