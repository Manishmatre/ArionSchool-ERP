const express = require('express');
const router = express.Router();
const {
  getPublicBranding,
  getCurrentBranding,
  updateBranding,
  resetBranding,
  uploadBrandingAsset
} = require('../controllers/brandingController');
const { protect } = require('../middlewares/auth');
const authorize = require('../middlewares/roleCheck');
const upload = require('../middlewares/upload');

// Public branding resolver (used by login, public landing, and tenant lookup)
router.get('/public', getPublicBranding);

// Protected routes
router.use(protect);

router.get('/current', getCurrentBranding);

const adminRoles = ['super_admin', 'school_admin', 'franchise_admin', 'principal'];

router.put('/', authorize(...adminRoles), updateBranding);
router.post('/reset', authorize(...adminRoles), resetBranding);
router.post('/upload', authorize(...adminRoles), upload.single('asset'), uploadBrandingAsset);

module.exports = router;
