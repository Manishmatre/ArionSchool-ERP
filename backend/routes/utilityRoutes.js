const express = require('express');
const router = express.Router();
const { recalculateFees } = require('../controllers/utilityController');
const { protect, authorize } = require('../middlewares/auth');

router.post('/recalculate-fees', protect, authorize('super_admin'), recalculateFees);

module.exports = router;
