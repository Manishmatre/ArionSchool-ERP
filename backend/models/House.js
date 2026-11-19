const mongoose = require('mongoose');

const houseSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Please provide house name (e.g. Red House - Shivaji)'],
    trim: true
  },
  code: {
    type: String,
    required: [true, 'Please provide house code (e.g. RED)'],
    trim: true,
    uppercase: true
  },
  color: {
    type: String,
    default: '#3B82F6'
  },
  franchise: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Franchise',
    required: true
  },
  motto: {
    type: String,
    trim: true
  },
  houseCaptain: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Student'
  },
  houseIncharge: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Staff'
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

houseSchema.index({ franchise: 1, name: 1 }, { unique: true });

module.exports = mongoose.model('House', houseSchema);
