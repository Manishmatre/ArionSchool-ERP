const mongoose = require('mongoose');
const templateFieldSchema = require('./shared/templateFieldSchema');

const studentCertificateTemplateSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Please provide template name'],
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  courseType: {
    type: String,
    required: true,
    trim: true
  },
  templateImage: {
    type: String,
    required: [true, 'Please provide template image']
  },
  targetType: {
    type: String,
    enum: ['main_branch', 'franchise'],
    default: 'franchise',
    required: true
  },
  fields: [templateFieldSchema],
  isActive: {
    type: Boolean,
    default: true
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
}, {
  timestamps: true
});

studentCertificateTemplateSchema.statics.getDefaultTemplate = async function(courseType, targetType = 'franchise') {
  return await this.findOne({ courseType, targetType, isActive: true }).sort({ createdAt: -1 });
};

studentCertificateTemplateSchema.statics.getTemplatesByCourseType = async function(courseType, targetType) {
  const query = { courseType, isActive: true };
  if (targetType) query.targetType = targetType;
  return await this.find(query).sort({ createdAt: -1 });
};

module.exports = mongoose.model('StudentCertificateTemplate', studentCertificateTemplateSchema);
