const mongoose = require('mongoose');

const platformConfigSchema = new mongoose.Schema({
  singletonKey: {
    type: String,
    default: 'GLOBAL_PLATFORM_CONFIG',
    unique: true
  },
  companyName: {
    type: String,
    default: 'STARTOLOGY EDUCARE SERVICES PRIVATE LIMITED'
  },
  productName: {
    type: String,
    default: 'SES Educare'
  },
  primaryDomain: {
    type: String,
    default: 'seseducare.com'
  },
  appDomain: {
    type: String,
    default: 'myapp.seseducare.com'
  },
  adminConsoleDomain: {
    type: String,
    default: 'admin.seseducare.com'
  },
  supportEmail: {
    type: String,
    default: 'seseducare@gmail.com'
  },
  supportPhone: {
    type: String,
    default: '+91 761 400 2026'
  },
  maintenanceMode: {
    type: Boolean,
    default: false
  },
  maintenanceMessage: {
    type: String,
    default: 'SES Educare School ERP is undergoing scheduled maintenance. Please check back soon.'
  },
  defaultTrialDays: {
    type: Number,
    default: 14
  },
  allowSelfRegistration: {
    type: Boolean,
    default: true
  },
  defaultAiModel: {
    type: String,
    default: 'gpt-4o-mini'
  },
  razorpayMode: {
    type: String,
    enum: ['test', 'live'],
    default: 'test'
  },
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('PlatformConfig', platformConfigSchema);
