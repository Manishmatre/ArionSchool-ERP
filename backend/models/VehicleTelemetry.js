const mongoose = require('mongoose');

const vehicleTelemetrySchema = new mongoose.Schema({
  vehicle: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Vehicle',
    required: true
  },
  gpsDeviceId: {
    type: String,
    required: true
  },
  franchise: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Franchise',
    required: true
  },
  latitude: {
    type: Number,
    required: true
  },
  longitude: {
    type: Number,
    required: true
  },
  speedKmh: {
    type: Number,
    default: 0
  },
  heading: {
    type: Number,
    default: 0
  },
  ignition: {
    type: Boolean,
    default: true
  },
  isOverSpeed: {
    type: Boolean,
    default: false
  },
  sosAlert: {
    type: Boolean,
    default: false
  },
  timestamp: {
    type: Date,
    default: Date.now
  }
}, { timestamps: true });

vehicleTelemetrySchema.index({ vehicle: 1, timestamp: -1 });
vehicleTelemetrySchema.index({ gpsDeviceId: 1, timestamp: -1 });

module.exports = mongoose.model('VehicleTelemetry', vehicleTelemetrySchema);
