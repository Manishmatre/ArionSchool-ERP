const mongoose = require('mongoose');

const hostelRoomSchema = new mongoose.Schema({
  building: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'HostelBuilding',
    required: true
  },
  roomNumber: {
    type: String,
    required: [true, 'Please provide room number'],
    trim: true
  },
  floor: {
    type: Number,
    default: 1
  },
  roomType: {
    type: String,
    enum: ['single', 'double', 'triple', 'four_bed', 'dormitory'],
    default: 'double'
  },
  capacity: {
    type: Number,
    default: 2
  },
  currentOccupancy: {
    type: Number,
    default: 0
  },
  monthlyFee: {
    type: Number,
    default: 0
  },
  franchise: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Franchise',
    required: true
  },
  status: {
    type: String,
    enum: ['available', 'occupied', 'maintenance'],
    default: 'available'
  }
}, { timestamps: true });

hostelRoomSchema.index({ building: 1, roomNumber: 1 }, { unique: true });

module.exports = mongoose.model('HostelRoom', hostelRoomSchema);
