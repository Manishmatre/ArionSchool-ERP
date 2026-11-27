const mongoose = require('mongoose');
const templateFieldSchema = require('./shared/templateFieldSchema');

const marksheetTemplateSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
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
  course: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Course'
  },
  templateImage: {
    type: String,
    default: ''
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
}, { timestamps: true });

marksheetTemplateSchema.statics.getDefaultTemplate = async function(courseType, targetType = 'franchise', courseId = null) {
  if (courseId) {
    const byCourse = await this.findOne({ course: courseId, targetType, isActive: true }).sort({ createdAt: -1 });
    if (byCourse) return byCourse;
  }
  return await this.findOne({ courseType, targetType, isActive: true }).sort({ createdAt: -1 });
};

module.exports = mongoose.model('MarksheetTemplate', marksheetTemplateSchema);
