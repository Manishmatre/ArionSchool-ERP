const express = require('express');
const router = express.Router();
const {
  getCashbook,
  getBankbook,
  getTrialBalance,
  getIncomeExpenditure,
  getVendors,
  createVendor,
  getVouchers,
  createVoucher
} = require('../controllers/accountingController');
const { protect } = require('../middlewares/auth');
const authorize = require('../middlewares/roleCheck');

router.use(protect);

const accountingRoles = ['super_admin', 'school_admin', 'franchise_admin', 'principal', 'accountant'];

// Books & Ledger
router.get('/cashbook', authorize(...accountingRoles), getCashbook);
router.get('/bankbook', authorize(...accountingRoles), getBankbook);
router.get('/trial-balance', authorize(...accountingRoles), getTrialBalance);
router.get('/income-expenditure', authorize(...accountingRoles), getIncomeExpenditure);

// Vendors
router.route('/vendors')
  .get(authorize(...accountingRoles), getVendors)
  .post(authorize(...accountingRoles), createVendor);

// Vouchers
router.route('/vouchers')
  .get(authorize(...accountingRoles), getVouchers)
  .post(authorize(...accountingRoles), createVoucher);

module.exports = router;
