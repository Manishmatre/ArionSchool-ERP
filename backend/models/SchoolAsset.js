const mongoose = require('mongoose');

const schoolAssetSchema = new mongoose.Schema({
  assetTag: {
    type: String,
    required: true,
    unique: true,
    uppercase: true
  },
  name: {
    type: String,
    required: [true, 'Please provide asset name'],
    trim: true
  },
  category: {
    type: String,
    enum: ['computer', 'printer', 'projector', 'furniture', 'lab_apparatus', 'vehicle', 'generator', 'sports_gear', 'smart_board', 'other'],
    default: 'furniture'
  },
  franchise: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Franchise',
    required: true
  },
  purchaseDate: {
    type: Date,
    default: Date.now
  },
  purchaseCost: {
    type: Number,
    required: true,
    min: 0
  },
  currentValue: {
    type: Number,
    min: 0
  },
  depreciationRatePercent: {
    type: Number,
    default: 10
  },
  location: {
    type: String,
    trim: true
  },
  assignedToStaff: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Staff'
  },
  assignedDepartment: {
    type: String,
    trim: true
  },
  condition: {
    type: String,
    enum: ['new', 'good', 'needs_repair', 'damaged', 'disposed'],
    default: 'good'
  },
  warrantyExpiry: Date,
  vendor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Vendor'
  },
  serialNumber: String,
  remarks: String
}, { timestamps: true });

schoolAssetSchema.index({ franchise: 1, assetTag: 1 }, { unique: true });

module.exports = mongoose.model('SchoolAsset', schoolAssetSchema);
