const express = require('express');
const router = express.Router();
const leaveController = require('../controllers/leaveController');
const { protect } = require('../middlewares/auth');
const roleCheck = require('../middlewares/roleCheck');

router.use(protect);

router.get('/', leaveController.getLeaves);
router.post('/apply', leaveController.applyLeave);
router.put(
  '/:id/review',
  roleCheck(['super_admin', 'school_admin', 'franchise_admin', 'principal', 'hr_manager']),
  leaveController.reviewLeave
);

module.exports = router;
