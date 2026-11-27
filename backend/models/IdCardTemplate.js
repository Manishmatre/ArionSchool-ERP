const mongoose = require('mongoose');
const templateFieldSchema = require('./shared/templateFieldSchema');

const idCardTemplateSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Please provide template name'],
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  templateImage: {
    type: String,
    default: ''
  },
  fields: [templateFieldSchema],
  isActive: {
    type: Boolean,
    default: true
  },
  franchise: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Franchise'
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
}, {
  timestamps: true
});

idCardTemplateSchema.statics.getDefaultTemplate = async function(franchiseId) {
  return await this.findOne({ franchise: franchiseId, isActive: true })
    .sort({ createdAt: -1 });
};

idCardTemplateSchema.index({ franchise: 1, isActive: 1, createdAt: -1 });

module.exports = mongoose.model('IdCardTemplate', idCardTemplateSchema);
