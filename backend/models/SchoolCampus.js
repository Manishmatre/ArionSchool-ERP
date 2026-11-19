const mongoose = require('mongoose');

const schoolCampusSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Please provide school campus name'],
    trim: true
  },
  code: {
    type: String,
    required: [true, 'Please provide campus code'],
    unique: true,
    uppercase: true,
    trim: true
  },
  admin: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  owner: {
    name: {
      type: String,
      required: true
    },
    email: {
      type: String,
      required: true
    },
    mobile: {
      type: String,
      required: true
    },
    aadhaarNumber: String,
    panNumber: String,
    qualification: String,
    aadhaarFileFront: String,
    aadhaarFileBack: String,
    panFile: String,
    qualificationFile: String,
    centerPhoto: String,
    ownerSignature: String
  },
  address: {
    street: {
      type: String,
      required: true
    },
    city: {
      type: String,
      required: true
    },
    state: {
      type: String,
      required: true
    },
    pincode: {
      type: String,
      required: true
    },
    country: {
      type: String,
      default: 'India'
    }
  },
  contactInfo: {
    phone: String,
    email: String
  },
  establishedDate: {
    type: Date,
    default: Date.now
  },
  status: {
    type: String,
    enum: ['active', 'inactive', 'pending', 'suspended'],
    default: 'active'
  },
  suspensionReason: {
    type: String,
    default: ''
  },
  subdomain: {
    type: String,
    lowercase: true,
    trim: true,
    sparse: true,
    unique: true
  },
  customDomain: {
    type: String,
    lowercase: true,
    trim: true,
    default: ''
  },
  domainVerified: {
    type: Boolean,
    default: false
  },
  board: {
    type: String,
    default: 'CBSE',
    trim: true
  },
  affiliationNumber: {
    type: String,
    default: '',
    trim: true
  },
  enabledModules: {
    fees: { type: Boolean, default: true },
    exams: { type: Boolean, default: true },
    attendance: { type: Boolean, default: true },
    aiCopilot: { type: Boolean, default: true },
    certificates: { type: Boolean, default: true },
    seating: { type: Boolean, default: true },
    library: { type: Boolean, default: true },
    transport: { type: Boolean, default: true },
    lms: { type: Boolean, default: true },
    hostel: { type: Boolean, default: false },
    payroll: { type: Boolean, default: true },
    parentPortal: { type: Boolean, default: true }
  },
  isMainBranch: {
    type: Boolean,
    default: false
  },
  courses: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Course'
  }],
  students: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Student'
  }],
  plan: {
    type: mongoose.Schema.Types.ObjectId
  },
  academicSession: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'AcademicSession'
  },
  planExpiresAt: {
    type: Date
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true,
  collection: 'franchises' // Preserves 100% existing database documents and indices
});

// Register models for dual compatibility across mongoose ref strings
const SchoolCampus = mongoose.models.SchoolCampus || mongoose.model('SchoolCampus', schoolCampusSchema);
if (!mongoose.models.Franchise) {
  mongoose.model('Franchise', schoolCampusSchema);
}

module.exports = SchoolCampus;
