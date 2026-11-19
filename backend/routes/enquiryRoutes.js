const express = require('express');
const router = express.Router();
const {
  getAllEnquiries,
  getEnquiry,
  createEnquiry,
  createStudentCourseRequest,
  getMyEnquiries,
  updateEnquiry,
  deleteEnquiry,
  updateEnquiryStatus,
  assignEnquiry,
  addFollowUp,
  convertToStudent,
  enrollStudentFromEnquiry,
  getEnquiryStats
} = require('../controllers/enquiryController');
const { protect } = require('../middlewares/auth');
const authorize = require('../middlewares/roleCheck');

// Public route
router.post('/', createEnquiry);

// Protected routes
router.use(protect);

router.post('/student/course-request', authorize('student'), createStudentCourseRequest);
router.get('/my', authorize('student'), getMyEnquiries);
router.get('/', authorize('super_admin', 'franchise_admin'), getAllEnquiries);
router.get('/stats', authorize('super_admin', 'franchise_admin'), getEnquiryStats);

router.route('/:id')
  .get(authorize('super_admin', 'franchise_admin'), getEnquiry)
  .put(authorize('super_admin', 'franchise_admin'), updateEnquiry)
  .delete(authorize('super_admin'), deleteEnquiry);

router.put('/:id/status', authorize('super_admin', 'franchise_admin'), updateEnquiryStatus);
router.put('/:id/assign', authorize('super_admin', 'franchise_admin'), assignEnquiry);
router.post('/:id/followup', authorize('super_admin', 'franchise_admin'), addFollowUp);
router.post('/:id/enroll-student', authorize('super_admin', 'franchise_admin'), enrollStudentFromEnquiry);
router.post('/:id/convert', authorize('super_admin', 'franchise_admin'), convertToStudent);

module.exports = router;
