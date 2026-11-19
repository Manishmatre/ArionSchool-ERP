const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middlewares/auth');
const { createSeatRequest, getMySeatRequests, getAllSeatRequests, updateSeatRequest, deleteSeatRequest, getStats, getMyStats } = require('../controllers/seatRequestController');

// School Admin routes
router.post('/', protect, authorize('franchise_admin'), createSeatRequest);
router.get('/my-requests', protect, authorize('franchise_admin'), getMySeatRequests);
router.get('/my-stats', protect, authorize('franchise_admin'), getMyStats);

// Super Admin routes
router.get('/stats', protect, authorize('super_admin'), getStats);
router.get('/', protect, authorize('super_admin'), getAllSeatRequests);
router.put('/:id', protect, authorize('super_admin'), updateSeatRequest);
router.delete('/:id', protect, authorize('super_admin'), deleteSeatRequest);

module.exports = router;
