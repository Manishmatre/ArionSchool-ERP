const mongoose = require('mongoose');

const staffSalarySchema = new mongoose.Schema({
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
  month: {
    type: Number,
    required: true,
    min: 1,
    max: 12
  },
  year: {
    type: Number,
    required: true
  },
  // Salary Components
  basicSalary: {
    type: Number,
    required: true,
    default: 0
  },
  allowances: {
    hra: { type: Number, default: 0 },
    ta: { type: Number, default: 0 },
    da: { type: Number, default: 0 },
    other: { type: Number, default: 0 }
  },
  totalAllowances: {
    type: Number,
    default: 0
  },
  grossSalary: {
    type: Number,
    default: 0
  },
  // Deductions
  deductions: {
    pf: { type: Number, default: 0 },
    esi: { type: Number, default: 0 },
    tax: { type: Number, default: 0 },
    other: { type: Number, default: 0 }
  },
  totalDeductions: {
    type: Number,
    default: 0
  },
  // Attendance
  attendance: {
    totalDays: { type: Number, default: 0 },
    presentDays: { type: Number, default: 0 },
    absentDays: { type: Number, default: 0 },
    halfDays: { type: Number, default: 0 },
    leaves: { type: Number, default: 0 },
    holidays: { type: Number, default: 0 }
  },
  // Advance Deduction
  advanceDeduction: {
    type: Number,
    default: 0
  },
  advancePayments: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'AdvancePayment'
  }],
  // Final Salary
  netSalary: {
    type: Number,
    required: true,
    default: 0
  },
  // Payment Details
  paymentDate: Date,
  paymentMode: {
    type: String,
    enum: ['bank_transfer', 'cash', 'cheque'],
    default: 'bank_transfer'
  },
  transactionId: String,
  remarks: String,
  // Status
  status: {
    type: String,
    enum: ['pending', 'processing', 'paid', 'cancelled'],
    default: 'pending'
  },
  paidBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  paidAt: Date
}, {
  timestamps: true
});

// Create compound index for unique salary per staff per month
staffSalarySchema.index({ staff: 1, month: 1, year: 1 }, { unique: true });

// Calculate totals before saving
staffSalarySchema.pre('save', function(next) {
  // Calculate total allowances
  this.totalAllowances = (this.allowances?.hra || 0) + 
                         (this.allowances?.ta || 0) + 
                         (this.allowances?.da || 0) + 
                         (this.allowances?.other || 0);
  
  // Calculate gross salary
  this.grossSalary = this.basicSalary + this.totalAllowances;
  
  // Calculate total deductions
  this.totalDeductions = (this.deductions?.pf || 0) + 
                         (this.deductions?.esi || 0) + 
                         (this.deductions?.tax || 0) + 
                         (this.deductions?.other || 0);
  
  // Calculate net salary (Gross - Deductions - Advance)
  this.netSalary = this.grossSalary - this.totalDeductions - (this.advanceDeduction || 0);
  
  next();
});

module.exports = mongoose.model('StaffSalary', staffSalarySchema);
