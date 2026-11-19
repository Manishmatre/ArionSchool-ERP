const mongoose = require('mongoose');

const appVersionSchema = new mongoose.Schema({
  platform: {
    type: String,
    enum: ['android', 'ios'],
    default: 'android',
    required: true
  },
  versionName: {
    type: String,
    required: true,
    trim: true
  },
  versionCode: {
    type: Number,
    required: true
  },
  apkUrl: {
    type: String,
    default: '/SES-Educare-v1.0.2.apk',
    trim: true
  },
  iosUrl: {
    type: String,
    default: '',
    trim: true
  },
  fileSize: {
    type: String,
    default: '39.5 MB'
  },
  releaseNotes: {
    type: String,
    default: 'Bug fixes and performance improvements.'
  },
  isMandatory: {
    type: Boolean,
    default: false
  },
  isActive: {
    type: Boolean,
    default: true
  },
  downloadCount: {
    type: Number,
    default: 0
  },
  uploadedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true
});

appVersionSchema.index({ platform: 1, isActive: 1, versionCode: -1 });

module.exports = mongoose.model('AppVersion', appVersionSchema);
