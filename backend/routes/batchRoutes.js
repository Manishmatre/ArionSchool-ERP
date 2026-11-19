const express = require('express');
const router = express.Router();
const {
  getAllBatches,
  getBatch,
  createBatch,
  updateBatch,
  deleteBatch,
  addStudentToBatch,
  removeStudentFromBatch,
  getBatchStats
} = require('../controllers/batchController');
const { protect } = require('../middlewares/auth');
const authorize = require('../middlewares/roleCheck');

router.use(protect);

router.get('/stats', authorize('super_admin', 'franchise_admin'), getBatchStats);

router.route('/')
  .get(authorize('super_admin', 'franchise_admin'), getAllBatches)
  .post(authorize('super_admin', 'franchise_admin'), createBatch);

router.route('/:id')
  .get(authorize('super_admin', 'franchise_admin'), getBatch)
  .put(authorize('super_admin', 'franchise_admin'), updateBatch)
  .delete(authorize('super_admin', 'franchise_admin'), deleteBatch);

router.post('/:id/students', authorize('super_admin', 'franchise_admin'), addStudentToBatch);
router.delete('/:id/students/:studentId', authorize('super_admin', 'franchise_admin'), removeStudentFromBatch);

module.exports = router;
