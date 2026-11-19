const mongoose = require('mongoose');

const programSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Please provide program name'],
    trim: true,
    unique: true
  },
  code: {
    type: String,
    required: [true, 'Please provide program code'],
    unique: true,
    uppercase: true
  },
  description: {
    type: String,
    required: [true, 'Please provide program description']
  },
  icon: {
    type: String,
    default: 'FiBook' // Icon name for frontend
  },
  color: {
    type: String,
    default: '#3B82F6' // Hex color code
  },
  isActive: {
    type: Boolean,
    default: true
  },
  order: {
    type: Number,
    default: 0
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true
});

// Virtual for course count
programSchema.virtual('courseCount', {
  ref: 'Course',
  localField: '_id',
  foreignField: 'program',
  count: true
});

module.exports = mongoose.model('Program', programSchema);
