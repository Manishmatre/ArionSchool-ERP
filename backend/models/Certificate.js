const mongoose = require('mongoose');

const certificateSchema = new mongoose.Schema({
  certificateNumber: {
    type: String,
    required: false,
    unique: true
  },
  student: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Student',
    required: true
  },
  course: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Course',
    required: true
  },
  franchise: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Franchise',
    required: true
  },
  studentName: {
    type: String,
    required: true
  },
  courseName: {
    type: String,
    required: true
  },
  grade: {
    type: String,
    enum: ['A+', 'A', 'B+', 'B', 'C', 'Pass', 'Distinction'],
    default: 'Pass'
  },
  percentage: {
    type: Number,
    min: 0,
    max: 100
  },
  issueDate: {
    type: Date,
    default: Date.now
  },
  validTill: Date,
  certificateType: {
    type: String,
    enum: ['course_completion', 'exam_pass', 'participation', 'achievement'],
    default: 'course_completion'
  },
  template: {
    type: String,
    default: 'default'
  },
  qrCode: {
    type: String,
    default: ''
  },
  pdfPath: {
    type: String,
    default: ''
  },
  verificationCode: {
    type: String,
    required: false,
    unique: true
  },
  isVerified: {
    type: Boolean,
    default: true
  },
  issuedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  remarks: String,
  metadata: {
    duration: String,
    startDate: Date,
    endDate: Date,
    totalMarks: Number,
    obtainedMarks: Number,
    skills: [String]
  },
  status: {
    type: String,
    enum: ['active', 'revoked', 'expired'],
    default: 'active'
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

// Generate certificate number
certificateSchema.pre('save', async function(next) {
  if (!this.certificateNumber) {
    const count = await this.constructor.countDocuments();
    const year = new Date().getFullYear();
    this.certificateNumber = `CERT${year}${String(count + 1).padStart(6, '0')}`;
  }
  next();
});

// Generate verification code
certificateSchema.pre('save', function(next) {
  if (!this.verificationCode) {
    this.verificationCode = `VER${Date.now()}${Math.random().toString(36).substring(2, 9).toUpperCase()}`;
  }
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('Certificate', certificateSchema);
