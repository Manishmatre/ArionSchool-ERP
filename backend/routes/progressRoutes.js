const express = require('express');
const router = express.Router();
const {
  getMyProgress,
  getProgressSummary,
  updateVideoProgress,
  markMaterialDownloaded,
  getAllStudentsProgress
} = require('../controllers/progressController');
const { protect, authorize } = require('../middlewares/auth');

router.use(protect);

router.get('/', getMyProgress);
router.get('/summary', getProgressSummary);
router.put('/video/:topicId', updateVideoProgress);
router.put('/material/:topicId', markMaterialDownloaded);
router.get('/all', authorize('admin'), getAllStudentsProgress);

module.exports = router;
