const express = require('express');
const router = express.Router();
const {
  getAllStaff,
  getStaff,
  createStaff,
  updateStaff,
  deleteStaff,
  updateStaffStatus,
  markAttendance,
  applyLeave,
  getStaffStats
} = require('../controllers/staffController');
const { protect } = require('../middlewares/auth');
const authorize = require('../middlewares/roleCheck');

// Protect all routes
router.use(protect);

router.get('/stats', authorize('super_admin', 'franchise_admin'), getStaffStats);

router.route('/')
  .get(authorize('super_admin', 'franchise_admin'), getAllStaff)
  .post(authorize('super_admin', 'franchise_admin'), createStaff);

router.route('/:id')
  .get(authorize('super_admin', 'franchise_admin'), getStaff)
  .put(authorize('super_admin', 'franchise_admin'), updateStaff)
  .delete(authorize('super_admin'), deleteStaff);

router.put('/:id/status', authorize('super_admin', 'franchise_admin'), updateStaffStatus);
router.post('/:id/attendance', authorize('super_admin', 'franchise_admin'), markAttendance);
router.post('/:id/leave', authorize('super_admin', 'franchise_admin'), applyLeave);

module.exports = router;
