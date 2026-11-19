const mongoose = require('mongoose');

const feePolicySchema = new mongoose.Schema({
  scope: {
    type: String,
    enum: ['global', 'franchise', 'course', 'school_class'],
    default: 'course'
  },
  franchise: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Franchise'
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
  frequency: {
    type: String,
    enum: ['monthly', 'quarterly', 'half_yearly', 'annual', 'one_time'],
    default: 'monthly'
  },
  components: {
    registrationFee: { type: Number, default: 0 },
    courseFee: { type: Number, default: 0 },
    examFee: { type: Number, default: 0 },
    certificateFee: { type: Number, default: 0 },
    otherFees: { type: Number, default: 0 },
    // K-12 School Fee Components
    tuitionFee: { type: Number, default: 0 },
    admissionFee: { type: Number, default: 0 },
    annualCharges: { type: Number, default: 0 },
    labFee: { type: Number, default: 0 },
    libraryFee: { type: Number, default: 0 },
    sportsFee: { type: Number, default: 0 },
    transportFee: { type: Number, default: 0 },
    hostelFee: { type: Number, default: 0 }
  },
  lateFine: {
    graceDays: { type: Number, default: 10 },
    fineType: { type: String, enum: ['fixed', 'per_day'], default: 'fixed' },
    amount: { type: Number, default: 50 }
  },
  totalFee: {
    type: Number,
    default: 0
  },
  installments: [{
    installmentNumber: Number,
    amount: Number,
    dueAfterDays: Number,
    description: String
  }],
  discounts: [{
    type: { type: String, enum: ['percentage', 'fixed'] },
    value: Number,
    label: String
  }],
  taxes: {
    gstPercent: { type: Number, default: 0 },
    otherTaxes: { type: Number, default: 0 }
  },
  effectiveFrom: { type: Date, default: Date.now },
  effectiveTill: Date,
  isActive: { type: Boolean, default: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

feePolicySchema.pre('save', function (next) {
  const c = this.components || {};
  this.totalFee =
    (c.registrationFee || 0) +
    (c.courseFee || 0) +
    (c.examFee || 0) +
    (c.certificateFee || 0) +
    (c.otherFees || 0) +
    (c.tuitionFee || 0) +
    (c.admissionFee || 0) +
    (c.annualCharges || 0) +
    (c.labFee || 0) +
    (c.libraryFee || 0) +
    (c.sportsFee || 0) +
    (c.transportFee || 0) +
    (c.hostelFee || 0);
  next();
});

module.exports = mongoose.model('FeePolicy', feePolicySchema);
