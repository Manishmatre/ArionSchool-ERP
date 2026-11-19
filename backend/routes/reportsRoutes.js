const express = require('express');
const router = express.Router();
const {
  getDashboardStats,
  getStudentPerformanceReport,
  getStudentAttendanceReport,
  getStudentEnrollmentReport,
  getStudentCertificateReport,
  getCourseCompletionReport,
  getCourseRevenueReport,
  getCoursePopularityReport,
  getRevenueReport,
  getPaymentReport,
  getOutstandingPaymentsReport,
  getFranchisePerformanceReport,
  getFranchiseComplianceReport,
  getStaffPerformanceReport,
  getStaffAttendanceReport,
  getPayrollReport
} = require('../controllers/reportsController');

const { protect } = require('../middlewares/auth');

// Dashboard stats
router.get('/dashboard-stats', protect, getDashboardStats);


// Student Reports
router.get('/student-performance/:studentId?', protect, getStudentPerformanceReport);
router.get('/student-attendance', protect, getStudentAttendanceReport);
router.get('/student-enrollment', protect, getStudentEnrollmentReport);
router.get('/student-certificates', protect, getStudentCertificateReport);

// Course Reports
router.get('/course-completion', protect, getCourseCompletionReport);
router.get('/course-revenue', protect, getCourseRevenueReport);
router.get('/course-popularity', protect, getCoursePopularityReport);

// Financial Reports
router.get('/revenue', protect, getRevenueReport);
router.get('/payments', protect, getPaymentReport);
router.get('/outstanding-payments', protect, getOutstandingPaymentsReport);

// School Reports
router.get('/campus-performance', protect, getFranchisePerformanceReport);
router.get('/campus-compliance', protect, getFranchiseComplianceReport);

// Staff Reports
router.get('/staff-performance', protect, getStaffPerformanceReport);
router.get('/staff-attendance', protect, getStaffAttendanceReport);
router.get('/payroll', protect, getPayrollReport);

module.exports = router;
