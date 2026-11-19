const express = require('express');
const router = express.Router();
const {
  getPromotionEligibleStudents,
  processPromotionBatch,
  getPromotionHistory
} = require('../controllers/promotionController');
const { protect, authorize } = require('../middlewares/auth');

router.use(protect);
router.use(authorize('super_admin', 'franchise_admin', 'school_admin', 'principal'));

router.get('/eligible-students', getPromotionEligibleStudents);
router.post('/process-batch', processPromotionBatch);
router.get('/history', getPromotionHistory);

module.exports = router;
