const express = require('express');
const router = express.Router();
const { protect } = require('../middlewares/auth');
const authorize = require('../middlewares/roleCheck');
const {
  getPublicConfig,
  createOrder,
  verifyPayment,
  handleWebhook,
  getTransactions,
  getAdminConfig
} = require('../controllers/razorpayController');

// 1. Webhook endpoint (Public, signature-verified via x-razorpay-signature)
router.post('/webhook', handleWebhook);

// 2. Public config for frontend checkout SDK initialization
router.get('/config', getPublicConfig);

// 3. Protected payment workflow
router.post('/create-order', protect, createOrder);
router.post('/verify-payment', protect, verifyPayment);

// 4. Admin monitoring & transactions
router.get('/transactions', protect, authorize('super_admin', 'school_admin', 'franchise_admin', 'principal', 'accountant'), getTransactions);
router.get('/admin/config', protect, authorize('super_admin', 'school_admin'), getAdminConfig);

module.exports = router;
