const express = require('express');
const router = express.Router();
const {
  submitTest,
  getMyResults,
  getTestResult,
  getAllResults,
  generateStudentReport
} = require('../controllers/testController');
const { protect, authorize } = require('../middlewares/auth');

router.use(protect);

router.post('/submit', submitTest);
router.get('/my-results', getMyResults);
router.get('/results/:id', getTestResult);
router.get('/all-results', authorize('admin'), getAllResults);
router.get('/report/:studentId', authorize('super_admin', 'franchise_admin'), generateStudentReport);

module.exports = router;
