const mongoose = require('mongoose');

const enrollmentSchema = new mongoose.Schema({
  student: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  course: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Course',
    required: true
  },
  session: {
    type: String,
    default: ''
  },
  enrolledAt: {
    type: Date,
    default: Date.now
  },
  completedAt: {
    type: Date,
    default: null
  },
  progress: {
    type: Number,
    default: 0, // Percentage 0-100
    min: 0,
    max: 100
  },
  isActive: {
    type: Boolean,
    default: true
  },
  lastAccessedAt: {
    type: Date,
    default: Date.now
  },
  completedTopics: [{
    type: String
  }]
});

// Compound index to ensure one enrollment per student per course
enrollmentSchema.index({ student: 1, course: 1 }, { unique: true });

// Update last accessed time
enrollmentSchema.methods.updateAccess = function () {
  this.lastAccessedAt = Date.now();
  return this.save();
};

module.exports = mongoose.model('Enrollment', enrollmentSchema);
