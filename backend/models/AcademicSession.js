const mongoose = require('mongoose');

const academicSessionSchema = new mongoose.Schema({
  sessionName: {
    type: String,
    required: [true, 'Please provide academic session name (e.g. 2025-2026)'],
    trim: true
  },
  startDate: {
    type: Date,
    required: [true, 'Please specify session start date']
  },
  endDate: {
    type: Date,
    required: [true, 'Please specify session end date']
  },
  isCurrent: {
    type: Boolean,
    default: false
  },
  franchise: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Franchise',
    required: true
  },
  status: {
    type: String,
    enum: ['upcoming', 'active', 'completed', 'archived'],
    default: 'active'
  },
  description: {
    type: String,
    trim: true
  }
}, {
  timestamps: true
});

academicSessionSchema.index({ franchise: 1, sessionName: 1 }, { unique: true });
academicSessionSchema.index({ franchise: 1, isCurrent: 1 });

module.exports = mongoose.model('AcademicSession', academicSessionSchema);
