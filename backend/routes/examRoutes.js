const express = require('express');
const router = express.Router();
const {
  createExam,
  copyExam,
  getExams,
  getExam,
  updateExam,
  deleteExam,
  getExamsForStudent,
  getExamForStudent,
  saveExamProgress,
  submitExam,
  getExamAnalytics,
  getStudentExamResultsByCourse,
  validateGeneration,
  generateExamDraft,
  replaceQuestion
} = require('../controllers/examController');
const { protect, authorize } = require('../middlewares/auth');

router.use(protect);

// Student exam routes
router.get('/student/my-exams', authorize('student'), getExamsForStudent);
router.get('/student/:id/start', authorize('student'), getExamForStudent);
router.post('/student/:id/save-progress', authorize('student'), saveExamProgress);
router.post('/student/:id/submit', authorize('student'), submitExam);

// Smart exam generation routes (Admin & School Admin)
router.post('/validate-generation', authorize('super_admin', 'franchise_admin', 'admin'), validateGeneration);
router.post('/generate-draft', authorize('super_admin', 'franchise_admin', 'admin'), generateExamDraft);
router.post('/replace-question', authorize('super_admin', 'franchise_admin', 'admin'), replaceQuestion);

// Admin exam management routes
router.get('/student/:studentId/course/:courseId/results', authorize('super_admin', 'franchise_admin', 'admin'), getStudentExamResultsByCourse);

router
  .route('/')
  .post(authorize('super_admin', 'franchise_admin', 'admin'), createExam)
  .get(authorize('super_admin', 'franchise_admin', 'admin'), getExams);

router.route('/:id/analytics').get(authorize('super_admin', 'franchise_admin', 'admin'), getExamAnalytics);

router.post('/:id/copy', authorize('super_admin', 'franchise_admin', 'admin'), copyExam);

router
  .route('/:id')
  .get(authorize('super_admin', 'franchise_admin', 'admin'), getExam)
  .put(authorize('super_admin', 'franchise_admin', 'admin'), updateExam)
  .delete(authorize('super_admin', 'franchise_admin', 'admin'), deleteExam);

module.exports = router;
