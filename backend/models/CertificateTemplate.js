const mongoose = require('mongoose');
const templateFieldSchema = require('./shared/templateFieldSchema');

const certificateTemplateSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  planType: {
    type: String,
    required: true,
    trim: true
  },
  templateImage: {
    type: String,
    required: true
  },
  fields: [templateFieldSchema],
  franchise: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Franchise',
    default: null
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  isActive: {
    type: Boolean,
    default: true
  },
  isDefault: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

certificateTemplateSchema.statics.getDefaultTemplate = async function(planType, franchiseId) {
  return await this.findOne({
    planType,
    franchise: franchiseId,
    isDefault: true,
    isActive: true
  });
};

certificateTemplateSchema.index({ planType: 1, franchise: 1, isActive: 1 });
certificateTemplateSchema.index({ franchise: 1, isActive: 1 });
certificateTemplateSchema.index({ createdBy: 1 });

module.exports = mongoose.model('CertificateTemplate', certificateTemplateSchema);
