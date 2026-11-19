const mongoose = require('mongoose');

const studentEnrollmentSchema = new mongoose.Schema({
  student: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Student',
    required: [true, 'Student reference is required']
  },
  academicSession: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'AcademicSession',
    required: [true, 'Academic session reference is required']
  },
  schoolClass: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'SchoolClass',
    required: [true, 'Class reference is required']
  },
  section: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Section'
  },
  rollNumber: {
    type: String,
    trim: true
  },
  enrollmentDate: {
    type: Date,
    default: Date.now
  },
  status: {
    type: String,
    enum: ['active', 'promoted', 'detained', 'compartment', 'transferred', 'withdrawn', 'graduated'],
    default: 'active'
  },
  resultSummary: {
    totalMarks: { type: Number, default: 0 },
    maxMarks: { type: Number, default: 0 },
    percentage: { type: Number, default: 0 },
    grade: { type: String, default: '' },
    academicStatus: {
      type: String,
      enum: ['pass', 'fail', 'compartment', 'pending', 'withheld'],
      default: 'pending'
    }
  },
  remarks: {
    type: String,
    trim: true,
    default: ''
  },
  promotedTo: {
    academicSession: { type: mongoose.Schema.Types.ObjectId, ref: 'AcademicSession' },
    schoolClass: { type: mongoose.Schema.Types.ObjectId, ref: 'SchoolClass' },
    section: { type: mongoose.Schema.Types.ObjectId, ref: 'Section' },
    promotedAt: { type: Date }
  },
  franchise: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'SchoolCampus',
    required: true
  }
}, {
  timestamps: true
});

studentEnrollmentSchema.index({ student: 1, academicSession: 1 }, { unique: true });
studentEnrollmentSchema.index({ schoolClass: 1, section: 1, academicSession: 1 });
studentEnrollmentSchema.index({ franchise: 1, academicSession: 1 });

const StudentEnrollment = mongoose.models.StudentEnrollment || mongoose.model('StudentEnrollment', studentEnrollmentSchema);

module.exports = StudentEnrollment;
