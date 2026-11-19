const mongoose = require('mongoose');

const studentMarkSchema = new mongoose.Schema({
  exam: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'SchoolExam',
    required: true
  },
  student: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Student',
    required: true
  },
  schoolClass: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'SchoolClass',
    required: true
  },
  section: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Section',
    required: true
  },
  subject: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Subject',
    required: true
  },
  franchise: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Franchise',
    required: true
  },
  marksObtained: {
    type: Number,
    required: true,
    min: 0
  },
  maxMarks: {
    type: Number,
    default: 100
  },
  passMarks: {
    type: Number,
    default: 33
  },
  percentage: Number,
  grade: String,
  isPassed: Boolean,
  isAbsent: {
    type: Boolean,
    default: false
  },
  enteredBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  remarks: String
}, { timestamps: true });

// Auto calculate percentage, pass status, and CBSE 9-point grade
studentMarkSchema.pre('save', function (next) {
  if (this.isAbsent) {
    this.marksObtained = 0;
    this.percentage = 0;
    this.grade = 'AB';
    this.isPassed = false;
    return next();
  }

  const max = this.maxMarks || 100;
  this.percentage = Math.round(((this.marksObtained / max) * 100) * 10) / 10;
  this.isPassed = this.marksObtained >= (this.passMarks || 33);

  // Standard CBSE 9-Point Grading Scale
  const p = this.percentage;
  if (p >= 91) this.grade = 'A1';
  else if (p >= 81) this.grade = 'A2';
  else if (p >= 71) this.grade = 'B1';
  else if (p >= 61) this.grade = 'B2';
  else if (p >= 51) this.grade = 'C1';
  else if (p >= 41) this.grade = 'C2';
  else if (p >= 33) this.grade = 'D';
  else if (p >= 21) this.grade = 'E1';
  else this.grade = 'E2';

  next();
});

studentMarkSchema.index({ exam: 1, student: 1, subject: 1 }, { unique: true });
studentMarkSchema.index({ schoolClass: 1, section: 1, exam: 1 });

module.exports = mongoose.model('StudentMark', studentMarkSchema);
