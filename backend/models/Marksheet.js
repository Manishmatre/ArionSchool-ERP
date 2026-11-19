const mongoose = require('mongoose');

const marksheetSchema = new mongoose.Schema({
  student: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Student',
    required: true
  },
  franchise: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'SchoolCampus',
    index: true
  },
  course: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Course',
    required: true
  },
  template: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'MarksheetTemplate',
    required: false
  },
  marks: [{
    subject: { type: String, required: true },
    totalMarks: { type: Number, required: true },
    obtainedMarks: { type: Number, required: true },
    minMarks: { type: Number, default: 40 }
  }],
  totalMarks: {
    type: Number,
    required: true
  },
  totalObtainedMarks: {
    type: Number,
    required: true
  },
  percentage: {
    type: Number,
    required: true
  },
  grade: {
    type: String,
    required: true
  },
  issueDate: {
    type: Date,
    default: Date.now
  },
  session: {
    type: String,
    default: ''
  },
  duration: {
    type: String,
    default: ''
  },
  marksheetNumber: {
    type: String,
    unique: true
  },
  file: {
    type: Buffer
  },
  fileUrl: {
    type: String
  }
}, { timestamps: true });

marksheetSchema.index({ franchise: 1, student: 1 });
marksheetSchema.index({ student: 1, createdAt: -1 });
marksheetSchema.index({ course: 1 });
marksheetSchema.index({ createdAt: -1 });
marksheetSchema.index({ issueDate: -1 });

marksheetSchema.pre('save', async function(next) {
  if (!this.marksheetNumber) {
    const count = await this.constructor.countDocuments();
    const year = new Date().getFullYear();
    this.marksheetNumber = `SES-MARKS-${year}-${String(count + 1).padStart(4, '0')}`;
  }
  next();
});

module.exports = mongoose.model('Marksheet', marksheetSchema);
