const mongoose = require('mongoose');

const feeObligationSchema = new mongoose.Schema({
  student: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Student',
    required: true
  },
  franchise: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Franchise',
    required: true
  },
  course: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Course'
  },
  schoolClass: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'SchoolClass'
  },
  academicSession: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'AcademicSession'
  },
  feePolicy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'FeePolicy'
  },
  component: {
    type: String,
    enum: [
      'registration',
      'course_fee',
      'exam_fee',
      'certificate_fee',
      'tuition',
      'admission',
      'annual',
      'lab',
      'library',
      'sports',
      'transport',
      'hostel',
      'other',
      'total'
    ],
    required: true
  },
  lateFineApplied: {
    type: Number,
    default: 0
  },
  receiptNumber: String,
  amountDue: {
    type: Number,
    required: true,
    min: 0
  },
  amountPaid: {
    type: Number,
    default: 0,
    min: 0
  },
  amountPending: {
    type: Number,
    default: 0,
    min: 0
  },
  dueDate: Date,
  status: {
    type: String,
    enum: ['open', 'partial', 'paid', 'overdue', 'waived', 'cancelled'],
    default: 'open'
  },
  source: {
    type: String,
    enum: ['enrollment', 'manual', 'installment_schedule', 'migration'],
    default: 'enrollment'
  },
  installmentNumber: Number,
  description: String
}, { timestamps: true });

feeObligationSchema.index({ student: 1, course: 1, component: 1 });
feeObligationSchema.index({ franchise: 1, status: 1 });

feeObligationSchema.methods.recalculate = function () {
  this.amountPending = Math.max(0, this.amountDue - this.amountPaid);
  if (this.amountPaid <= 0) {
    this.status = this.dueDate && new Date() > this.dueDate ? 'overdue' : 'open';
  } else if (this.amountPending <= 0) {
    this.status = 'paid';
  } else {
    this.status = 'partial';
  }
};

module.exports = mongoose.model('FeeObligation', feeObligationSchema);
