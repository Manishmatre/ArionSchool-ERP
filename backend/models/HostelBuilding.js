const mongoose = require('mongoose');

const hostelBuildingSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Please provide hostel building name'],
    trim: true
  },
  code: {
    type: String,
    required: [true, 'Please provide building code'],
    trim: true,
    uppercase: true
  },
  genderType: {
    type: String,
    enum: ['boys', 'girls', 'coed'],
    required: true
  },
  warden: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Staff'
  },
  wardenName: String,
  contactPhone: String,
  address: String,
  franchise: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Franchise',
    required: true
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, { timestamps: true });

hostelBuildingSchema.index({ franchise: 1, code: 1 }, { unique: true });

module.exports = mongoose.model('HostelBuilding', hostelBuildingSchema);
