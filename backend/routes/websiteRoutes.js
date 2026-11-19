const express = require('express');
const router = express.Router();
const {
  getPageContent,
  getAllContent,
  getContentById,
  createContent,
  updateContent,
  deleteContent,
  uploadContentImage,
  getSettings,
  getPublicSchools,
  updateSettings,
  uploadLogo,
  uploadFavicon,
  reorderContent
} = require('../controllers/websiteController');
const { protect } = require('../middlewares/auth');
const authorize = require('../middlewares/roleCheck');
const upload = require('../middlewares/upload');

// Public routes - Learning website needs these
router.get('/content/:page', getPageContent);
router.get('/content', getAllContent); // Public GET for query params
router.get('/settings', getSettings);
router.get('/schools', getPublicSchools);

// Admin routes - Content Management
router.use(protect);
router.use(authorize('super_admin'));

router.post('/content', createContent); // Only POST requires auth

router.route('/content/item/:id')
  .get(getContentById)
  .put(updateContent)
  .delete(deleteContent);

router.post('/content/:id/image', upload.single('image'), uploadContentImage);
router.put('/content/reorder', reorderContent);

// Admin routes - Settings Management
router.put('/settings', updateSettings);
router.post('/settings/logo', upload.single('logo'), uploadLogo);
router.post('/settings/favicon', upload.single('favicon'), uploadFavicon);

module.exports = router;
