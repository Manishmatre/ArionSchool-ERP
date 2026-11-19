const mongoose = require('mongoose');

const leaveApplicationSchema = new mongoose.Schema({
  applicantType: {
    type: String,
    enum: ['student', 'staff'],
    required: true,
    default: 'staff'
  },
  student: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Student'
  },
  staff: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Staff'
  },
  franchise: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Franchise',
    required: true
  },
  leaveType: {
    type: String,
    enum: ['medical', 'casual', 'duty', 'maternity', 'bereavement', 'unpaid', 'other'],
    required: true,
    default: 'casual'
  },
  startDate: {
    type: Date,
    required: true
  },
  endDate: {
    type: Date,
    required: true
  },
  totalDays: {
    type: Number,
    required: true,
    default: 1
  },
  reason: {
    type: String,
    required: [true, 'Please provide reason for leave'],
    trim: true
  },
  attachments: [{
    name: String,
    url: String
  }],
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending'
  },
  reviewedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  reviewedAt: Date,
  reviewRemarks: String
}, { timestamps: true });

leaveApplicationSchema.index({ franchise: 1, status: 1 });
leaveApplicationSchema.index({ staff: 1, startDate: 1 });
leaveApplicationSchema.index({ student: 1, startDate: 1 });

module.exports = mongoose.model('LeaveApplication', leaveApplicationSchema);
