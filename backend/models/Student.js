const mongoose = require('mongoose');

const studentSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  studentId: {
    type: String,
    required: true,
    trim: true
  },
  enrollmentNumber: {
    type: String,
    required: true,
    trim: true
  },
  session: {
    type: String,
    default: ''
  },
  // K-12 School Architecture Fields
  schoolClass: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'SchoolClass'
  },
  section: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Section'
  },
  academicSession: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'AcademicSession'
  },
  house: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'House'
  },
  parent: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  rollNumber: {
    type: String,
    trim: true
  },
  admissionNumber: {
    type: String,
    trim: true,
    sparse: true
  },
  admissionDate: {
    type: Date,
    default: Date.now
  },
  status: {
    type: String,
    enum: ['active', 'transferred', 'withdrawn', 'alumni'],
    default: 'active'
  },
  rfidCardId: {
    type: String,
    trim: true,
    sparse: true
  },
  category: {
    type: String,
    enum: ['General', 'OBC', 'SC', 'ST', 'EWS', 'Other'],
    default: 'General'
  },
  isRTE: {
    type: Boolean,
    default: false
  },
  franchise: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Franchise',
    required: true
  },
  personalInfo: {
    firstName: {
      type: String,
      required: true
    },
    lastName: {
      type: String,
      required: true
    },
    fatherName: String,
    motherName: String,
    dateOfBirth: Date,
    gender: {
      type: String,
      enum: ['Male', 'Female', 'Other']
    },
    bloodGroup: String,
    aadhaarNumber: String,
    photo: String
  },
  contactInfo: {
    email: {
      type: String,
      required: true
    },
    mobile: {
      type: String
    },
    alternatePhone: String,
    address: {
      street: String,
      city: String,
      state: String,
      pincode: String,
      country: { type: String, default: 'India' }
    }
  },
  academicInfo: {
    lastQualification: String,
    boardOrUniversity: String,
    schoolOrCollege: String,
    yearOfPassing: Number,
    percentage: Number
  },
  documents: {
    aadhaarCardFront: {
      url: String
    },
    aadhaarCardBack: {
      url: String
    },
    signature: {
      url: String
    },
    lastMarksheet: {
      url: String
    }
  },
  guardianInfo: {
    name: String,
    mobile: String,
    email: String,
    relation: String
  },
  enrolledCourses: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Enrollment'
  }],
  fees: {
    totalFees: {
      type: Number,
      default: 0
    },
    paidAmount: {
      type: Number,
      default: 0
    },
    pendingAmount: {
      type: Number,
      default: 0
    },
    lastPaymentDate: Date,
    // Separate tracking for different payment types
    registrationFee: {
      type: Number,
      default: 0
    },
    registrationPaid: {
      type: Number,
      default: 0
    },
    registrationPending: {
      type: Number,
      default: 0
    },
    examFee: {
      type: Number,
      default: 0
    },
    examPaid: {
      type: Number,
      default: 0
    },
    examPending: {
      type: Number,
      default: 0
    },
    certificateFee: {
      type: Number,
      default: 0
    },
    certificatePaid: {
      type: Number,
      default: 0
    },
    certificatePending: {
      type: Number,
      default: 0
    }
  },
  attendance: {
    totalClasses: {
      type: Number,
      default: 0
    },
    attendedClasses: {
      type: Number,
      default: 0
    },
    attendancePercentage: {
      type: Number,
      default: 0
    }
  },
  examResults: [{
    exam: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'TestResult'
    },
    score: Number,
    percentage: Number,
    grade: String,
    isPassed: Boolean,
    date: Date
  }],
  certificates: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Certificate'
  }],
  examAccess: {
    bypassAllPendingFees: {
      type: Boolean,
      default: false
    },
    bypassAllGrantedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    bypassAllGrantedAt: Date,
    bypassAllReason: String,
    courseOverrides: [{
      course: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Course',
        required: true
      },
      grantedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      },
      grantedAt: {
        type: Date,
        default: Date.now
      },
      reason: String,
      expiresAt: Date
    }]
  },
  status: {
    type: String,
    enum: ['active', 'inactive', 'graduated', 'dropped'],
    default: 'active'
  },
  admissionDate: {
    type: Date,
    default: Date.now
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// High-performance compound multi-tenant indexes
studentSchema.index({ franchise: 1, studentId: 1 }, { unique: true });
studentSchema.index({ franchise: 1, enrollmentNumber: 1 }, { unique: true });
studentSchema.index({ franchise: 1, admissionNumber: 1 }, { sparse: true });
studentSchema.index({ franchise: 1, schoolClass: 1, section: 1 });
studentSchema.index({ franchise: 1, status: 1 });
studentSchema.index({ franchise: 1, createdAt: -1 });
studentSchema.index({ 'personalInfo.firstName': 1, 'personalInfo.lastName': 1 });

// Update timestamp on save
studentSchema.pre('save', function (next) {
  this.updatedAt = Date.now();
  if (!this.session) {
    const d = this.admissionDate || this.createdAt || new Date();
    const yr = new Date(d).getFullYear();
    this.session = `${yr} - ${yr + 1}`;
  }
  // Calculate pending amount
  this.fees.pendingAmount = Math.max(0, this.fees.totalFees - this.fees.paidAmount);

  // Calculate pending amounts for different payment types
  this.fees.registrationPending = Math.max(0, this.fees.registrationFee - this.fees.registrationPaid);
  this.fees.examPending = Math.max(0, this.fees.examFee - this.fees.examPaid);
  this.fees.certificatePending = Math.max(0, this.fees.certificateFee - this.fees.certificatePaid);

  // Calculate attendance percentage
  if (this.attendance.totalClasses > 0) {
    this.attendance.attendancePercentage =
      (this.attendance.attendedClasses / this.attendance.totalClasses) * 100;
  }
  next();
});

// Virtual for full name
studentSchema.virtual('fullName').get(function () {
  return `${this.personalInfo.firstName} ${this.personalInfo.lastName}`;
});

module.exports = mongoose.model('Student', studentSchema);
