const express = require('express');
const router = express.Router();
const {
  getAllStudents,
  getStudent,
  createStudent,
  updateStudent,
  deleteStudent,
  getStudentDashboard,
  getStudentProgress,
  enrollStudentInCourse,
  uploadProfilePicture,
  deleteProfilePicture,
  uploadStudentDocument,
  getStudentResults,
  getStudentEnrolledCourses,
  getStudentExamAccess,
  updateStudentExamAccess
} = require('../controllers/studentController');
const { protect } = require('../middlewares/auth');
const authorize = require('../middlewares/roleCheck');
const upload = require('../middlewares/upload');
const { setStudentName } = require('../middlewares/upload');

// Protect all routes
router.use(protect);

// School roles configuration
const studentViewRoles = [
  'super_admin',
  'school_admin',
  'franchise_admin',
  'principal',
  'vice_principal',
  'teacher',
  'class_teacher',
  'accountant',
  'admission_officer',
  'parent'
];

const studentManageRoles = [
  'super_admin',
  'school_admin',
  'franchise_admin',
  'principal',
  'admission_officer'
];

router.route('/')
  .get(authorize(...studentViewRoles), getAllStudents)
  .post(authorize(...studentManageRoles), createStudent);

router.route('/:id')
  .get(getStudent)
  .put(authorize(...studentManageRoles), updateStudent)
  .delete(authorize('super_admin', 'school_admin', 'franchise_admin', 'principal'), deleteStudent);

router.get('/:id/dashboard', getStudentDashboard);
router.get('/:id/progress', getStudentProgress);
router.post('/:id/enroll', authorize(...studentManageRoles), enrollStudentInCourse);

// Profile picture routes
router.post('/:id/photo', setStudentName, upload.single('photo'), uploadProfilePicture);
router.delete('/:id/photo', deleteProfilePicture);

// Document upload route
router.post('/:id/documents', setStudentName, upload.single('document'), uploadStudentDocument);

// Get student test results for certificate generation
router.get('/:id/results', authorize('super_admin', 'franchise_admin'), getStudentResults);

// Get enrolled courses for a student
router.get('/:id/enrolled-courses', authorize('super_admin', 'franchise_admin'), getStudentEnrolledCourses);

// Exam access permissions (allow exam despite pending fees)
router.get('/:id/exam-access', authorize('super_admin', 'franchise_admin'), getStudentExamAccess);
router.patch('/:id/exam-access', authorize('super_admin', 'franchise_admin'), updateStudentExamAccess);

module.exports = router;
