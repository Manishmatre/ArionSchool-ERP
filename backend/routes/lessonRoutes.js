const express = require('express');
const router = express.Router();
const {
  getLessons,
  getLesson,
  createLesson,
  updateLesson,
  deleteLesson,
  moveLesson,
  duplicateLesson,
  reorderLessons,
  uploadLessonMedia
} = require('../controllers/lessonController');
const { protect, authorize } = require('../middlewares/auth');
const upload = require('../middlewares/upload');

router.use(protect);

router.post('/upload-media', authorize('super_admin', 'admin'), upload.single('file'), uploadLessonMedia);
router.put('/reorder', authorize('super_admin', 'admin'), reorderLessons);
router.put('/:id/move', authorize('super_admin', 'admin'), moveLesson);
router.post('/:id/duplicate', authorize('super_admin', 'admin'), duplicateLesson);

router.route('/')
  .get(getLessons)
  .post(authorize('super_admin', 'admin'), createLesson);

router.route('/:id')
  .get(getLesson)
  .put(authorize('super_admin', 'admin'), updateLesson)
  .delete(authorize('super_admin', 'admin'), deleteLesson);

module.exports = router;

