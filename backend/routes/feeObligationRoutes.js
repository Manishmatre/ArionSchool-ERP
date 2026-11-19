const express = require('express');
const router = express.Router();
const {
  getStudentObligations,
  getAllObligations,
  generateFromEnrollment,
  waiveObligation,
  reconcileStudent
} = require('../controllers/feeObligationController');
const { protect } = require('../middlewares/auth');
const authorize = require('../middlewares/roleCheck');

router.use(protect);

router.get('/', authorize('super_admin', 'franchise_admin'), getAllObligations);
router.get('/student/:studentId', authorize('super_admin', 'franchise_admin', 'student'), getStudentObligations);
router.post('/generate', authorize('super_admin', 'franchise_admin'), generateFromEnrollment);
router.put('/:id/waive', authorize('super_admin', 'franchise_admin'), waiveObligation);
router.post('/reconcile/:studentId', authorize('super_admin', 'franchise_admin'), reconcileStudent);

module.exports = router;
