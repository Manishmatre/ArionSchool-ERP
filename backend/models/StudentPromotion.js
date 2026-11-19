const mongoose = require('mongoose');

const studentPromotionDetailSchema = new mongoose.Schema({
  student: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Student',
    required: true
  },
  studentName: { type: String, default: '' },
  enrollmentNumber: { type: String, default: '' },
  fromClass: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'SchoolClass',
    required: true
  },
  fromSection: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Section'
  },
  toClass: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'SchoolClass'
  },
  toSection: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Section'
  },
  decision: {
    type: String,
    enum: ['promoted', 'detained', 'compartment', 'graduated', 'withdrawn'],
    required: true
  },
  resultMarks: {
    percentage: { type: Number, default: 0 },
    grade: { type: String, default: '' },
    academicStatus: { type: String, default: 'pass' }
  },
  remarks: { type: String, default: '' }
}, { _id: false });

const studentPromotionSchema = new mongoose.Schema({
  batchNumber: {
    type: String,
    unique: true,
    required: true
  },
  previousSession: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'AcademicSession',
    required: true
  },
  nextSession: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'AcademicSession',
    required: true
  },
  fromClass: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'SchoolClass',
    required: true
  },
  toClass: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'SchoolClass'
  },
  promotedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  promotionDate: {
    type: Date,
    default: Date.now
  },
  totalStudents: {
    type: Number,
    default: 0
  },
  promotedCount: {
    type: Number,
    default: 0
  },
  detainedCount: {
    type: Number,
    default: 0
  },
  details: [studentPromotionDetailSchema],
  status: {
    type: String,
    enum: ['completed', 'reverted'],
    default: 'completed'
  },
  franchise: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'SchoolCampus',
    required: true
  }
}, {
  timestamps: true
});

studentPromotionSchema.index({ previousSession: 1, nextSession: 1, fromClass: 1 });
studentPromotionSchema.index({ franchise: 1, createdAt: -1 });

const StudentPromotion = mongoose.models.StudentPromotion || mongoose.model('StudentPromotion', studentPromotionSchema);

module.exports = StudentPromotion;
