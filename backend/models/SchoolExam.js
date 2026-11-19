const mongoose = require('mongoose');

const schoolExamSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Please provide exam name (e.g. Term 1 Half-Yearly)'],
    trim: true,
    alias: 'title'
  },
  examType: {
    type: String,
    enum: ['unit_test', 'periodic_test', 'half_yearly', 'annual', 'practical', 'internal_assessment', 'mock_board'],
    default: 'unit_test'
  },
  academicSession: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'AcademicSession',
    required: true
  },
  franchise: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Franchise',
    required: true
  },
  startDate: {
    type: Date,
    required: true
  },
  endDate: {
    type: Date,
    required: true
  },
  schoolClasses: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'SchoolClass'
  }],
  gradingScale: {
    type: String,
    enum: ['cbse_9_point', 'cbse_secondary_8_point', 'percentage_standard', 'icse_10_point'],
    default: 'cbse_9_point'
  },
  status: {
    type: String,
    enum: ['draft', 'scheduled', 'ongoing', 'completed', 'published'],
    default: 'scheduled'
  },
  description: String
}, { timestamps: true });

schoolExamSchema.index({ franchise: 1, academicSession: 1 });

module.exports = mongoose.model('SchoolExam', schoolExamSchema);
