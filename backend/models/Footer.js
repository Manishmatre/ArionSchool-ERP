const mongoose = require('mongoose');

const footerSchema = new mongoose.Schema({
  // About Section
  about: {
    logo: String,
    description: String,
    tagline: String
  },

  // Quick Links
  quickLinks: [{
    title: String,
    url: String,
    order: Number,
    isActive: {
      type: Boolean,
      default: true
    }
  }],

  // Courses Links
  coursesLinks: [{
    title: String,
    url: String,
    order: Number,
    isActive: {
      type: Boolean,
      default: true
    }
  }],

  // Important Links
  importantLinks: [{
    title: String,
    url: String,
    order: Number,
    isActive: {
      type: Boolean,
      default: true
    }
  }],

  // Contact Information
  contact: {
    address: String,
    city: String,
    state: String,
    pincode: String,
    phone: String,
    email: String,
    whatsapp: String,
    supportEmail: String
  },

  // Social Media Links
  socialMedia: {
    facebook: String,
    instagram: String,
    twitter: String,
    linkedin: String,
    youtube: String,
    pinterest: String
  },

  // Newsletter
  newsletter: {
    enabled: {
      type: Boolean,
      default: true
    },
    heading: String,
    description: String,
    placeholder: String
  },

  // Copyright
  copyright: {
    text: String,
    year: {
      type: Number,
      default: new Date().getFullYear()
    },
    companyName: String
  },

  // Additional Info
  businessHours: {
    weekdays: String,
    saturday: String,
    sunday: String
  },

  // Trust Badges
  trustBadges: [{
    title: String,
    image: String,
    order: Number,
    isActive: {
      type: Boolean,
      default: true
    }
  }],

  // Payment Methods
  paymentMethods: [{
    name: String,
    icon: String,
    order: Number,
    isActive: {
      type: Boolean,
      default: true
    }
  }],

  // Last updated by
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Footer', footerSchema);
