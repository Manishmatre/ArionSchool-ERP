const mongoose = require('mongoose');

const staffSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  staffId: {
    type: String,
    required: true,
    unique: true
  },
  franchise: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Franchise',
    required: true
  },
  personalInfo: {
    firstName: {
      type: String,
      required: true,
      trim: true
    },
    lastName: {
      type: String,
      required: true,
      trim: true
    },
    dateOfBirth: Date,
    gender: {
      type: String,
      enum: ['male', 'female', 'other']
    },
    bloodGroup: String,
    aadharNumber: String,
    panNumber: String
  },
  contactInfo: {
    email: {
      type: String,
      required: true,
      lowercase: true
    },
    mobile: {
      type: String,
      required: true
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
  employmentDetails: {
    designation: {
      type: String,
      required: true,
      enum: ['teacher', 'counselor', 'accountant', 'receptionist', 'manager', 'coordinator', 'other']
    },
    department: {
      type: String,
      enum: ['academics', 'administration', 'accounts', 'counseling', 'operations', 'other']
    },
    employeeType: {
      type: String,
      enum: ['full-time', 'part-time', 'contract', 'intern'],
      default: 'full-time'
    },
    joiningDate: {
      type: Date,
      required: true
    },
    resignationDate: Date,
    workingHours: {
      startTime: String,
      endTime: String
    },
    workingDays: [String], // ['Monday', 'Tuesday', etc.]
    reportingTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Staff'
    }
  },
  salary: {
    basicSalary: {
      type: Number,
      required: true
    },
    allowances: {
      hra: Number,
      ta: Number,
      da: Number,
      other: Number
    },
    deductions: {
      pf: Number,
      esi: Number,
      tax: Number,
      other: Number
    },
    netSalary: Number,
    paymentMode: {
      type: String,
      enum: ['bank_transfer', 'cash', 'cheque'],
      default: 'bank_transfer'
    },
    bankDetails: {
      accountNumber: String,
      ifscCode: String,
      bankName: String,
      branchName: String
    }
  },
  qualifications: [{
    degree: String,
    institution: String,
    year: Number,
    percentage: Number,
    specialization: String
  }],
  experience: [{
    company: String,
    designation: String,
    from: Date,
    to: Date,
    duration: String,
    responsibilities: String
  }],
  documents: [{
    type: {
      type: String,
      enum: ['resume', 'aadhar', 'pan', 'degree', 'experience_letter', 'photo', 'other']
    },
    name: String,
    url: String,
    uploadedAt: {
      type: Date,
      default: Date.now
    }
  }],
  permissions: {
    canMarkAttendance: {
      type: Boolean,
      default: false
    },
    canIssueCertificates: {
      type: Boolean,
      default: false
    },
    canCollectFees: {
      type: Boolean,
      default: false
    },
    canManageStudents: {
      type: Boolean,
      default: false
    },
    canViewReports: {
      type: Boolean,
      default: false
    }
  },
  attendance: [{
    date: Date,
    status: {
      type: String,
      enum: ['present', 'absent', 'half-day', 'leave', 'holiday']
    },
    checkIn: String,
    checkOut: String,
    workingHours: Number,
    remarks: String
  }],
  leaves: [{
    type: {
      type: String,
      enum: ['casual', 'sick', 'earned', 'unpaid', 'maternity', 'paternity']
    },
    from: Date,
    to: Date,
    days: Number,
    reason: String,
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'pending'
    },
    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    appliedAt: {
      type: Date,
      default: Date.now
    }
  }],
  performance: {
    rating: {
      type: Number,
      min: 0,
      max: 5
    },
    reviews: [{
      reviewedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      },
      rating: Number,
      comments: String,
      reviewDate: Date
    }],
    achievements: [String],
    warnings: [{
      reason: String,
      date: Date,
      issuedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      }
    }]
  },
  status: {
    type: String,
    enum: ['active', 'inactive', 'on-leave', 'terminated'],
    default: 'active'
  },
  emergencyContact: {
    name: String,
    relationship: String,
    phone: String,
    address: String
  }
}, {
  timestamps: true
});

// Virtual for full name
staffSchema.virtual('fullName').get(function() {
  return `${this.personalInfo.firstName} ${this.personalInfo.lastName}`;
});

// Calculate net salary before saving
staffSchema.pre('save', function(next) {
  if (this.salary.basicSalary) {
    const totalAllowances = (this.salary.allowances?.hra || 0) + 
                           (this.salary.allowances?.ta || 0) + 
                           (this.salary.allowances?.da || 0) + 
                           (this.salary.allowances?.other || 0);
    
    const totalDeductions = (this.salary.deductions?.pf || 0) + 
                           (this.salary.deductions?.esi || 0) + 
                           (this.salary.deductions?.tax || 0) + 
                           (this.salary.deductions?.other || 0);
    
    this.salary.netSalary = this.salary.basicSalary + totalAllowances - totalDeductions;
  }
  next();
});

module.exports = mongoose.model('Staff', staffSchema);
