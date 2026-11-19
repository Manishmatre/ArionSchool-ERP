const mongoose = require('mongoose');

const feeConcessionSchema = new mongoose.Schema({
  student: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Student',
    required: [true, 'Student reference is required']
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
  concessionType: {
    type: String,
    enum: ['percentage', 'fixed'],
    default: 'percentage'
  },
  value: {
    type: Number,
    required: [true, 'Please provide concession value (percentage or amount)'],
    min: 0
  },
  applicableComponent: {
    type: String,
    enum: ['all', 'tuition', 'admission', 'annual', 'exam', 'transport'],
    default: 'tuition'
  },
  category: {
    type: String,
    enum: ['merit_scholarship', 'sibling_discount', 'staff_ward', 'rte_quota', 'economically_weaker', 'special_concession'],
    default: 'merit_scholarship'
  },
  reason: {
    type: String,
    trim: true
  },
  approvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'approved'
  }
}, { timestamps: true });

feeConcessionSchema.index({ student: 1, academicSession: 1 });
feeConcessionSchema.index({ franchise: 1, status: 1 });

module.exports = mongoose.model('FeeConcession', feeConcessionSchema);
