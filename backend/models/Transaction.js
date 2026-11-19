const mongoose = require('mongoose');

const TRANSACTION_CATEGORIES = {
  inflow: [
    'student_registration',
    'student_course_fee',
    'student_installment',
    'student_exam_fee',
    'student_certificate_fee',
    'student_other',
    'franchise_plan_fee',
    'franchise_investment',
    'refund_reversal',
    'other_income'
  ],
  outflow: [
    'office_rent',
    'utilities_bills',
    'cloud_server_hosting',
    'marketing_advertising',
    'office_supplies',
    'repairs_maintenance',
    'staff_salary',
    'staff_advance',
    'franchise_payout',
    'student_refund',
    'legal_accounting',
    'operating_expense',
    'other_expense'
  ]
};

const transactionSchema = new mongoose.Schema({
  transactionNumber: {
    type: String,
    required: true,
    unique: true
  },
  direction: {
    type: String,
    enum: ['inflow', 'outflow'],
    required: true
  },
  category: {
    type: String,
    required: true
  },
  amount: {
    type: Number,
    required: true,
    min: 0
  },
  currency: {
    type: String,
    default: 'INR'
  },
  status: {
    type: String,
    enum: ['draft', 'pending', 'completed', 'failed', 'cancelled', 'refunded'],
    default: 'pending'
  },
  franchise: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Franchise'
  },
  party: {
    type: {
      type: String,
      enum: ['student', 'staff', 'franchise', 'vendor', 'company'],
      default: 'company'
    },
    id: mongoose.Schema.Types.ObjectId,
    name: String
  },
  references: {
    student: { type: mongoose.Schema.Types.ObjectId, ref: 'Student' },
    course: { type: mongoose.Schema.Types.ObjectId, ref: 'Course' },
    enrollment: { type: mongoose.Schema.Types.ObjectId, ref: 'Enrollment' },
    staff: { type: mongoose.Schema.Types.ObjectId, ref: 'Staff' },
    staffSalary: { type: mongoose.Schema.Types.ObjectId, ref: 'StaffSalary' },
    advancePayment: { type: mongoose.Schema.Types.ObjectId, ref: 'AdvancePayment' },
    franchisePlan: { type: mongoose.Schema.Types.ObjectId },
    obligation: { type: mongoose.Schema.Types.ObjectId, ref: 'FeeObligation' },
    payment: { type: mongoose.Schema.Types.ObjectId, ref: 'Payment' }
  },
  paymentMethod: {
    type: String,
    enum: ['cash', 'online', 'card', 'upi', 'cheque', 'bank_transfer', 'internal', 'other'],
    default: 'cash'
  },
  gateway: {
    provider: { type: String, enum: ['razorpay', 'manual', null], default: 'manual' },
    orderId: String,
    paymentId: String,
    signature: String,
    refundId: String
  },
  bankDetails: {
    chequeNumber: String,
    bankName: String,
    upiId: String,
    transactionRef: String
  },
  receiptNumber: String,
  receiptUrl: String,
  dueDate: Date,
  paidAt: Date,
  collectedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  paidBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  parentTransaction: { type: mongoose.Schema.Types.ObjectId, ref: 'Transaction' },
  description: String,
  remarks: String,
  metadata: {
    legacyModel: String,
    legacyId: mongoose.Schema.Types.ObjectId,
    migratedAt: Date
  }
}, { timestamps: true });

transactionSchema.index({ franchise: 1, direction: 1, status: 1, paidAt: -1 });
transactionSchema.index({ 'references.payment': 1 });
transactionSchema.index({ 'metadata.legacyModel': 1, 'metadata.legacyId': 1 });

transactionSchema.statics.CATEGORIES = TRANSACTION_CATEGORIES;

module.exports = mongoose.model('Transaction', transactionSchema);
