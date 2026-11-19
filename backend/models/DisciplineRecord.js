const mongoose = require('mongoose');

const disciplineRecordSchema = new mongoose.Schema({
  student: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Student',
    required: true
  },
  schoolClass: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'SchoolClass'
  },
  section: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Section'
  },
  franchise: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Franchise',
    required: true
  },
  incidentDate: {
    type: Date,
    default: Date.now
  },
  recordType: {
    type: String,
    enum: ['merit', 'demerit', 'disciplinary_incident'],
    required: true,
    default: 'disciplinary_incident'
  },
  category: {
    type: String,
    enum: [
      'uniform_violation',
      'late_arrival',
      'academic_misconduct',
      'bullying',
      'damage_to_property',
      'outstanding_conduct',
      'sports_excellence',
      'community_service',
      'other'
    ],
    default: 'other'
  },
  title: {
    type: String,
    required: [true, 'Please provide incident title'],
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  points: {
    type: Number,
    default: 0
  },
  actionTaken: {
    type: String,
    trim: true
  },
  reportedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  parentNotified: {
    type: Boolean,
    default: false
  },
  parentAcknowledged: {
    type: Boolean,
    default: false
  }
}, { timestamps: true });

disciplineRecordSchema.index({ franchise: 1, student: 1 });

module.exports = mongoose.model('DisciplineRecord', disciplineRecordSchema);
