const express = require('express');
const router = express.Router();
const {
  createAdmission,
  getAllAdmissions,
  getAdmission,
  updateAdmission,
  deleteAdmission,
  addNote,
  getAdmissionStats,
  convertToStudent
} = require('../controllers/admissionController');
const { protect } = require('../middlewares/auth');
const authorize = require('../middlewares/roleCheck');

// Public route - for website admission form
router.post('/', createAdmission);

// Protected route for student panel enquiries
router.post('/student-enquiry', protect, createAdmission);

// Protected routes - for admin & admission staff
router.use(protect);

const admissionStaffRoles = ['super_admin', 'school_admin', 'franchise_admin', 'principal', 'admission_officer'];

router.get('/', authorize(...admissionStaffRoles), getAllAdmissions);
router.get('/stats', authorize(...admissionStaffRoles), getAdmissionStats);

router.route('/:id')
  .get(authorize(...admissionStaffRoles), getAdmission)
  .put(authorize(...admissionStaffRoles), updateAdmission)
  .delete(authorize('super_admin', 'school_admin', 'franchise_admin', 'principal'), deleteAdmission);

router.post('/:id/notes', authorize(...admissionStaffRoles), addNote);
router.post('/:id/convert', authorize(...admissionStaffRoles), convertToStudent);

module.exports = router;
