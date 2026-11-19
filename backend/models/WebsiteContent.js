const mongoose = require('mongoose');

const websiteContentSchema = new mongoose.Schema({
  // Page identification
  page: {
    type: String,
    required: true,
    enum: [
      'home',
      'about',
      'courses',
      'admissions',
      'branches',
      'certificates',
      'contact',
      'franchise-opportunity',
      'franchise-support',
      'gallery',
      'faq',
      'success-stories',
      'mock-test',
      'footer'
    ]
  },
  
  // Section identification
  section: {
    type: String,
    required: true
  },
  
  // Content type
  contentType: {
    type: String,
    required: true,
    enum: ['text', 'image', 'video', 'html', 'json', 'list']
  },
  
  // Content data
  content: {
    type: mongoose.Schema.Types.Mixed,
    required: true
  },
  
  // For images
  imageUrl: String,
  
  // For ordering sections
  order: {
    type: Number,
    default: 0
  },
  
  // Status
  isActive: {
    type: Boolean,
    default: true
  },
  
  // Metadata
  title: String,
  description: String,
  
  // SEO
  metaTitle: String,
  metaDescription: String,
  metaKeywords: [String],
  
  // Last updated by
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true
});

// Index for faster queries
websiteContentSchema.index({ page: 1, section: 1 });
websiteContentSchema.index({ page: 1, order: 1 });

module.exports = mongoose.model('WebsiteContent', websiteContentSchema);
