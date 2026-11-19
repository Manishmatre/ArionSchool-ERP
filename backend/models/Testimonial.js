const mongoose = require('mongoose');

const testimonialSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  userName: {
    type: String,
    required: [true, 'Please provide a reviewer name'],
    trim: true
  },
  userEmail: {
    type: String,
    trim: true,
    default: ''
  },
  userRole: {
    type: String,
    enum: ['student', 'franchise_admin', 'super_admin', 'alumni', 'guest'],
    default: 'student'
  },
  designation: {
    type: String,
    trim: true,
    default: 'Student'
  },
  avatar: {
    type: String,
    default: ''
  },
  franchise: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Franchise',
    default: null
  },
  franchiseName: {
    type: String,
    trim: true,
    default: ''
  },
  course: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Course',
    default: null
  },
  courseName: {
    type: String,
    trim: true,
    default: ''
  },
  type: {
    type: String,
    enum: ['general', 'course', 'franchise', 'video'],
    default: 'general'
  },
  rating: {
    type: Number,
    required: true,
    min: 1,
    max: 5,
    default: 5
  },
  title: {
    type: String,
    trim: true,
    default: ''
  },
  message: {
    type: String,
    required: [true, 'Please provide testimonial message or review content'],
    trim: true
  },
  videoUrl: {
    type: String,
    trim: true,
    default: ''
  },
  videoDuration: {
    type: String,
    trim: true,
    default: ''
  },
  videoThumbnail: {
    type: String,
    trim: true,
    default: ''
  },
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending'
  },
  isFeatured: {
    type: Boolean,
    default: false
  },
  adminComment: {
    type: String,
    trim: true,
    default: ''
  },
  reviewedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  reviewedAt: {
    type: Date,
    default: null
  }
}, {
  timestamps: true
});

// Index for high performance queries
testimonialSchema.index({ status: 1, isFeatured: 1, createdAt: -1 });
testimonialSchema.index({ user: 1 });
testimonialSchema.index({ course: 1, status: 1 });

module.exports = mongoose.model('Testimonial', testimonialSchema);
