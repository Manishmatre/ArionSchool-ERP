const mongoose = require('mongoose');

const hostelAllocationSchema = new mongoose.Schema({
  student: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Student',
    required: true
  },
  building: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'HostelBuilding',
    required: true
  },
  room: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'HostelRoom',
    required: true
  },
  bedNumber: {
    type: String,
    trim: true
  },
  allocatedDate: {
    type: Date,
    default: Date.now
  },
  vacatedDate: Date,
  status: {
    type: String,
    enum: ['active', 'vacated', 'suspended'],
    default: 'active'
  },
  securityDeposit: {
    type: Number,
    default: 0
  },
  messPreference: {
    type: String,
    enum: ['veg', 'non_veg', 'jain'],
    default: 'veg'
  },
  franchise: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Franchise',
    required: true
  },
  remarks: String
}, { timestamps: true });

hostelAllocationSchema.index({ student: 1, status: 1 });
hostelAllocationSchema.index({ room: 1, status: 1 });

module.exports = mongoose.model('HostelAllocation', hostelAllocationSchema);
