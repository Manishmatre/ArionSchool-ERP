const express = require('express');
const router = express.Router();
const {
  getAllFeePolicies,
  getFeePolicy,
  createFeePolicy,
  updateFeePolicy,
  syncFromCourse,
  syncAllCourses
} = require('../controllers/feePolicyController');
const { protect } = require('../middlewares/auth');
const authorize = require('../middlewares/roleCheck');

router.use(protect);

router.get('/', authorize('super_admin', 'franchise_admin'), getAllFeePolicies);
router.post('/', authorize('super_admin'), createFeePolicy);
router.post('/sync-all-courses', authorize('super_admin'), syncAllCourses);
router.post('/sync-course/:courseId', authorize('super_admin', 'franchise_admin'), syncFromCourse);
router.get('/:id', authorize('super_admin', 'franchise_admin'), getFeePolicy);
router.put('/:id', authorize('super_admin'), updateFeePolicy);

module.exports = router;
