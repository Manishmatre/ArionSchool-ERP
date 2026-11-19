const express = require('express');
const router = express.Router();
const {
  getAllImages,
  getImage,
  uploadGalleryImage,
  uploadMultipleImages,
  updateImage,
  deleteGalleryImage,
  toggleImageStatus,
  updateImageOrder,
  getImagesByCategory,
  getGalleryStats
} = require('../controllers/galleryController');
const { protect } = require('../middlewares/auth');
const authorize = require('../middlewares/roleCheck');
const upload = require('../middlewares/upload');

// Public routes
router.get('/', getAllImages);
router.get('/category/:category', getImagesByCategory);
router.get('/:id', getImage);

// Protected routes
router.use(protect);

router.post('/', authorize('super_admin', 'franchise_admin'), upload.single('image'), uploadGalleryImage);
router.post('/bulk', authorize('super_admin', 'franchise_admin'), upload.array('images', 10), uploadMultipleImages);
router.get('/stats/all', authorize('super_admin', 'franchise_admin'), getGalleryStats);

router.put('/:id', authorize('super_admin', 'franchise_admin'), upload.single('image'), updateImage);
router.delete('/:id', authorize('super_admin', 'franchise_admin'), deleteGalleryImage);
router.put('/:id/toggle', authorize('super_admin', 'franchise_admin'), toggleImageStatus);
router.put('/:id/order', authorize('super_admin', 'franchise_admin'), updateImageOrder);

module.exports = router;
