const mongoose = require('mongoose');

const invoiceSchema = new mongoose.Schema({
  invoiceNumber: {
    type: String,
    required: true
  },
  amount: {
    type: Number,
    required: true
  },
  currency: {
    type: String,
    default: 'INR'
  },
  billingPeriodStart: Date,
  billingPeriodEnd: Date,
  paidAt: Date,
  paymentMethod: {
    type: String,
    enum: ['razorpay', 'upi', 'bank_transfer', 'cheque', 'manual', 'waived'],
    default: 'razorpay'
  },
  paymentReference: String,
  status: {
    type: String,
    enum: ['pending', 'paid', 'failed', 'refunded'],
    default: 'paid'
  },
  pdfUrl: String
}, { _id: true, timestamps: true });

const schoolSubscriptionSchema = new mongoose.Schema({
  school: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'SchoolCampus',
    required: true,
    unique: true
  },
  plan: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'SubscriptionPlan',
    required: true
  },
  status: {
    type: String,
    enum: ['trial', 'active', 'past_due', 'expired', 'suspended'],
    default: 'trial'
  },
  trialStartsAt: {
    type: Date,
    default: Date.now
  },
  trialEndsAt: {
    type: Date,
    default: () => new Date(Date.now() + 14 * 24 * 60 * 60 * 1000)
  },
  currentPeriodStart: {
    type: Date,
    default: Date.now
  },
  currentPeriodEnd: {
    type: Date,
    default: () => new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)
  },
  gracePeriodDays: {
    type: Number,
    default: 7
  },
  autoRenew: {
    type: Boolean,
    default: true
  },
  customFeatureOverrides: [{
    type: String,
    trim: true
  }],
  studentQuotaOverride: {
    type: Number,
    default: null
  },
  invoices: [invoiceSchema],
  lastPaymentAt: Date,
  cancelledAt: Date,
  cancellationReason: String
}, {
  timestamps: true
});

schoolSubscriptionSchema.index({ school: 1 }, { unique: true });
schoolSubscriptionSchema.index({ status: 1 });
schoolSubscriptionSchema.index({ currentPeriodEnd: 1 });

module.exports = mongoose.model('SchoolSubscription', schoolSubscriptionSchema);
