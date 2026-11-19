const express = require('express');
const router = express.Router();
const {
  getModules,
  getModule,
  createModule,
  updateModule,
  deleteModule,
  reorderModules,
  duplicateModule
} = require('../controllers/moduleController');
const { protect, authorize } = require('../middlewares/auth');

router.use(protect);

router.put('/reorder', authorize('super_admin', 'admin'), reorderModules);
router.post('/:id/duplicate', authorize('super_admin', 'admin'), duplicateModule);

router.route('/')
  .get(getModules)
  .post(authorize('super_admin', 'admin'), createModule);

router.route('/:id')
  .get(getModule)
  .put(authorize('super_admin', 'admin'), updateModule)
  .delete(authorize('super_admin', 'admin'), deleteModule);

module.exports = router;

