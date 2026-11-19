const Vehicle = require('../models/Vehicle');
const TransportRoute = require('../models/TransportRoute');
const VehicleTelemetry = require('../models/VehicleTelemetry');
const { getIO } = require('../utils/socket');

const getTenantFranchise = (req) => {
  if (['super_admin', 'school_owner'].includes(req.user.role) && req.query.franchise) {
    return req.query.franchise;
  }
  return req.user.franchise || req.body.franchise;
};

// ==========================================
// 1. VEHICLE FLEET MANAGEMENT
// ==========================================
exports.getVehicles = async (req, res, next) => {
  try {
    const franchiseId = getTenantFranchise(req);
    const query = franchiseId ? { franchise: franchiseId } : {};
    const vehicles = await Vehicle.find(query).sort({ busNumber: 1 });
    res.status(200).json({ success: true, count: vehicles.length, data: vehicles });
  } catch (error) {
    next(error);
  }
};

exports.createVehicle = async (req, res, next) => {
  try {
    const franchiseId = getTenantFranchise(req);
    const vehicle = await Vehicle.create({
      ...req.body,
      franchise: franchiseId
    });
    res.status(201).json({ success: true, message: 'Vehicle registered in fleet', data: vehicle });
  } catch (error) {
    next(error);
  }
};

exports.updateVehicle = async (req, res, next) => {
  try {
    const vehicle = await Vehicle.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!vehicle) return res.status(404).json({ success: false, message: 'Vehicle not found' });
    res.status(200).json({ success: true, message: 'Vehicle updated', data: vehicle });
  } catch (error) {
    next(error);
  }
};

// ==========================================
// 2. TRANSPORT ROUTES
// ==========================================
exports.getRoutes = async (req, res, next) => {
  try {
    const franchiseId = getTenantFranchise(req);
    const query = franchiseId ? { franchise: franchiseId } : {};
    const routes = await TransportRoute.find(query).populate('vehicle').sort({ routeName: 1 });
    res.status(200).json({ success: true, count: routes.length, data: routes });
  } catch (error) {
    next(error);
  }
};

exports.createRoute = async (req, res, next) => {
  try {
    const franchiseId = getTenantFranchise(req);
    const route = await TransportRoute.create({
      ...req.body,
      franchise: franchiseId
    });
    const populated = await TransportRoute.findById(route._id).populate('vehicle');
    res.status(201).json({ success: true, message: 'Transport route created', data: populated });
  } catch (error) {
    next(error);
  }
};

// ==========================================
// 3. IOT GPS TELEMETRY INGESTION & LIVE FLEET TRACKING
// ==========================================
exports.ingestTelemetry = async (req, res, next) => {
  try {
    const { gpsDeviceId, latitude, longitude, speedKmh = 0, heading = 0, ignition = true, sos = false } = req.body;
    if (!gpsDeviceId || latitude === undefined || longitude === undefined) {
      return res.status(400).json({ success: false, message: 'gpsDeviceId, latitude, and longitude are required' });
    }

    const vehicle = await Vehicle.findOne({ gpsDeviceId });
    if (!vehicle) {
      return res.status(404).json({ success: false, message: `No vehicle mapped to GPS Device: ${gpsDeviceId}` });
    }

    const isOverSpeed = Number(speedKmh) > 50; // School speed limit 50 km/h

    const log = await VehicleTelemetry.create({
      vehicle: vehicle._id,
      gpsDeviceId,
      franchise: vehicle.franchise,
      latitude: Number(latitude),
      longitude: Number(longitude),
      speedKmh: Number(speedKmh),
      heading: Number(heading),
      ignition: Boolean(ignition),
      isOverSpeed,
      sosAlert: Boolean(sos),
      timestamp: new Date()
    });

    // Broadcast live telemetry coordinates over WebSocket
    try {
      const io = getIO();
      if (io) {
        io.emit('transport:telemetry', {
          vehicleId: vehicle._id,
          busNumber: vehicle.busNumber,
          driverName: vehicle.driverName,
          driverMobile: vehicle.driverMobile,
          latitude: Number(latitude),
          longitude: Number(longitude),
          speedKmh: Number(speedKmh),
          isOverSpeed,
          sosAlert: Boolean(sos),
          timestamp: new Date()
        });
      }
    } catch (e) {}

    res.status(201).json({
      success: true,
      message: 'Telemetry coordinate recorded and broadcast',
      data: log
    });
  } catch (error) {
    next(error);
  }
};

exports.getLiveFleet = async (req, res, next) => {
  try {
    const franchiseId = getTenantFranchise(req);
    const query = { status: 'active' };
    if (franchiseId) query.franchise = franchiseId;

    const vehicles = await Vehicle.find(query);
    const fleetStatus = [];

    for (const veh of vehicles) {
      const latestTelemetry = await VehicleTelemetry.findOne({ vehicle: veh._id })
        .sort({ timestamp: -1 });

      fleetStatus.push({
        vehicle: veh,
        lastKnownLocation: latestTelemetry || null
      });
    }

    res.status(200).json({ success: true, count: fleetStatus.length, data: fleetStatus });
  } catch (error) {
    next(error);
  }
};
