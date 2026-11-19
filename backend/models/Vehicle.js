const mongoose = require('mongoose');

const vehicleSchema = new mongoose.Schema({
  vehicleNumber: {
    type: String,
    required: [true, 'Please provide vehicle registration number (e.g. DL-01-AB-1234)'],
    trim: true,
    uppercase: true
  },
  busNumber: {
    type: String, // e.g. "Bus 04"
    required: true,
    trim: true
  },
  capacity: {
    type: Number,
    required: true,
    default: 40
  },
  driverName: {
    type: String,
    required: true
  },
  driverMobile: {
    type: String,
    required: true
  },
  driverLicenseNumber: String,
  helperName: String,
  helperMobile: String,
  franchise: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Franchise',
    required: true
  },
  gpsDeviceId: {
    type: String,
    trim: true
  },
  insuranceExpiry: Date,
  fitnessExpiry: Date,
  pollutionExpiry: Date,
  status: {
    type: String,
    enum: ['active', 'maintenance', 'out_of_service'],
    default: 'active'
  }
}, { timestamps: true });

vehicleSchema.index({ franchise: 1, busNumber: 1 });
vehicleSchema.index({ gpsDeviceId: 1 });

module.exports = mongoose.model('Vehicle', vehicleSchema);
