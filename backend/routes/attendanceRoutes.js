const express = require('express');
const router = express.Router();
const {
  getAllAttendance,
  getStudentAttendance,
  getTodayAttendance,
  markAttendance,
  bulkMarkAttendance,
  updateAttendance,
  deleteAttendance,
  getAttendanceStats,
  generateAttendanceQR,
  punchQRAttendance,
  rfidPunch,
  getSchoolDailyAttendance,
  saveSchoolDailyAttendance
} = require('../controllers/attendanceController');
const { protect } = require('../middlewares/auth');
const authorize = require('../middlewares/roleCheck');

// Protect all routes
router.use(protect);

// School RFID & Daily Attendance Routes
router.post('/rfid-punch', rfidPunch);
router.get('/school-daily', authorize('super_admin', 'school_owner', 'franchise_admin', 'school_admin', 'principal', 'vice_principal', 'teacher', 'class_teacher'), getSchoolDailyAttendance);
router.post('/school-daily', authorize('super_admin', 'school_owner', 'franchise_admin', 'school_admin', 'principal', 'vice_principal', 'teacher', 'class_teacher'), saveSchoolDailyAttendance);

// QR Attendance Routes
router.get('/today', getTodayAttendance);
router.get('/qr/generate', authorize('super_admin', 'franchise_admin'), generateAttendanceQR);
router.post('/qr/punch', punchQRAttendance);

router.route('/')
  .get(authorize('super_admin', 'franchise_admin'), getAllAttendance)
  .post(authorize('super_admin', 'franchise_admin'), markAttendance);

router.post('/bulk', authorize('super_admin', 'franchise_admin'), bulkMarkAttendance);
router.get('/stats', authorize('super_admin', 'franchise_admin'), getAttendanceStats);
router.get('/student/:studentId', getStudentAttendance);

router.route('/:id')
  .put(authorize('super_admin', 'franchise_admin'), updateAttendance)
  .delete(authorize('super_admin', 'franchise_admin'), deleteAttendance);

module.exports = router;
