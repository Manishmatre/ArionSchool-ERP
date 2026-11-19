const mongoose = require('mongoose');

const schoolFeeReceiptSchema = new mongoose.Schema({
  receiptNumber: {
    type: String,
    required: true,
    unique: true,
    uppercase: true
  },
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
  schoolClass: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'SchoolClass'
  },
  academicSession: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'AcademicSession'
  },
  amount: {
    type: Number,
    required: true,
    min: 0
  },
  paymentMethod: {
    type: String,
    enum: ['cash', 'online', 'cheque', 'upi', 'bank_transfer', 'card'],
    default: 'cash'
  },
  transaction: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Transaction'
  },
  gatewayPaymentId: String,
  breakdown: [{
    component: { type: String, required: true },
    amount: { type: Number, required: true }
  }],
  concessionApplied: {
    type: Number,
    default: 0
  },
  lateFinePaid: {
    type: Number,
    default: 0
  },
  paidAt: {
    type: Date,
    default: Date.now
  },
  collectedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  remarks: {
    type: String,
    trim: true
  }
}, { timestamps: true });

schoolFeeReceiptSchema.index({ franchise: 1, receiptNumber: 1 });
schoolFeeReceiptSchema.index({ student: 1, paidAt: -1 });

module.exports = mongoose.model('SchoolFeeReceipt', schoolFeeReceiptSchema);
