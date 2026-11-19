const express = require('express');
const router = express.Router();
const {
  getAllFees,
  getFee,
  getFeeForCourseAndFranchise,
  createFee,
  updateFee,
  deleteFee,
  toggleFeeStatus,
  addDiscount,
  addInstallment,
  calculateFee,
  getFeeStats
} = require('../controllers/feeController');
const { protect } = require('../middlewares/auth');
const authorize = require('../middlewares/roleCheck');

// Protect all routes
router.use(protect);

router.route('/')
  .get(getAllFees)
  .post(authorize('super_admin'), createFee);

router.get('/stats', authorize('super_admin'), getFeeStats);
router.get('/course/:courseId/franchise/:franchiseId', getFeeForCourseAndFranchise);

router.route('/:id')
  .get(getFee)
  .put(authorize('super_admin'), updateFee)
  .delete(authorize('super_admin'), deleteFee);

router.put('/:id/toggle', authorize('super_admin'), toggleFeeStatus);
router.post('/:id/discount', authorize('super_admin'), addDiscount);
router.post('/:id/installment', authorize('super_admin'), addInstallment);
router.post('/:id/calculate', calculateFee);

module.exports = router;
