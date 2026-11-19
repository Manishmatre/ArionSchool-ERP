const express = require('express');
const router = express.Router();
const schoolExamController = require('../controllers/schoolExamController');
const { protect } = require('../middlewares/auth');
const roleCheck = require('../middlewares/roleCheck');

router.use(protect);

// Exams CRUD
router.get('/', schoolExamController.getExams);
router.post(
  '/',
  roleCheck(['super_admin', 'school_admin', 'franchise_admin', 'principal']),
  schoolExamController.createExam
);

// Marks entry & bulk marks
router.get('/marks', schoolExamController.getMarks);
router.post(
  '/marks/bulk',
  roleCheck(['super_admin', 'school_admin', 'franchise_admin', 'principal', 'teacher', 'class_teacher']),
  schoolExamController.saveBulkMarks
);

// CCE / CBSE Report Card
router.get(
  '/report-card/:studentId/:examId',
  schoolExamController.getStudentReportCard
);

// Seating Plan
router.post(
  '/seating-plan',
  roleCheck(['super_admin', 'school_admin', 'franchise_admin', 'principal']),
  schoolExamController.generateSeatingPlan
);

module.exports = router;
