const express = require('express');
const router = express.Router();
const {
  getFeeStructures,
  saveFeeStructure,
  getStudentFees,
  collectFee,
  getDefaulters,
  createConcession,
  getDailyCollectionReport
} = require('../controllers/schoolFeeController');
const { protect } = require('../middlewares/auth');
const authorize = require('../middlewares/roleCheck');

router.use(protect);

const adminAccountantRoles = ['super_admin', 'school_admin', 'franchise_admin', 'principal', 'accountant'];
const allStaffAndFamilyRoles = [...adminAccountantRoles, 'parent', 'student'];

// Structures
router.route('/structures')
  .get(authorize(...adminAccountantRoles), getFeeStructures)
  .post(authorize(...adminAccountantRoles), saveFeeStructure);

// Student Fees
router.get('/student/:studentId', authorize(...allStaffAndFamilyRoles), getStudentFees);

// Collect Fee Payment & Issue Receipt
router.post('/collect', authorize(...adminAccountantRoles), collectFee);

// Defaulters List
router.get('/defaulters', authorize(...adminAccountantRoles), getDefaulters);

// Concessions & Scholarships
router.post('/concessions', authorize('super_admin', 'school_admin', 'franchise_admin', 'principal'), createConcession);

// Daily Collection Report
router.get('/reports/daily-collection', authorize(...adminAccountantRoles), getDailyCollectionReport);

module.exports = router;
