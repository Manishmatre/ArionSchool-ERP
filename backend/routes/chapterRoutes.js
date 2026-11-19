const express = require('express');
const router = express.Router();
const {
  getAllChapters,
  getChapter,
  createChapter,
  updateChapter,
  deleteChapter,
  checkChapterDependencies
} = require('../controllers/chapterController');
const { protect, authorize } = require('../middlewares/auth');

router.use(protect);

router.route('/')
  .get(getAllChapters)
  .post(authorize('admin'), createChapter);

router.route('/:id')
  .get(getChapter)
  .put(authorize('admin'), updateChapter)
  .delete(authorize('admin'), deleteChapter);

router.get('/:id/check-dependencies', authorize('admin'), checkChapterDependencies);

module.exports = router;
