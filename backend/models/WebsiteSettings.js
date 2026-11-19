const mongoose = require('mongoose');

const websiteSettingsSchema = new mongoose.Schema({
  // Site Identity
  siteName: {
    type: String,
    default: 'The Vits School'
  },
  siteTagline: String,
  logo: String,
  favicon: String,
  
  // Contact Information
  contact: {
    email: String,
    phone: String,
    whatsapp: String,
    address: String,
    city: String,
    state: String,
    pincode: String,
    country: {
      type: String,
      default: 'India'
    }
  },
  
  // Social Media Links
  socialMedia: {
    facebook: String,
    instagram: String,
    twitter: String,
    linkedin: String,
    youtube: String
  },
  
  // Business Hours
  businessHours: {
    monday: { open: String, close: String, closed: Boolean },
    tuesday: { open: String, close: String, closed: Boolean },
    wednesday: { open: String, close: String, closed: Boolean },
    thursday: { open: String, close: String, closed: Boolean },
    friday: { open: String, close: String, closed: Boolean },
    saturday: { open: String, close: String, closed: Boolean },
    sunday: { open: String, close: String, closed: Boolean }
  },
  
  // SEO Settings
  seo: {
    defaultTitle: String,
    defaultDescription: String,
    defaultKeywords: [String],
    googleAnalyticsId: String,
    googleTagManagerId: String,
    facebookPixelId: String
  },
  
  // Email Settings
  email: {
    supportEmail: String,
    infoEmail: String,
    admissionsEmail: String,
    franchiseEmail: String
  },
  
  // Features Toggle
  features: {
    enableBlog: { type: Boolean, default: false },
    enableGallery: { type: Boolean, default: true },
    enableTestimonials: { type: Boolean, default: true },
    enableFranchise: { type: Boolean, default: true },
    enableMockTest: { type: Boolean, default: true },
    enableCertificates: { type: Boolean, default: true }
  },
  
  // Theme Settings
  theme: {
    primaryColor: { type: String, default: '#3B82F6' },
    secondaryColor: { type: String, default: '#10B981' },
    accentColor: { type: String, default: '#F59E0B' },
    fontFamily: { type: String, default: 'Inter' }
  },
  
  // Maintenance Mode
  maintenance: {
    enabled: { type: Boolean, default: false },
    message: String,
    allowedIPs: [String]
  },
  
  // Last updated by
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true
});

// Only one settings document should exist
websiteSettingsSchema.index({ _id: 1 }, { unique: true });

module.exports = mongoose.model('WebsiteSettings', websiteSettingsSchema);
