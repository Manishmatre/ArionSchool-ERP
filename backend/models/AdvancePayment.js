const mongoose = require('mongoose');

const advancePaymentSchema = new mongoose.Schema({
  staff: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Staff',
    required: true
  },
  franchise: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Franchise',
    required: true
  },
  amount: {
    type: Number,
    required: true,
    min: 0
  },
  reason: {
    type: String,
    required: true
  },
  requestDate: {
    type: Date,
    default: Date.now
  },
  approvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  approvedDate: Date,
  paidDate: Date,
  paymentMode: {
    type: String,
    enum: ['bank_transfer', 'cash', 'cheque'],
    default: 'cash'
  },
  transactionId: String,
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected', 'paid', 'deducted'],
    default: 'pending'
  },
  // Deduction tracking
  deductionSchedule: {
    startMonth: Number,
    startYear: Number,
    installments: {
      type: Number,
      default: 1
    },
    amountPerInstallment: Number
  },
  deductedAmount: {
    type: Number,
    default: 0
  },
  remainingAmount: {
    type: Number,
    default: 0
  },
  deductions: [{
    salaryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'StaffSalary'
    },
    amount: Number,
    month: Number,
    year: Number,
    deductedAt: Date
  }],
  remarks: String
}, {
  timestamps: true
});

// Set remaining amount before saving
advancePaymentSchema.pre('save', function(next) {
  if (this.isNew) {
    this.remainingAmount = this.amount;
  } else {
    this.remainingAmount = this.amount - this.deductedAmount;
  }
  next();
});

module.exports = mongoose.model('AdvancePayment', advancePaymentSchema);
