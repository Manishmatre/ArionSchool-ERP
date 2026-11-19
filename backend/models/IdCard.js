const mongoose = require('mongoose');

const IdCardSchema = new mongoose.Schema({
  student: {
    type: mongoose.Schema.ObjectId,
    ref: 'Student',
    required: true
  },
  template: {
    type: mongoose.Schema.ObjectId,
    ref: 'IdCardTemplate',
    required: false
  },
  franchise: {
    type: mongoose.Schema.ObjectId,
    ref: 'Franchise',
    required: true
  },
  file: {
    type: Buffer
  },
  fileUrl: {
    type: String
  },
  issueDate: {
    type: Date,
    default: Date.now
  },
  status: {
    type: String,
    enum: ['active', 'revoked'],
    default: 'active'
  }
});

IdCardSchema.index({ franchise: 1, issueDate: -1 });
IdCardSchema.index({ student: 1, issueDate: -1 });
IdCardSchema.index({ template: 1 });

module.exports = mongoose.model('IdCard', IdCardSchema);
