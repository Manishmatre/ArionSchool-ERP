const mongoose = require('mongoose');

const lessonSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Please provide lesson title'],
    trim: true
  },
  description: {
    type: String,
    default: '',
    trim: true
  },
  course: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Course',
    required: [true, 'Course reference is required']
  },
  module: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Module',
    required: [true, 'Module reference is required']
  },
  contentType: {
    type: String,
    enum: ['video', 'pdf', 'resource', 'text', 'mixed'],
    default: 'video'
  },
  duration: {
    type: Number, // duration in minutes
    default: 0
  },
  order: {
    type: Number,
    required: true,
    default: 1
  },
  thumbnail: {
    type: String,
    default: ''
  },

  // Video Content
  videoUrl: {
    type: String,
    default: ''
  },
  videoProvider: {
    type: String,
    enum: ['youtube', 'vimeo', 'drive', 'custom', 'other'],
    default: 'custom'
  },
  videoThumbnail: {
    type: String,
    default: ''
  },

  // Document / PDF Content
  documentUrl: {
    type: String,
    default: ''
  },
  documentName: {
    type: String,
    default: ''
  },

  // External Resource
  resourceUrl: {
    type: String,
    default: ''
  },
  resourceTitle: {
    type: String,
    default: ''
  },
  resourceDescription: {
    type: String,
    default: ''
  },

  // Rich Text Content
  textContent: {
    type: String,
    default: ''
  },

  // Mixed Content Bundle
  mixedContent: {
    videoUrl: { type: String, default: '' },
    documentUrl: { type: String, default: '' },
    documentName: { type: String, default: '' },
    textContent: { type: String, default: '' },
    resourceUrl: { type: String, default: '' }
  },

  // Lesson Settings
  isFreePreview: {
    type: Boolean,
    default: false
  },
  isMandatory: {
    type: Boolean,
    default: true
  },
  status: {
    type: String,
    enum: ['active', 'inactive'],
    default: 'active'
  },
  publicationStatus: {
    type: String,
    enum: ['draft', 'published'],
    default: 'published'
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
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

lessonSchema.pre('save', function (next) {
  this.updatedAt = Date.now();
  next();
});

// Index for module lesson ordering
lessonSchema.index({ module: 1, order: 1 });
lessonSchema.index({ course: 1 });

module.exports = mongoose.model('Lesson', lessonSchema);

