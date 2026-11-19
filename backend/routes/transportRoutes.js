const express = require('express');
const router = express.Router();
const transportController = require('../controllers/transportController');
const { protect } = require('../middlewares/auth');
const roleCheck = require('../middlewares/roleCheck');

// Public/Device endpoint for IoT GPS trackers (or API key protected)
router.post('/telemetry', transportController.ingestTelemetry);

router.use(protect);

router.get('/vehicles', transportController.getVehicles);
router.post(
  '/vehicles',
  roleCheck(['super_admin', 'school_admin', 'franchise_admin', 'transport_manager', 'principal']),
  transportController.createVehicle
);
router.put(
  '/vehicles/:id',
  roleCheck(['super_admin', 'school_admin', 'franchise_admin', 'transport_manager', 'principal']),
  transportController.updateVehicle
);

router.get('/routes', transportController.getRoutes);
router.post(
  '/routes',
  roleCheck(['super_admin', 'school_admin', 'franchise_admin', 'transport_manager', 'principal']),
  transportController.createRoute
);

router.get('/live-fleet', transportController.getLiveFleet);

module.exports = router;
