const express = require('express');
const router = express.Router();
const {
  getPublicTestimonials,
  getMyTestimonials,
  createTestimonial,
  updateTestimonial,
  deleteTestimonial,
  getAllTestimonialsAdmin,
  updateTestimonialStatus,
  getFranchiseStudentTestimonials,
  getRecentEnrollments
} = require('../controllers/testimonialController');
const { protect, authorize } = require('../middlewares/auth');

// Public routes
router.get('/', getPublicTestimonials);
router.get('/public/recent-enrollments', getRecentEnrollments);

// School Admin: Get reviews submitted by their school students
router.get('/franchise/students', protect, authorize('franchise_admin'), getFranchiseStudentTestimonials);

// User-authenticated routes (Student, School, Super Admin)
router.get('/my', protect, getMyTestimonials);
router.post('/', protect, createTestimonial);
router.put('/:id', protect, updateTestimonial);
router.delete('/:id', protect, deleteTestimonial);

// Super Admin exclusive routes
router.get('/admin/all', protect, authorize('super_admin'), getAllTestimonialsAdmin);
router.patch('/admin/:id/status', protect, authorize('super_admin'), updateTestimonialStatus);

module.exports = router;
