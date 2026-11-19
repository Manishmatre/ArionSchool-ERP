const express = require('express');
const router = express.Router();
const {
  generateIdCard,
  batchGenerateIdCards,
  getTemplates,
  getTemplateById,
  createTemplate,
  updateTemplate,
  deleteTemplate,
  getGeneratedIdCards,
  downloadIdCard,
  previewIdCard,
  deleteIdCard
} = require('../controllers/idCardController');
const { protect, authorize } = require('../middlewares/auth');

router.use(protect);

// ID Card Generation Routes
router.post('/generate/:studentId', authorize('super_admin', 'franchise_admin'), generateIdCard);
router.post('/batch-generate', authorize('super_admin', 'franchise_admin'), batchGenerateIdCards);
router.get('/my', authorize('student'), (req, res, next) => require('../controllers/idCardController').getMyIdCard(req, res, next));
router.get('/generated', authorize('super_admin', 'franchise_admin'), getGeneratedIdCards);
router.get('/download/:id', authorize('super_admin', 'franchise_admin', 'student'), downloadIdCard);
router.get('/preview/:id', authorize('super_admin', 'franchise_admin', 'student'), previewIdCard);
router.delete('/:id', authorize('super_admin', 'franchise_admin'), deleteIdCard);

// Template Management Routes
router.get('/templates', authorize('super_admin', 'franchise_admin'), getTemplates);
router.get('/templates/:id', authorize('super_admin', 'franchise_admin'), getTemplateById);
router.post('/templates', authorize('super_admin', 'franchise_admin'), createTemplate);
router.put('/templates/:id', authorize('super_admin', 'franchise_admin'), updateTemplate);
router.delete('/templates/:id', authorize('super_admin', 'franchise_admin'), deleteTemplate);

module.exports = router;
