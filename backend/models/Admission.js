const mongoose = require('mongoose');

const admissionSchema = new mongoose.Schema({
  fullName: {
    type: String,
    required: [true, 'Please provide full name'],
    trim: true
  },
  email: {
    type: String,
    required: [true, 'Please provide email'],
    trim: true,
    lowercase: true
  },
  phone: {
    type: String,
    required: [true, 'Please provide phone number'],
    trim: true
  },
  course: {
    type: String,
    trim: true,
    default: 'General School Admission'
  },
  // K-12 School Admission Pipeline Fields
  franchise: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Franchise'
  },
  academicSession: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'AcademicSession'
  },
  schoolClass: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'SchoolClass'
  },
  section: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Section'
  },
  enquiry: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Enquiry'
  },
  admissionNumber: {
    type: String,
    trim: true
  },
  pipelineStage: {
    type: String,
    enum: ['enquiry', 'application_submitted', 'document_verification', 'interview', 'fee_payment', 'confirmed', 'rejected'],
    default: 'application_submitted'
  },
  gender: {
    type: String,
    enum: ['Male', 'Female', 'Other']
  },
  dob: Date,
  bloodGroup: String,
  fatherName: String,
  fatherMobile: String,
  motherName: String,
  motherMobile: String,
  guardianName: String,
  guardianMobile: String,
  previousSchool: {
    schoolName: String,
    lastClass: String,
    tcNumber: String,
    percentage: Number
  },
  admissionFee: {
    amount: { type: Number, default: 0 },
    isPaid: { type: Boolean, default: false },
    paymentMode: { type: String, enum: ['cash', 'online', 'cheque', 'upi', 'bank_transfer', 'exempt'], default: 'cash' },
    transactionId: String,
    paidAt: Date
  },
  documentsVerified: {
    type: Boolean,
    default: false
  },
  verifiedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  city: {
    type: String,
    required: [true, 'Please provide city'],
    trim: true
  },
  state: {
    type: String,
    required: [true, 'Please provide state'],
    trim: true
  },
  center: {
    type: String,
    required: [true, 'Please select nearest center'],
    trim: true
  },
  message: {
    type: String,
    trim: true
  },
  status: {
    type: String,
    enum: ['pending', 'contacted', 'verified', 'approved', 'rejected', 'enrolled'],
    default: 'pending'
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high'],
    default: 'medium'
  },
  assignedTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  notes: [{
    date: {
      type: Date,
      default: Date.now
    },
    note: String,
    addedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }
  }],
  followUpDate: Date,
  convertedToStudent: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Student'
  },
  source: {
    type: String,
    default: 'website'
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Update timestamp on save
admissionSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Index for faster queries
admissionSchema.index({ email: 1 });
admissionSchema.index({ phone: 1 });
admissionSchema.index({ status: 1 });
admissionSchema.index({ createdAt: -1 });

module.exports = mongoose.model('Admission', admissionSchema);
