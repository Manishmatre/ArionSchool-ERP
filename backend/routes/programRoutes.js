const express = require('express');
const router = express.Router();
const {
  getAllPrograms,
  getProgram,
  createProgram,
  updateProgram,
  deleteProgram,
  checkProgramDependencies,
  getProgramStats
} = require('../controllers/programController');
const { protect } = require('../middlewares/auth');
const authorize = require('../middlewares/roleCheck');

// Public routes
router.get('/', getAllPrograms);
router.get('/:id', getProgram);

// Protected routes
router.use(protect);

router.get('/admin/stats', authorize('super_admin', 'franchise_admin'), getProgramStats);

router.route('/admin')
  .post(authorize('super_admin'), createProgram);

router.route('/admin/:id')
  .put(authorize('super_admin'), updateProgram)
  .delete(authorize('super_admin'), deleteProgram);

router.get('/admin/:id/check-dependencies', authorize('super_admin'), checkProgramDependencies);

module.exports = router;
