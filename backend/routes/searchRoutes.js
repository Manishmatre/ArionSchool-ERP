const express = require('express');
const router = express.Router();
const { searchController } = require('../controllers/searchController');
const { protect } = require('../middlewares/auth');

// Protect all search routes
router.use(protect);

// Search endpoint
router.get('/', searchController);

module.exports = router;
