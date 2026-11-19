const express = require('express');
const { getPlatformActivity } = require('../controllers/activityController');
const { protect, authorize } = require('../middlewares/auth');

const router = express.Router();

router.get('/', protect, authorize('super_admin'), getPlatformActivity);

module.exports = router;
