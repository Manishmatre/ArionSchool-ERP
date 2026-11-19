const express = require('express');
const router = express.Router();
const homeworkController = require('../controllers/homeworkController');
const { protect } = require('../middlewares/auth');
const roleCheck = require('../middlewares/roleCheck');

router.use(protect);

router.get('/', homeworkController.getHomework);
router.post(
  '/',
  roleCheck(['super_admin', 'school_admin', 'franchise_admin', 'principal', 'teacher', 'class_teacher']),
  homeworkController.createHomework
);
router.delete(
  '/:id',
  roleCheck(['super_admin', 'school_admin', 'franchise_admin', 'principal', 'teacher', 'class_teacher']),
  homeworkController.deleteHomework
);

router.get('/:homeworkId/submissions', homeworkController.getSubmissions);
router.post('/submit', homeworkController.submitHomework);
router.put(
  '/submissions/:id/evaluate',
  roleCheck(['super_admin', 'school_admin', 'franchise_admin', 'principal', 'teacher', 'class_teacher']),
  homeworkController.evaluateSubmission
);

module.exports = router;
