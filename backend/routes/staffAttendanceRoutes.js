const express = require('express');
const router = express.Router();
const {
  markAttendance,
  getAttendance,
  updateAttendance,
  getAttendanceSummary
} = require('../controllers/staffAttendanceController');
const { protect } = require('../middlewares/auth');
const authorize = require('../middlewares/roleCheck');

router.use(protect);

router.get('/summary', authorize('super_admin', 'franchise_admin'), getAttendanceSummary);

router.route('/')
  .get(authorize('super_admin', 'franchise_admin'), getAttendance)
  .post(authorize('super_admin', 'franchise_admin'), markAttendance);

router.route('/:id')
  .put(authorize('super_admin', 'franchise_admin'), updateAttendance);

module.exports = router;
