const mongoose = require('mongoose');

const schoolBrandingSchema = new mongoose.Schema({
  franchise: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'SchoolCampus',
    unique: true,
    sparse: true
  },
  isDefault: {
    type: Boolean,
    default: false
  },
  // 1. School Identity
  identity: {
    schoolName: {
      type: String,
      required: true,
      default: 'SES Educare'
    },
    shortName: {
      type: String,
      default: 'SES'
    },
    motto: {
      type: String,
      default: 'One Platform. Complete School Management.'
    },
    description: {
      type: String,
      default: 'Modern school management and education ERP platform by SES Educare.'
    },
    affiliationBoard: {
      type: String,
      default: 'CBSE'
    },
    registrationNumber: {
      type: String,
      default: ''
    },
    address: {
      street: { type: String, default: '' },
      city: { type: String, default: 'Jabalpur' },
      state: { type: String, default: 'Madhya Pradesh' },
      pincode: { type: String, default: '482001' },
      country: { type: String, default: 'India' }
    },
    contact: {
      phone: { type: String, default: '+91 98765 43210' },
      email: { type: String, default: 'seseducare@gmail.com' },
      websiteUrl: { type: String, default: 'https://seseducare.com' }
    }
  },

  // 2. Visual Identity & Colors
  visual: {
    logoUrl: {
      type: String,
      default: ''
    },
    secondaryLogoUrl: {
      type: String,
      default: ''
    },
    loginLogoUrl: {
      type: String,
      default: ''
    },
    faviconUrl: {
      type: String,
      default: ''
    },
    primaryColor: {
      type: String,
      default: '#0f172a' // Deep Navy Blue
    },
    secondaryColor: {
      type: String,
      default: '#2563eb' // Royal Blue
    },
    accentColor: {
      type: String,
      default: '#0ea5e9' // Sky / Cyan
    },
    backgroundColor: {
      type: String,
      default: '#f8fafc' // Clean White / Light Grey
    },
    headerColor: {
      type: String,
      default: '#0f172a'
    },
    sidebarColor: {
      type: String,
      default: '#0f172a'
    },
    themeMode: {
      type: String,
      enum: ['brand-chrome', 'sidebar-accent', 'header-accent', 'full-light', 'full-dark', 'tinted-studio'],
      default: 'brand-chrome'
    }
  },

  // 3. Login Customization
  login: {
    welcomeTitle: {
      type: String,
      default: 'Welcome to SES Educare ERP'
    },
    welcomeSubtitle: {
      type: String,
      default: 'Sign in to access your administrative, teacher, or student dashboard.'
    },
    bannerImageUrl: {
      type: String,
      default: ''
    },
    bgImageUrl: {
      type: String,
      default: ''
    },
    showPlatformAttribution: {
      type: Boolean,
      default: true
    }
  },

  // 4. White-Label Settings & Domain Mapping
  whiteLabel: {
    enabled: {
      type: Boolean,
      default: false
    },
    customDomain: {
      type: String,
      trim: true,
      lowercase: true,
      default: ''
    },
    subdomain: {
      type: String,
      trim: true,
      lowercase: true,
      default: ''
    },
    status: {
      type: String,
      enum: ['active', 'pending', 'disabled'],
      default: 'active'
    }
  },

  // 5. Email & Document Customization
  email: {
    senderName: {
      type: String,
      default: 'SES Educare'
    },
    footerText: {
      type: String,
      default: 'This is an automated notification from SES Educare School Management ERP.'
    }
  },
  document: {
    reportHeader: {
      type: String,
      default: ''
    },
    authorizedSignatoryTitle: {
      type: String,
      default: 'Principal / Head of Institution'
    }
  }
}, {
  timestamps: true
});

schoolBrandingSchema.index({ franchise: 1 });
schoolBrandingSchema.index({ 'whiteLabel.subdomain': 1 });
schoolBrandingSchema.index({ 'whiteLabel.customDomain': 1 });

module.exports = mongoose.model('SchoolBranding', schoolBrandingSchema);
