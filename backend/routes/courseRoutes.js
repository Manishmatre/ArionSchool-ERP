const express = require('express');
const router = express.Router();
const {
  getCoursesForFranchise,
  getCoursesForSpecificFranchise,
  getAllCourses,
  getCourse,
  createCourse,
  updateCourse,
  deleteCourse,
  checkCourseDependencies,
  enrollCourse,
  getMyCourses,
  getCourseStats,
  getEnrolledStudents,
  getFranchiseEnrolledStudents,
  markTopicAsComplete,
  getFranchiseCourseSeatInfo,
  allocateFranchiseSeats
} = require('../controllers/courseController');
const { protect, authorize } = require('../middlewares/auth');
const upload = require('../middlewares/upload');
const {
  getCourseCategories,
  createCourseCategory,
  updateCourseCategory,
  deleteCourseCategory
} = require('../controllers/courseCategoryController');

// Public routes
router.get('/', getAllCourses);
router.get('/franchise', protect, authorize('franchise_admin'), getCoursesForFranchise);
router.get('/franchise/:franchiseId', protect, authorize('super_admin'), getCoursesForSpecificFranchise);

// Student routes - specific routes before parameterized routes
router.route('/categories')
  .get(protect, authorize('super_admin'), getCourseCategories)
  .post(protect, authorize('super_admin'), createCourseCategory);
router.route('/categories/:id')
  .put(protect, authorize('super_admin'), updateCourseCategory)
  .delete(protect, authorize('super_admin'), deleteCourseCategory);

router.get('/my/enrolled', protect, authorize('student'), getMyCourses);
// Enrollment can only be performed by central staff (super_admin, admin)
router.post('/:id/enroll', protect, authorize('super_admin', 'admin'), enrollCourse);
router.post('/:courseId/topics/:topicId/complete', protect, authorize('student'), markTopicAsComplete);

// Admin routes - specific routes before parameterized routes
router.get('/:id/franchise-seats', protect, authorize('franchise_admin'), getFranchiseCourseSeatInfo);
router.get('/:id/stats', protect, authorize('admin', 'super_admin', 'franchise_admin'), getCourseStats);
router.get('/:id/students', protect, authorize('super_admin'), getEnrolledStudents);
router.get('/:id/franchise-students', protect, authorize('franchise_admin'), getFranchiseEnrolledStudents);
router.get('/:id/check-dependencies', protect, authorize('admin', 'super_admin'), checkCourseDependencies);
router.post('/', protect, authorize('admin', 'super_admin'), upload.any(), createCourse);
router.put('/:id', protect, authorize('admin', 'super_admin'), upload.any(), updateCourse);
router.delete('/:id', protect, authorize('admin', 'super_admin'), deleteCourse);
router.post('/:id/allocate-seats', protect, authorize('super_admin'), allocateFranchiseSeats);

// Parameterized routes last
router.get('/:id', getCourse);

module.exports = router;
