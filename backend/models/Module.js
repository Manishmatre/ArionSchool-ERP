const mongoose = require('mongoose');

const moduleSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Please provide module title'],
    trim: true
  },
  description: {
    type: String,
    default: '',
    trim: true
  },
  thumbnail: {
    type: String,
    default: ''
  },
  course: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Course',
    required: [true, 'Course reference is required']
  },
  duration: {
    type: Number, // positive value
    default: 0
  },
  durationUnit: {
    type: String,
    enum: ['minutes', 'hours'],
    default: 'hours'
  },
  order: {
    type: Number,
    required: true,
    default: 1
  },
  status: {
    type: String,
    enum: ['active', 'inactive'],
    default: 'active'
  },
  publicationStatus: {
    type: String,
    enum: ['draft', 'published'],
    default: 'published'
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Update timestamp on save
moduleSchema.pre('save', function (next) {
  this.updatedAt = Date.now();
  next();
});

// Index for fast lookups and sorted queries
moduleSchema.index({ course: 1, order: 1 });

module.exports = mongoose.model('Module', moduleSchema);

