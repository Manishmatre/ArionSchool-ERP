const express = require('express');
const router = express.Router();
const {
  requestAdvance,
  getAllAdvances,
  getAdvance,
  approveAdvance,
  payAdvance,
  getAdvanceStats
} = require('../controllers/advancePaymentController');
const { protect } = require('../middlewares/auth');
const authorize = require('../middlewares/roleCheck');

router.use(protect);

router.get('/stats', authorize('super_admin', 'franchise_admin'), getAdvanceStats);

router.route('/')
  .get(authorize('super_admin', 'franchise_admin'), getAllAdvances)
  .post(authorize('super_admin', 'franchise_admin'), requestAdvance);

router.route('/:id')
  .get(authorize('super_admin', 'franchise_admin'), getAdvance);

router.put('/:id/approve', authorize('super_admin', 'franchise_admin'), approveAdvance);
router.put('/:id/pay', authorize('super_admin', 'franchise_admin'), payAdvance);

module.exports = router;
