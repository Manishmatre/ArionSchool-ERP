const express = require('express');
const router = express.Router();
const {
  getAllMCQs,
  getMCQStats,
  getMCQsForTest,
  getMCQ,
  createMCQ,
  updateMCQ,
  deleteMCQ,
  duplicateMCQ,
  bulkCreateMCQs
} = require('../controllers/mcqController');
const { protect, authorize } = require('../middlewares/auth');

router.use(protect);

router.get('/test', getMCQsForTest);
router.get('/stats', authorize('super_admin', 'franchise_admin', 'admin'), getMCQStats);
router.post('/bulk', authorize('super_admin', 'admin'), bulkCreateMCQs);
router.post('/:id/duplicate', authorize('super_admin', 'admin'), duplicateMCQ);

router.route('/')
  .get(authorize('super_admin', 'franchise_admin', 'admin'), getAllMCQs)
  .post(authorize('super_admin', 'admin'), createMCQ);

router.route('/:id')
  .get(authorize('super_admin', 'franchise_admin', 'admin'), getMCQ)
  .put(authorize('super_admin', 'admin'), updateMCQ)
  .delete(authorize('super_admin', 'admin'), deleteMCQ);

module.exports = router;
