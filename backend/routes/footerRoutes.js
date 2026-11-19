const express = require('express');
const router = express.Router();
const {
  getFooter,
  updateFooter,
  addQuickLink,
  updateQuickLink,
  deleteQuickLink,
  uploadLogo,
  addTrustBadge,
  uploadTrustBadgeImage
} = require('../controllers/footerController');
const { protect } = require('../middlewares/auth');
const authorize = require('../middlewares/roleCheck');
const upload = require('../middlewares/upload');

// Public route
router.get('/', getFooter);

// Admin routes
router.use(protect);
router.use(authorize('super_admin'));

router.put('/', updateFooter);
router.post('/logo', upload.single('logo'), uploadLogo);

// Quick Links
router.post('/quick-links', addQuickLink);
router.put('/quick-links/:id', updateQuickLink);
router.delete('/quick-links/:id', deleteQuickLink);

// Trust Badges
router.post('/trust-badges', addTrustBadge);
router.post('/trust-badges/:id/image', upload.single('image'), uploadTrustBadgeImage);

module.exports = router;
