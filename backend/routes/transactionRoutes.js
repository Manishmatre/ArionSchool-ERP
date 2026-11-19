const express = require('express');
const router = express.Router();
const {
  getAllTransactions,
  getTransaction,
  getTransactionStats,
  createTransaction,
  updateTransaction,
  deleteTransaction,
  getUnifiedPaymentHistory,
  syncPaymentToTransaction,
  getExpenseCategories,
  createExpenseCategory,
  deleteExpenseCategory
} = require('../controllers/transactionController');
const { protect } = require('../middlewares/auth');
const authorize = require('../middlewares/roleCheck');

router.use(protect);

router.get('/stats', authorize('super_admin', 'franchise_admin'), getTransactionStats);
router.get('/categories', authorize('super_admin', 'franchise_admin'), getExpenseCategories);
router.post('/categories', authorize('super_admin', 'franchise_admin'), createExpenseCategory);
router.delete('/categories/:id', authorize('super_admin', 'franchise_admin'), deleteExpenseCategory);
router.get('/unified', authorize('super_admin', 'franchise_admin', 'student'), getUnifiedPaymentHistory);
router.get('/', authorize('super_admin', 'franchise_admin'), getAllTransactions);
router.post('/', authorize('super_admin', 'franchise_admin'), createTransaction);
router.post('/sync-payment/:paymentId', authorize('super_admin'), syncPaymentToTransaction);
router.get('/:id', authorize('super_admin', 'franchise_admin'), getTransaction);
router.put('/:id', authorize('super_admin', 'franchise_admin'), updateTransaction);
router.delete('/:id', authorize('super_admin', 'franchise_admin'), deleteTransaction);

module.exports = router;
