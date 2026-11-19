const express = require('express');
const router = express.Router();
const {
  getBuildings,
  createBuilding,
  getRooms,
  createRoom,
  allocateBed,
  vacateBed,
  getAllocations
} = require('../controllers/hostelController');
const { protect } = require('../middlewares/auth');
const authorize = require('../middlewares/roleCheck');

router.use(protect);

const hostelRoles = ['super_admin', 'school_admin', 'franchise_admin', 'principal', 'accountant'];

// Buildings
router.route('/buildings')
  .get(authorize(...hostelRoles), getBuildings)
  .post(authorize(...hostelRoles), createBuilding);

// Rooms
router.route('/rooms')
  .get(authorize(...hostelRoles), getRooms)
  .post(authorize(...hostelRoles), createRoom);

// Allocations
router.route('/allocations')
  .get(authorize(...hostelRoles), getAllocations)
  .post(authorize(...hostelRoles), allocateBed);

router.post('/allocations/:id/vacate', authorize(...hostelRoles), vacateBed);

module.exports = router;
