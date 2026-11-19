const mongoose = require('mongoose');

const sectionSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Please provide section name (e.g. A, B, C)'],
    trim: true,
    uppercase: true
  },
  schoolClass: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'SchoolClass',
    required: [true, 'Please select a class']
  },
  franchise: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Franchise',
    required: true
  },
  capacity: {
    type: Number,
    default: 40
  },
  roomNumber: {
    type: String,
    trim: true
  },
  classTeacher: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Staff'
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

sectionSchema.index({ schoolClass: 1, name: 1 }, { unique: true });
sectionSchema.index({ franchise: 1, schoolClass: 1 });

module.exports = mongoose.model('Section', sectionSchema);
