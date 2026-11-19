const mongoose = require('mongoose');

const enquirySchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Please provide name'],
    trim: true
  },
  email: {
    type: String,
    required: [true, 'Please provide email'],
    trim: true,
    lowercase: true
  },
  mobile: {
    type: String,
    required: [true, 'Please provide mobile number']
  },
  enquiryType: {
    type: String,
    enum: ['course', 'franchise', 'general', 'admission', 'support', 'walk_in', 'other'],
    default: 'course'
  },
  course: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Course'
  },
  franchise: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Franchise'
  },
  message: {
    type: String,
    default: 'General enquiry / lead'
  },
  city: String,
  state: String,
  preferredContactTime: String,
  source: {
    type: String,
    enum: ['website', 'phone', 'email', 'social_media', 'walk_in', 'referral', 'student_portal', 'other'],
    default: 'website'
  },
  student: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Student'
  },
  status: {
    type: String,
    enum: ['new', 'contacted', 'interested', 'not_interested', 'converted', 'closed'],
    default: 'new'
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
  followUps: [{
    date: {
      type: Date,
      default: Date.now
    },
    notes: String,
    nextFollowUpDate: Date,
    contactedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }
  }],
  convertedToStudent: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Student'
  },
  notes: String,
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Compound indexes for ultra-fast queries in CRM
enquirySchema.index({ createdAt: -1 });
enquirySchema.index({ status: 1, createdAt: -1 });
enquirySchema.index({ franchise: 1, status: 1 });
enquirySchema.index({ enquiryType: 1 });
enquirySchema.index({ source: 1 });
enquirySchema.index({ mobile: 1 });
enquirySchema.index({ email: 1 });

// Update timestamp on save
enquirySchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('Enquiry', enquirySchema);
