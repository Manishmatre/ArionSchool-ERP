const express = require('express');
const router = express.Router();
const {
  getAllPayments,
  getPayment,
  createPayment,
  createOfflinePayment,
  createPaymentOrder,
  verifyPayment,
  getStudentPayments,
  downloadReceipt,
  getPaymentStats,
  updatePayment,
  deletePayment,
  recordPartialPayment
} = require('../controllers/paymentController');
const { protect } = require('../middlewares/auth');
const authorize = require('../middlewares/roleCheck');

// Protect all routes
router.use(protect);

router.get('/', authorize('super_admin', 'franchise_admin'), getAllPayments);
router.get('/stats', authorize('super_admin', 'franchise_admin'), getPaymentStats);
router.post('/', authorize('super_admin', 'franchise_admin'), createPayment);
router.post('/offline', authorize('super_admin', 'franchise_admin'), createOfflinePayment);
router.post('/create-order', createPaymentOrder);
router.post('/verify', verifyPayment);

router.get('/student/:studentId', getStudentPayments);
router.get('/:id', getPayment);
router.get('/:id/receipt', downloadReceipt);
router.put('/:id', authorize('super_admin', 'franchise_admin'), updatePayment);
router.put('/:id/partial-payment', authorize('super_admin', 'franchise_admin'), recordPartialPayment);
router.delete('/:id', authorize('super_admin', 'franchise_admin'), deletePayment);

module.exports = router;
